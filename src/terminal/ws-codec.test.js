import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const codecSource = fs.existsSync(new URL('./wsCodec.ts', import.meta.url))
  ? fs.readFileSync(new URL('./wsCodec.ts', import.meta.url), 'utf8')
  : '';
const paneSource = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');

// The codec's own behaviour (encode/decode round-trips, including the compressed
// output path) is covered end to end against the server codec in wsCodec.spec.ts.
// The assertions kept here are about how TerminalPane *wires up* that codec, which
// is not exercised without a DOM.

test('terminal pane routes websocket messages through async binary-aware decoder', () => {
  assert.match(paneSource, /decodeTerminalServerMessage/);
  assert.match(paneSource, /encodeTerminalClientMessage/);
  assert.match(paneSource, /socket\.binaryType = 'arraybuffer'/);
});

test('terminal pane preserves websocket frame order while async decoding output', () => {
  assert.match(paneSource, /const handleTerminalServerMessage = async/);
  assert.match(paneSource, /socketRef\.current !== socket/);
  assert.match(paneSource, /let terminalMessageQueue = Promise\.resolve\(\)/);
  assert.match(paneSource, /terminalMessageQueue = terminalMessageQueue[\s\S]*\.then\(\(\) => handleTerminalServerMessage\(socket, event\.data\)\)/);
});

test('terminal pane sends last applied seq and buffers out-of-order server frames', () => {
  assert.match(codecSource, /lastSeq:\s*message\.lastSeq/);
  assert.match(codecSource, /seq:\s*message\.seq/);
  assert.match(paneSource, /let lastAppliedTerminalSeq = 0/);
  assert.match(paneSource, /const pendingTerminalMessages = new Map/);
  assert.match(paneSource, /lastSeq:\s*lastAppliedTerminalSeq/);
  assert.match(paneSource, /message\.seq > lastAppliedTerminalSeq \+ 1/);
  assert.match(paneSource, /pendingTerminalMessages\.set\(message\.seq, message\)/);
});
