import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn as ptySpawn } from 'bun-pty';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';
import {
  createTerminalEventLog, recordTerminalEvent, getTerminalReplayPlan, forEachTerminalEventAfter,
} from './terminal-stream.js';
import { readPtyMessages, sendPtyMessage, requestPtyBroker } from './pty-channel.js';
import {
  TERMINAL_PARSE_BACKLOG_LIMIT, TERMINAL_SCROLLBACK_LINES, serializeTerminalSnapshot,
} from './terminal-snapshot.js';

const socketPath = process.env.CLOUDCLI_PTY_SOCKET || '/run/cloud-terminal/pty.sock';
const sessions = new Map();
// Web control connections that receive the live session ids whenever they change.
const subscribers = new Set();
const dimension = (value, fallback, max) => Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
const liveSessionIds = () => [...sessions.values()].filter((s) => !s.exited).map((s) => s.id);

function notifySessions() {
  const message = { type: 'sessions', ids: liveSessionIds() };
  for (const socket of subscribers) sendPtyMessage(socket, message);
}

// The headless copy parses output asynchronously. xterm throws away writes once its
// backlog nears 50 MB, so past the watermark output is only recorded (and still
// forwarded); parsing resumes from the retained replay log once the backlog drains,
// or right away when a snapshot is requested.
function writeParsed(session, { data, bytes }) {
  session.parseBacklogBytes += bytes;
  session.terminal.write(data, () => {
    session.parseBacklogBytes -= bytes;
    if (session.disposed || !session.parseOverflow || session.parseBacklogBytes > 0) return;
    session.parseOverflow = false;
    resyncParser(session);
  });
}

function resyncParser(session) {
  const from = session.unparsedFromSeq;
  if (!from) return;
  session.unparsedFromSeq = 0;
  forEachTerminalEventAfter(session.log, from - 1, (event) => {
    if (event.type === 'output') writeParsed(session, event);
  });
}

function parseOutput(session, event) {
  if (session.parseOverflow || session.parseBacklogBytes + event.bytes > TERMINAL_PARSE_BACKLOG_LIMIT) {
    session.parseOverflow = true;
    if (!session.unparsedFromSeq) session.unparsedFromSeq = event.seq;
    return;
  }
  writeParsed(session, event);
}

function snapshot(session) {
  resyncParser(session);
  const seq = session.log.lastSeq;
  return new Promise((resolve) => {
    session.terminal.write('', () => resolve({ seq,
      data: session.disposed ? '' : serializeTerminalSnapshot(session.terminal, session.serializer, session.mouseEncoding),
      cols: session.terminal.cols, rows: session.terminal.rows }));
  });
}

function removeSession(session) {
  if (sessions.get(session.id) === session) sessions.delete(session.id);
  session.disposed = true;
  session.terminal.dispose();
  notifySessions();
}

function createSession(id, options) {
  const cols = dimension(options.cols, 100, 500);
  const rows = dimension(options.rows, 30, 300);
  const terminal = new headlessXterm.Terminal({ allowProposedApi: true, cols, rows, scrollback: TERMINAL_SCROLLBACK_LINES });
  const serializer = new SerializeAddon();
  terminal.loadAddon(new UnicodeGraphemesAddon());
  terminal.loadAddon(serializer);
  const session = { id, generation: randomUUID(), cwd: options.cwd, terminal, serializer,
    mouseEncoding: '', pty: null, viewer: null, log: createTerminalEventLog(), inputs: new Map(),
    exited: false, disposed: false, parseBacklogBytes: 0, parseOverflow: false, unparsedFromSeq: 0 };
  for (const [final, enabled] of [['h', true], ['l', false]]) {
    terminal.parser.registerCsiHandler({ prefix: '?', final }, (params) => {
      for (const mode of params) if (mode === 1006 || mode === 1016) session.mouseEncoding = enabled ? `\x1b[?${mode}h` : '';
      return false;
    });
  }
  terminal.parser.registerEscHandler({ final: 'c' }, () => { session.mouseEncoding = ''; return false; });
  session.pty = ptySpawn(options.shell.command, options.shell.args, { name: 'xterm-256color', cols, rows,
    cwd: options.cwd, env: options.env });
  session.pty.onData((data) => {
    if (session.exited) return;
    const event = recordTerminalEvent(session.log, { type: 'output', data });
    // Forward first; history maintenance must not delay live terminal output.
    if (session.viewer) sendPtyMessage(session.viewer, event);
    parseOutput(session, event);
  });
  session.pty.onExit(({ exitCode, signal }) => {
    // A closed session was already removed; its kill must not report an exit.
    if (session.exited) return;
    session.exited = true;
    const event = recordTerminalEvent(session.log, { type: 'exit', exitCode, signal });
    if (session.viewer) sendPtyMessage(session.viewer, event);
    // Every later prepare starts a new shell, so nothing restores from this one.
    removeSession(session);
  });
  sessions.set(id, session);
  notifySessions();
  return session;
}

