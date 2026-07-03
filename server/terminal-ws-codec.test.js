import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';

import {
  TERMINAL_OUTPUT_COMPRESSED,
  TERMINAL_OUTPUT_TEXT,
  encodeTerminalOutputFrame,
} from './terminal-ws-codec.js';

test('terminal output uses a compressed binary frame when deflate reduces payload size', () => {
  const output = `\x1b[32m${'build output '.repeat(400)}\x1b[0m\r\n`;
  const frame = encodeTerminalOutputFrame(output);
  const jsonPayloadBytes = Buffer.byteLength(JSON.stringify({ type: 'output', data: output }));

  assert.equal(frame[0], TERMINAL_OUTPUT_COMPRESSED);
  assert.ok(frame.length < jsonPayloadBytes);
  assert.equal(inflateSync(frame.subarray(1)).toString('utf8'), output);
});

test('small terminal output uses a compact binary text frame instead of larger deflate', () => {
  const output = 'ok\r\n';
  const frame = encodeTerminalOutputFrame(output);

  assert.equal(frame[0], TERMINAL_OUTPUT_TEXT);
  assert.equal(frame.subarray(1).toString('utf8'), output);
});
