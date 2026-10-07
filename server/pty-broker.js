import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn as ptySpawn } from 'bun-pty';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';
import { createTerminalEventLog, recordTerminalEvent, getTerminalReplayPlan } from './terminal-stream.js';
import { readPtyMessages, sendPtyMessage, requestPtyBroker } from './pty-channel.js';

const socketPath = process.env.CLOUDCLI_PTY_SOCKET || '/run/cloud-terminal/pty.sock';

if (process.argv.includes('--request')) {
  try {
    const result = await requestPtyBroker(socketPath, JSON.parse(fs.readFileSync(0, 'utf8')));
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(error.message);
    process.exitCode = 1;
  }
} else {
  const sessions = new Map();
  const dimension = (value, fallback, max) => Number.isInteger(value) && value > 0 ? Math.min(value, max) : fallback;
  const snapshot = (session) => new Promise((resolve) => {
    const seq = session.log.lastSeq;
    session.terminal.write('', () => resolve({ seq,
      data: session.serializer.serialize({ scrollback: 10000 }) + session.mouseEncoding,
      cols: session.terminal.cols, rows: session.terminal.rows }));
  });
  function createSession(id, options) {
    const cols = dimension(options.cols, 100, 500);
    const rows = dimension(options.rows, 30, 300);
    const terminal = new headlessXterm.Terminal({ allowProposedApi: true, cols, rows, scrollback: 10000 });
    const serializer = new SerializeAddon();
    terminal.loadAddon(new UnicodeGraphemesAddon());
    terminal.loadAddon(serializer);
    const session = { id, generation: randomUUID(), cwd: options.cwd, terminal, serializer,
      mouseEncoding: '', pty: null, viewer: null, log: createTerminalEventLog(), inputs: new Map(), exited: false };
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
      terminal.write(data);
    });
    session.pty.onExit(({ exitCode, signal }) => {
      session.exited = true;
      const event = recordTerminalEvent(session.log, { type: 'exit', exitCode, signal });
      if (session.viewer) sendPtyMessage(session.viewer, event);
    });
    sessions.set(id, session);
    return session;
  }
  const server = net.createServer((socket) => {
    let attached = null;
    let queue = Promise.resolve();
    socket.on('error', () => {});
    socket.on('close', () => { if (attached?.viewer === socket) attached.viewer = null; });
    readPtyMessages(socket, (message) => {
      queue = queue.then(async () => {
        const reply = (value = {}) => sendPtyMessage(socket, { requestId: message.requestId, ...value });
        if (message.type === 'ping') return reply({ ok: true });
        if (message.type === 'list') return reply({ ids: [...sessions.values()].filter((s) => !s.exited).map((s) => s.id) });
        if (message.type === 'prepare') {
          if (!/^[a-f\d-]{36}$/i.test(message.sessionId)) throw new Error('Invalid PTY session');
          let session = sessions.get(message.sessionId);
          if (!session || session.exited) {
            session?.terminal.dispose();
            session = createSession(message.sessionId, message.options);
          }
          const state = await snapshot(session);
          return reply({ generation: session.generation, cwd: session.cwd, pid: session.pty.pid, ...state });
        }
        const session = sessions.get(message.sessionId);
        if (message.type === 'close') {
          if (session) {
            session.exited = true;
            session.pty.kill();
            session.viewer?.end();
            sessions.delete(session.id);
            session.terminal.dispose();
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
            sendPtyMessage(socket, { type: 'snapshot', ...state });
            for (const event of session.log.events) if (event.seq > state.seq) sendPtyMessage(socket, event);
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
          session.terminal.resize(cols, rows);
          session.pty.resize(cols, rows);
          return;
        }
        throw new Error('Unknown PTY command');
      }).catch((error) => sendPtyMessage(socket, { requestId: message.requestId, error: error.message }));
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
}
