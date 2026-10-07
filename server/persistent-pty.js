import net from 'node:net';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readPtyMessages, sendPtyMessage } from './pty-channel.js';

export function createPersistentPtyBackend({
  enabled = process.env.CLOUDCLI_PERSIST_TERMINALS === '1',
  socketPath = process.env.CLOUDCLI_PTY_SOCKET || '/run/cloud-terminal/pty.sock',
  brokerPath = fileURLToPath(new URL('./pty-broker.js', import.meta.url)),
  command = process.execPath,
  run = spawnSync,
} = {}) {
  const request = (message) => {
    const result = run(command, [brokerPath, '--request'], { input: JSON.stringify(message), encoding: 'utf8',
      timeout: 10000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, CLOUDCLI_PTY_SOCKET: socketPath } });
    if (result.status !== 0) throw new Error(`Persistent PTY service unavailable: ${result.stderr || result.error?.message || 'start the separate PTY service first'}`);
    return JSON.parse(result.stdout);
  };
  if (enabled) request({ type: 'ping' });
  function connect(sessionId, prepared) {
    const socket = net.createConnection(socketPath);
    let requestId = 0;
    let ended = false;
    let onData = () => {};
    let onExit = () => {};
    let onDisconnect = () => {};
    const pending = new Map();
    const queued = [];
    const send = (message) => {
      const payload = { sessionId, ...message };
      if (socket.connecting) queued.push(payload); else sendPtyMessage(socket, payload);
    };
    socket.on('connect', () => {
      sendPtyMessage(socket, { type: 'attach', sessionId, generation: prepared.generation, seq: prepared.seq });
      for (const message of queued.splice(0)) sendPtyMessage(socket, message);
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(new Error('PTY service disconnected')); }
      pending.clear();
      if (!ended) onDisconnect();
    });
    readPtyMessages(socket, (message) => {
      if (message.type === 'output') onData(message.data);
      else if (message.type === 'snapshot') onData(`\x1bc${message.data}`);
      else if (message.type === 'exit') { ended = true; onExit(message); }
      else if (pending.has(message.requestId)) {
        const { resolve, reject, timer } = pending.get(message.requestId);
        clearTimeout(timer);
        pending.delete(message.requestId);
        if (message.error) reject(new Error(message.error)); else resolve(message.inputSeq);
      } else if (message.error) socket.destroy();
    });
    return {
      onData(callback) { onData = callback; },
      onExit(callback) { onExit = callback; },
      onDisconnect(callback) { onDisconnect = callback; },
      write(data) { send({ type: 'write', data }); },
      writeInput(data, streamId, inputSeq) {
        if (socket.destroyed) return Promise.reject(new Error('PTY service disconnected'));
        return new Promise((resolve, reject) => {
          const id = ++requestId;
          const timer = setTimeout(() => socket.destroy(), 5000);
          pending.set(id, { resolve, reject, timer });
          send({ type: 'input', data, streamId, inputSeq, requestId: id });
        });
      },
      resize(cols, rows) { send({ type: 'resize', cols, rows }); },
      kill() { ended = true; socket.destroy(); },
    };
  }
  const listSessionIds = () => enabled ? request({ type: 'list' }).ids : [];
  return {
    enabled,
    prepare(sessionId, options) {
      if (!enabled) return null;
      const prepared = request({ type: 'prepare', sessionId, options });
      return { ...prepared, generation: `pty:${prepared.generation}`, pty: connect(sessionId, prepared) };
    },
    close(sessionId) { if (enabled) request({ type: 'close', sessionId }); },
    count() { return listSessionIds().length; },
    listSessionIds,
  };
}
