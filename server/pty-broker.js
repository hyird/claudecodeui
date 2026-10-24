import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn as ptySpawn } from 'node-pty';
import {
  createTerminalEventLog, recordTerminalEvent, getTerminalReplayPlan, forEachTerminalEventAfter,
} from './terminal-stream.js';
import { readPtyMessages, sendPtyMessage, requestPtyBroker } from './pty-channel.js';
import {
  createTerminalSnapshot, serializeTerminalSnapshot,
} from './terminal-snapshot.js';
import { writeTerminalInput } from './terminal-input.js';
import { createPtyFlowControl, OUTPUT_HIGH_WATER, OUTPUT_LOW_WATER } from './terminal-flow-control.js';

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

// History parsing is also a consumer: slow it at the PTY instead of dropping
// parser input and trying to reconstruct state from a truncated replay window.
function writeParsed(session, { data, bytes }) {
  session.parseBacklogBytes += bytes;
  if (session.parseBacklogBytes >= OUTPUT_HIGH_WATER) session.flowControl.setPaused('parser', true);
  session.terminal.write(data, () => {
    session.parseBacklogBytes -= bytes;
    if (!session.disposed && session.parseBacklogBytes <= OUTPUT_LOW_WATER) session.flowControl.setPaused('parser', false);
  });
}

function sendToViewer(session, socket, event) {
  if (sendPtyMessage(socket, event) === false) session.flowControl.setPaused(socket, true);
}

function snapshot(session) {
  const seq = session.log.lastSeq;
  return new Promise((resolve) => {
    session.terminal.write('', () => resolve({ seq,
      data: session.disposed ? '' : serializeTerminalSnapshot(session.terminal, session.serializer, session.mouseEncoding.mode),
      cols: session.terminal.cols, rows: session.terminal.rows }));
  });
}

function removeSession(session) {
  if (sessions.get(session.id) === session) sessions.delete(session.id);
  session.disposed = true;
  session.flowControl.dispose();
  session.terminal.dispose();
  notifySessions();
}

function createSession(id, options) {
  const cols = dimension(options.cols, 100, 500);
  const rows = dimension(options.rows, 30, 300);
  const session = { id, generation: randomUUID(), cwd: options.cwd, ...createTerminalSnapshot(cols, rows),
    pty: null, viewer: null, log: createTerminalEventLog(), inputs: new Map(),
    exited: false, disposed: false, parseBacklogBytes: 0, flowControl: null };
  session.pty = ptySpawn(options.shell.command, options.shell.args, { name: 'xterm-256color', cols, rows,
    cwd: options.cwd, env: options.env });
  session.flowControl = createPtyFlowControl(session.pty);
  session.pty.onData((data) => {
    if (session.exited) return;
    const event = recordTerminalEvent(session.log, { type: 'output', data });
    // Forward first; history maintenance must not delay live terminal output.
    if (session.viewer) sendToViewer(session, session.viewer, event);
    writeParsed(session, event);
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
    attached?.flowControl.setPaused(socket, false);
    if (attached?.viewer === socket) {
      attached.viewer = null;
    }
  });
  socket.on('drain', () => attached?.flowControl.setPaused(socket, false));

  async function handle(message) {
    const reply = (value = {}) => sendPtyMessage(socket, { requestId: message.requestId, ...value });
    if (message.type === 'ping') return reply({ ok: true, backend: 'node-pty' });
    if (message.type === 'subscribe') {
      subscribers.add(socket);
      return reply({ ids: liveSessionIds(), backend: 'node-pty' });
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
        for (const event of plan.events) sendToViewer(session, socket, event);
      } else {
        const state = await snapshot(session);
        if (session.disposed) throw new Error('PTY session unavailable');
        sendToViewer(session, socket, { type: 'snapshot', ...state });
        forEachTerminalEventAfter(session.log, state.seq, (event) => sendToViewer(session, socket, event));
      }
      // No await between replay completion and subscribing to live output.
      session.viewer = socket;
      return reply({ ok: true });
    }
    if (attached !== session || session.viewer !== socket || session.exited) throw new Error('PTY connection replaced');
    if (message.type === 'input') {
      return reply({ inputSeq: writeTerminalInput(session.pty, session.inputs, message) });
    }
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
