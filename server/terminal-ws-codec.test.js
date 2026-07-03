import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';

import {
  TERMINAL_OUTPUT_COMPRESSED,
  TERMINAL_OUTPUT_TEXT,
  encodeTerminalOutputFrame,
  sendTerminalOutput,
} from './terminal-ws-codec.js';

function decodeTerminalOutputFrame(frame) {
  const payload = frame.subarray(1);

  if (frame[0] === TERMINAL_OUTPUT_COMPRESSED) {
    return inflateSync(payload).toString('utf8');
  }

  assert.equal(frame[0], TERMINAL_OUTPUT_TEXT);
  return payload.toString('utf8');
}

test('terminal output uses a compressed binary frame when deflate reduces payload size', () => {
  const output = `\x1b[32m${'build output '.repeat(400)}\x1b[0m\r\n`;
  const frame = encodeTerminalOutputFrame(output);
  const jsonPayloadBytes = Buffer.byteLength(JSON.stringify({ type: 'output', data: output }));

  assert.equal(frame[0], TERMINAL_OUTPUT_COMPRESSED);
  assert.ok(frame.length < jsonPayloadBytes);
  assert.equal(decodeTerminalOutputFrame(frame), output);
});

test('small terminal output uses a compact binary text frame instead of larger deflate', () => {
  const output = 'ok\r\n';
  const frame = encodeTerminalOutputFrame(output);

  assert.equal(frame[0], TERMINAL_OUTPUT_TEXT);
  assert.equal(decodeTerminalOutputFrame(frame), output);
});

test('terminal output preserves OSC 52 clipboard sequences before framing', () => {
  const frame = encodeTerminalOutputFrame(
    'before\x1b]52;c;SGVsbG8=\x07middle\x1b]52;c;V29ybGQ=\x1b\\after'
  );

  assert.equal(
    decodeTerminalOutputFrame(frame),
    'before\x1b]52;c;SGVsbG8=\x07middle\x1b]52;c;V29ybGQ=\x1b\\after',
  );
});

test('terminal websocket output preserves split OSC 52 sequences', () => {
  const sent = [];
  const ws = {
    send(frame) {
      sent.push(frame);
    },
  };

  sendTerminalOutput(ws, 'a\x1b]5');
  sendTerminalOutput(ws, '2;c;SGVsbG8=');
  sendTerminalOutput(ws, '\x07b\x1b]52;c;V29ybGQ=\x1b');
  sendTerminalOutput(ws, '\\c');

  assert.equal(
    sent.map(decodeTerminalOutputFrame).join(''),
    'a\x1b]52;c;SGVsbG8=\x07b\x1b]52;c;V29ybGQ=\x1b\\c',
  );
});

test('terminal output preserves mouse tracking mode sequences', () => {
  const frame = encodeTerminalOutputFrame(
    'before\x1b[?1000hmiddle\x1b[?1000;1002;1006hafter\x1b[?25h\x1b[?1000l'
  );

  assert.equal(
    decodeTerminalOutputFrame(frame),
    'before\x1b[?1000hmiddle\x1b[?1000;1002;1006hafter\x1b[?25h\x1b[?1000l',
  );
});

test('terminal websocket output preserves split mouse tracking mode sequences', () => {
  const sent = [];
  const ws = {
    send(frame) {
      sent.push(frame);
    },
  };

  sendTerminalOutput(ws, 'a\x1b');
  sendTerminalOutput(ws, '[?100');
  sendTerminalOutput(ws, '0;1002;1006h');
  sendTerminalOutput(ws, 'b');

  assert.equal(sent.map(decodeTerminalOutputFrame).join(''), 'a\x1b[?1000;1002;1006hb');
});
