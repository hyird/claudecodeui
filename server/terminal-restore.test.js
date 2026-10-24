import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';
import { cloudcli } from '../proto/messages.js';
import { sendTerminalEvent, sendTerminalSnapshot, websocketWritable } from './terminal-output.js';

function viewer() {
  return {
    readyState: 1, data: { kind: 'terminal-output' }, messages: [], buffered: 0,
    getBufferedAmount() { return this.buffered; },
    send(message) { this.messages.push(message); this.buffered += message.byteLength; return -1; },
    close(code) { this.closedCode = code; this.readyState = 3; },
  };
}

test('a large UTF-8 restore is one complete compressed message and survives its initial backpressure', async () => {
  const ws = viewer();
  // Low-compressibility history exceeds the normal live-output allowance.
  const snapshot = '中文 │\r\n' + randomBytes(1600 * 1024).toString('base64');
  await sendTerminalSnapshot(ws, snapshot);
  assert.equal(ws.messages.length, 1);
  const message = cloudcli.TerminalServerMessage.decode(ws.messages[0]);
  assert.equal(message.output.compressed, true);
  assert.equal(inflateSync(message.output.data).toString(), snapshot);
  assert.ok(ws.buffered > 1024 * 1024);
  assert.equal(websocketWritable(ws), true);
  assert.equal(ws.closedCode, undefined);
  // Once the restore drains, excessive live buffering still closes slow viewers.
  ws.data.snapshotBufferAllowance = 0;
  ws.buffered = 1024 * 1024 + 1;
  assert.equal(websocketWritable(ws), false);
  assert.equal(ws.closedCode, 1013);
});

test('an empty screen still sends a restore frame that can complete the restore', async () => {
  const ws = viewer();
  await sendTerminalSnapshot(ws, '');
  assert.equal(ws.messages.length, 1);
  const message = cloudcli.TerminalServerMessage.decode(ws.messages[0]);
  assert.equal(Buffer.from(message.output.data).toString(), '\x1b[0m');
});

test('a dropped restore disconnects the viewer rather than completing a broken restore', async () => {
  const ws = viewer();
  ws.send = () => 0;
  await sendTerminalSnapshot(ws, 'snapshot');
  assert.equal(ws.closedCode, 1013);
});

test('live events produced while a restore compresses follow it on the socket', async () => {
  const ws = viewer();
  const restored = sendTerminalSnapshot(ws, 'history '.repeat(4096));
  sendTerminalEvent(ws, { type: 'output', data: 'live', seq: 7 });
  sendTerminalEvent(ws, { type: 'exit', exitCode: 0, signal: null, seq: 8 });
  assert.equal(ws.messages.length, 0);
  await restored;
  const [snapshot, live, exit] = ws.messages.map((bytes) => cloudcli.TerminalServerMessage.decode(bytes));
  assert.equal(snapshot.output.compressed, true);
  assert.equal(inflateSync(snapshot.output.data).toString(), 'history '.repeat(4096));
  assert.equal(Buffer.from(live.output.data).toString(), 'live');
  assert.equal(live.seq, 7);
  assert.equal(exit.body, 'exit');
  assert.equal(ws.data.snapshotQueue, null);
});