const server = net.createServer((socket) => {
  let attached = null;
  // Commands run in order per session; different sessions on one control
  // connection do not wait for each other's snapshots.
  const queues = new Map();
  socket.on('error', () => {});
  socket.on('close', () => {
    subscribers.delete(socket);
    if (attached?.viewer === socket) attached.viewer = null;
  });

  async function handle(message) {
    const reply = (value = {}) => sendPtyMessage(socket, { requestId: message.requestId, ...value });
    if (message.type === 'ping') return reply({ ok: true });
    if (message.type === 'subscribe') {
      subscribers.add(socket);
      return reply({ ids: liveSessionIds() });
    }
    if (message.type === 'prepare') {
      if (!/^[a-f\d-]{36}$/i.test(message.sessionId)) throw new Error('Invalid PTY session');
      const session = sessions.get(message.sessionId) ?? createSession(message.sessionId, message.options);
      const state = await snapshot(session);
      return reply({ generation: session.generation, cwd: session.cwd, pid: session.pty.pid, ...state });
    }
    const session = sessions.get(message.sessionId);
    if (message.type === 'close') {
      if (session) {
        session.exited = true;
        session.pty.kill();
        session.viewer?.end();
        removeSession(session);
      }
      return reply({ ok: true });
    }
    if (!session) throw new Error('PTY session unavailable');
    if (message.type === 'attach') {
      if (message.generation !== session.generation) throw new Error('PTY session replaced');
      session.viewer?.destroy();
      attached = session;
      const plan = getTerminalReplayPlan(session.log, message.seq);
      if (plan.mode === 'replay') {
        for (const event of plan.events) sendPtyMessage(socket, event);
      } else {
        const state = await snapshot(session);
        if (session.disposed) throw new Error('PTY session unavailable');
        sendPtyMessage(socket, { type: 'snapshot', ...state });
        forEachTerminalEventAfter(session.log, state.seq, (event) => sendPtyMessage(socket, event));
      }
      // No await between replay completion and subscribing to live output.
      session.viewer = socket;
      return reply({ ok: true });
    }
    if (attached !== session || session.viewer !== socket || session.exited) throw new Error('PTY connection replaced');
    if (message.type === 'input') {
      const seq = Number(message.inputSeq);
      const last = session.inputs.get(message.streamId) ?? 0;
      if (!Number.isSafeInteger(seq) || seq <= 0 || seq > last + 1) throw new Error('Terminal input sequence gap');
      if (seq === last + 1) {
        session.pty.write(message.data);
        session.inputs.clear();
        session.inputs.set(message.streamId, seq);
      }
      return reply({ inputSeq: Math.max(seq, last) });
    }
    if (message.type === 'write') { session.pty.write(message.data); return; }
    if (message.type === 'resize') {
      const cols = dimension(message.cols, 100, 500), rows = dimension(message.rows, 30, 300);
      await new Promise((resolve) => session.terminal.write('', resolve));
      if (session.disposed) return;
      session.terminal.resize(cols, rows);
      session.pty.resize(cols, rows);
      return;
    }
    throw new Error('Unknown PTY command');
  }

  readPtyMessages(socket, (message) => {
    const key = typeof message.sessionId === 'string' ? message.sessionId : '';
    const tail = (queues.get(key) ?? Promise.resolve()).then(() => handle(message))
      .catch((error) => sendPtyMessage(socket, { requestId: message.requestId, error: error.message }));
    queues.set(key, tail);
    tail.then(() => { if (queues.get(key) === tail) queues.delete(key); });
  });
});

fs.mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
// Never replace a live broker's socket: that could orphan running terminals.
if (fs.existsSync(socketPath)) {
  let live = false;
  try { await requestPtyBroker(socketPath, { type: 'ping' }); live = true; } catch {}
  if (live) throw new Error('PTY service is already running');
  fs.unlinkSync(socketPath);
}
server.listen(socketPath, () => { fs.chmodSync(socketPath, 0o600); console.log(`PTY service ready: ${socketPath}`); });
