import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import { createPersistentPtyBackend } from './persistent-pty.js';
import { readPtyMessages, sendPtyMessage } from './pty-channel.js';

// The real broker needs bun-pty and a Unix socket; this fake speaks the same JSON
// line protocol over a local socket (a named pipe on Windows).
function socketPath() {
  return process.platform === 'win32'
    ? `\\\\.\\pipe\\cloud-terminal-test-${randomUUID()}`
    : path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-pty-')), 'pty.sock');
}

async function fakeBroker(t, { resizeOutput = false } = {}) {
  const received = [];
  const ids = new Set();
  const subscribers = new Set();
  const sockets = new Set();
  const push = () => { for (const socket of subscribers) sendPtyMessage(socket, { type: 'sessions', ids: [...ids] }); };
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on('error', () => {});
    socket.on('close', () => { subscribers.delete(socket); sockets.delete(socket); });
    readPtyMessages(socket, (message) => {
      received.push(message);
      const reply = (value) => sendPtyMessage(socket, { requestId: message.requestId, ...value });
      if (message.type === 'subscribe') { subscribers.add(socket); reply({ ids: [...ids] }); return; }
      if (message.type === 'prepare') {
        ids.add(message.sessionId);
        push();
        reply({ generation: 'g1', cwd: '/home', pid: 42, seq: 5, data: 'screen', cols: 80, rows: 24 });
        return;
      }
      if (message.type === 'close') { ids.delete(message.sessionId); push(); reply({ ok: true }); return; }
      if (message.type === 'attach') { reply({ ok: true }); sendPtyMessage(socket, { type: 'output', data: 'live', seq: 6 }); }
      if (message.type === 'resize' && resizeOutput) sendPtyMessage(socket, { type: 'output', data: 'old-size', seq: 7 });
      if (message.type === 'ping') {
        // Reply and following output deliberately share one transport chunk.
        socket.write(JSON.stringify({ requestId: message.requestId, ok: true }) + '\n'
          + (resizeOutput ? JSON.stringify({ type: 'output', data: 'new-size', seq: 8 }) + '\n' : ''));
      }
    });
  });
  const listenPath = socketPath();
  await new Promise((resolve) => server.listen(listenPath, resolve));
  t.after(() => new Promise((resolve) => {
    for (const socket of sockets) socket.destroy();
    server.close(resolve);
  }));
  return {
    path: listenPath, received, ids, push,
    dropConnections() { for (const socket of sockets) socket.destroy(); },
    ofType: (type) => received.filter((message) => message.type === type),
  };
}

const until = async (predicate) => {
  for (let attempt = 0; attempt < 200 && !predicate(); attempt += 1) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.ok(predicate(), 'condition not reached');
};

test('a missing persistent service fails startup instead of creating temporary shells', async () => {
  await assert.rejects(createPersistentPtyBackend({ enabled: true, socketPath: socketPath() }),
    /Persistent PTY service unavailable/);
});

test('persistent resize fences old and new output on the existing viewer without replacing the broker', async t => {
  const broker = await fakeBroker(t, { resizeOutput: true });
  const backend = await createPersistentPtyBackend({ enabled: true, socketPath: broker.path });
  const { pty } = await backend.prepare(randomUUID(), { cols: 80, rows: 24 });
  const events = [];
  pty.onData(data => events.push(data));
  pty.onResize((cols, rows) => events.push(`resize:${cols}x${rows}`));
  await until(() => events.includes('live'));
  events.length = 0;
  pty.resize(90, 30);
  pty.resize(90, 30);
  await until(() => events.includes('new-size'));
  assert.deepEqual(events, ['old-size', 'resize:90x30', 'new-size']);
  assert.equal(broker.ofType('resize').length, 1);
  assert.equal(broker.ofType('attach').length, 1);
  assert.equal(broker.ofType('close').length, 0);
  pty.kill();
});

test('ordinary development does not contact the persistent service', async () => {
  const backend = await createPersistentPtyBackend({
    enabled: false, createConnection: () => { throw new Error('must not connect'); },
  });
  assert.equal(backend.enabled, false);
  assert.equal(await backend.prepare('session', {}), null);
  assert.equal(backend.count(), 0);
  await backend.close('session');
});

