import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { writeTerminalInput } from './terminal-input.js';

test('input retries do not repeat a successful write or consume a failed write', () => {
  const streamId = randomUUID();
  const streams = new Map();
  const writes = [];
  let fail = true;
  const pty = { write(data) { if (fail) throw new Error('write failed'); writes.push(data); } };
  const message = { streamId, inputSeq: 1, data: 'command\r' };
  assert.throws(() => writeTerminalInput(pty, streams, message), /write failed/);
  assert.equal(streams.size, 0);
  fail = false;
  assert.equal(writeTerminalInput(pty, streams, message), 1);
  assert.equal(writeTerminalInput(pty, streams, message), 1);
  assert.deepEqual(writes, ['command\r']);
  assert.throws(() => writeTerminalInput(pty, streams, { ...message, inputSeq: 3 }), /sequence gap/);
  assert.deepEqual(writes, ['command\r']);
});
