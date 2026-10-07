import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PassThrough } from 'node:stream';
import { createPersistentPtyBackend } from './persistent-pty.js';
import { readPtyMessages } from './pty-channel.js';

test('a missing persistent service fails instead of creating temporary shells', () => {
  assert.throws(() => createPersistentPtyBackend({ enabled: true, run: () => ({ status: 1, stderr: 'missing socket' }) }), /Persistent PTY service unavailable/);
});

test('ordinary development does not invoke the persistent service', () => {
  const backend = createPersistentPtyBackend({ enabled: false, run: () => { throw new Error('must not run'); } });
  assert.equal(backend.prepare('session', {}), null);
  assert.deepEqual(backend.listSessionIds(), []);
  backend.close('session');
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