test('live session ids are cached from the service, so status reads need no I/O', async (t) => {
  const broker = await fakeBroker(t);
  const existing = randomUUID();
  broker.ids.add(existing);
  const backend = await createPersistentPtyBackend({ enabled: true, socketPath: broker.path });
  assert.deepEqual([...backend.sessionIds], [existing]);
  assert.equal(backend.count(), 1);

  const requests = broker.received.length;
  for (let index = 0; index < 100; index += 1) backend.count();
  assert.equal(broker.received.length, requests);

  broker.ids.delete(existing);
  broker.push();
  await until(() => backend.count() === 0);
});

test('prepare attaches a viewer connection and close is skipped for unknown sessions', async (t) => {
  const broker = await fakeBroker(t);
  const backend = await createPersistentPtyBackend({ enabled: true, socketPath: broker.path });
  const sessionId = randomUUID();
  const prepared = await backend.prepare(sessionId, { cols: 80, rows: 24 });
  assert.equal(prepared.generation, 'pty:g1');
  assert.equal(prepared.data, 'screen');
  assert.ok(backend.sessionIds.has(sessionId));
  const output = [];
  prepared.pty.onData((data) => output.push(data));
  await until(() => output.length === 1);
  assert.deepEqual(broker.ofType('attach').map(({ sessionId: id, generation, seq }) => [id, generation, seq]),
    [[sessionId, 'g1', 5]]);
  assert.deepEqual(output, ['live']);
  prepared.pty.kill();

  await backend.close(randomUUID());
  assert.equal(broker.ofType('close').length, 0);
  await backend.close(sessionId);
  assert.deepEqual(broker.ofType('close').map((message) => message.sessionId), [sessionId]);
  assert.equal(backend.sessionIds.has(sessionId), false);
});

test('a close issued while the session is still being prepared reaches the service in order', async (t) => {
  const broker = await fakeBroker(t);
  const backend = await createPersistentPtyBackend({ enabled: true, socketPath: broker.path });
  const sessionId = randomUUID();
  const preparing = backend.prepare(sessionId, {});
  const closing = backend.close(sessionId);
  const prepared = await preparing;
  await closing;
  prepared.pty.kill();
  assert.deepEqual(broker.received.filter((m) => m.sessionId === sessionId && m.type !== 'attach').map((m) => m.type),
    ['prepare', 'close']);
});

test('a dropped control connection clears the cache and the next request reconnects', async (t) => {
  const broker = await fakeBroker(t);
  const existing = randomUUID();
  broker.ids.add(existing);
  const backend = await createPersistentPtyBackend({ enabled: true, socketPath: broker.path });
  assert.equal(backend.count(), 1);
  broker.dropConnections();
  await until(() => backend.count() === 0);
  const prepared = await backend.prepare(randomUUID(), {});
  prepared.pty.kill();
  assert.equal(broker.ofType('subscribe').length, 2);
  assert.equal(backend.count(), 2);
});

test('PTY channel preserves split UTF-8, escaped newlines and multiple messages', () => {
  const socket = new PassThrough();
  const received = [];
  readPtyMessages(socket, (message) => received.push(message));
  const bytes = Buffer.from(JSON.stringify({ data: '中文\r\n\x1b[31m' }) + '\n' + JSON.stringify({ inputSeq: 42 }) + '\n');
  for (const byte of bytes) socket.write(Buffer.from([byte]));
  assert.deepEqual(received, [{ data: '中文\r\n\x1b[31m' }, { inputSeq: 42 }]);
  socket.destroy();
});

test('PTY channel decodes several messages per chunk and a message spanning chunks', () => {
  const socket = new PassThrough();
  const received = [];
  readPtyMessages(socket, (message) => received.push(message));
  const large = 'x'.repeat(100000);
  const text = `${JSON.stringify({ a: 1 })}\n${JSON.stringify({ b: 2 })}\n${JSON.stringify({ large })}\n`;
  const cut = text.indexOf('xxx') + 10;
  socket.write(text.slice(0, cut));
  socket.write(text.slice(cut, cut + 5000));
  socket.write(text.slice(cut + 5000));
  assert.deepEqual(received, [{ a: 1 }, { b: 2 }, { large }]);
  socket.destroy();
});
