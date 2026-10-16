import net from 'node:net';
import { readPtyMessages, sendPtyMessage } from './pty-channel.js';

const CONTROL_TIMEOUT_MS = 10000;
const INPUT_TIMEOUT_MS = 5000;

const disabledBackend = Object.freeze({
  enabled: false,
  sessionIds: new Set(),
  count: () => 0,
  prepare: async () => null,
  close: async () => {},
});

// Talks to the separate PTY service over one long-lived control connection. Requests
// are asynchronous and ordered; the service pushes its live session ids, so tab
// status and health checks read a local cache instead of doing I/O. Resolves once
// the service answered, so a missing service still stops the web process at boot.
export async function createPersistentPtyBackend({
  enabled = process.env.CLOUDCLI_PERSIST_TERMINALS === '1',
  socketPath = process.env.CLOUDCLI_PTY_SOCKET || '/run/cloud-terminal/pty.sock',
  createConnection = net.createConnection,
} = {}) {
  if (!enabled) return disabledBackend;

  const sessionIds = new Set();
  // Prepares in flight per id: a close must reach the service even before the
  // prepared id shows up in the cache.
  const preparing = new Map();
  const pending = new Map();
  let requestId = 0;
  let control = null;

  const replaceSessionIds = (ids) => {
    sessionIds.clear();
    for (const id of ids) sessionIds.add(id);
  };

  function send(connection, message) {
    const { socket } = connection;
    if (socket.destroyed) return Promise.reject(new Error('PTY service disconnected'));
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('PTY service timed out'));
        socket.destroy();
      }, CONTROL_TIMEOUT_MS);
      pending.set(id, { socket, resolve, reject, timer });
      sendPtyMessage(socket, { ...message, requestId: id });
    });
  }

  function connectControl() {
    const socket = createConnection(socketPath);
    const connection = { socket, ready: null };
    control = connection;
    let failure = null;
    socket.on('error', (error) => { failure = error; });
    socket.on('close', () => {
      if (control === connection) {
        control = null;
        // The service owns every shell: without it the cache would only be stale.
        sessionIds.clear();
      }
      for (const [id, entry] of pending) {
        if (entry.socket !== socket) continue;
        clearTimeout(entry.timer);
        pending.delete(id);
        entry.reject(new Error('PTY service disconnected'));
      }
    });
    readPtyMessages(socket, (message) => {
      if (message.type === 'sessions') {
        replaceSessionIds(message.ids);
        return;
      }
      const entry = pending.get(message.requestId);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(message.requestId);
      if (message.error) entry.reject(new Error(message.error)); else entry.resolve(message);
    });
    connection.ready = new Promise((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('close', () => reject(failure ?? new Error('PTY service disconnected')));
    }).then(() => send(connection, { type: 'subscribe' })).then((reply) => replaceSessionIds(reply.ids));
    // Failures surface through request(); a dropped connection is reopened lazily.
    connection.ready.catch(() => {});
    return connection;
  }

  async function request(message) {
    const connection = control ?? connectControl();
    await connection.ready;
    return send(connection, message);
  }

  try {
    await (control ?? connectControl()).ready;
  } catch (error) {
    control?.socket.destroy();
    throw new Error(`Persistent PTY service unavailable: ${error.message || 'start the separate PTY service first'}`);
  }

  function connect(sessionId, prepared) {
    const socket = createConnection(socketPath);
    let inputRequestId = 0;
    let ended = false;
    let onData = () => {};
    let onExit = () => {};
    let onDisconnect = () => {};
    let onResize = () => {};
    let requestedSize = { cols: prepared.cols, rows: prepared.rows };
    const inputs = new Map();
    const queued = [];
    const sendToSession = (message) => {
      const payload = { sessionId, ...message };
      if (socket.connecting) queued.push(payload); else sendPtyMessage(socket, payload);
    };
    socket.on('connect', () => {
      sendPtyMessage(socket, { type: 'attach', sessionId, generation: prepared.generation, seq: prepared.seq });
      for (const message of queued.splice(0)) sendPtyMessage(socket, message);
    });
    socket.on('error', () => {});
    socket.on('close', () => {
      for (const { reject, timer } of inputs.values()) { clearTimeout(timer); reject(new Error('PTY service disconnected')); }
      inputs.clear();
      if (!ended) onDisconnect();
    });
    readPtyMessages(socket, (message) => {
      if (message.type === 'output') onData(message.data);
      else if (message.type === 'snapshot') onData(`\x1bc${message.data}`);
      else if (message.type === 'exit') { ended = true; onExit(message); }
      else if (inputs.has(message.requestId)) {
        const { resolve, reject, timer } = inputs.get(message.requestId);
        clearTimeout(timer);
        inputs.delete(message.requestId);
        if (message.error) reject(new Error(message.error)); else resolve(message);
      } else if (message.error) socket.destroy();
    });
    return {
      onData(callback) { onData = callback; },
      onExit(callback) { onExit = callback; },
      onDisconnect(callback) { onDisconnect = callback; },
      onResize(callback) { onResize = callback; },
      write(data) { sendToSession({ type: 'write', data }); },
      writeInput(data, streamId, inputSeq) {
        if (socket.destroyed) return Promise.reject(new Error('PTY service disconnected'));
        return new Promise((resolve, reject) => {
          const id = ++inputRequestId;
          const timer = setTimeout(() => socket.destroy(), INPUT_TIMEOUT_MS);
          inputs.set(id, { resolve, reject, timer });
          sendToSession({ type: 'input', data, streamId, inputSeq, requestId: id });
        }).then((message) => message.inputSeq);
      },
      resize(cols, rows) {
        if (requestedSize.cols === cols && requestedSize.rows === rows) return;
        requestedSize = { cols, rows };
        sendToSession({ type: 'resize', cols, rows });
        // Existing brokers serialize commands per session. A ping on the SAME
        // viewer connection follows the resize barrier and precedes new-size
        // output. This works without replacing the broker that owns live PTYs.
        const id = ++inputRequestId;
        const timer = setTimeout(() => socket.destroy(), INPUT_TIMEOUT_MS);
        inputs.set(id, {
          timer,
          resolve() { onResize(cols, rows); },
          reject() { socket.destroy(); },
        });
        sendToSession({ type: 'ping', requestId: id });
      },
      kill() { ended = true; socket.destroy(); },
    };
  }

  return {
    enabled: true,
    // Live ids, kept current by the service; read without I/O.
    sessionIds,
    count() { return sessionIds.size; },
    async prepare(sessionId, options) {
      preparing.set(sessionId, (preparing.get(sessionId) ?? 0) + 1);
      try {
        const prepared = await request({ type: 'prepare', sessionId, options });
        return { ...prepared, generation: `pty:${prepared.generation}`, pty: connect(sessionId, prepared) };
      } finally {
        const remaining = preparing.get(sessionId) - 1;
        if (remaining > 0) preparing.set(sessionId, remaining); else preparing.delete(sessionId);
      }
    },
    // The service pushes the updated ids before replying on the same connection.
    async close(sessionId) {
      if (!sessionIds.has(sessionId) && !preparing.has(sessionId)) return;
      await request({ type: 'close', sessionId });
    },
  };
}
