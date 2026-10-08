import assert from 'node:assert/strict';
import { readServerSource } from './test-support/read-source.js';
import fs from 'node:fs';
import { test } from 'node:test';

const source = readServerSource();

test('terminal attach replays a serialized screen snapshot instead of raw PTY history', () => {
  assert.match(source, /HeadlessTerminal/);
  assert.match(source, /SerializeAddon/);
  assert.match(source, /terminalSnapshot/);
  assert.match(source, /session\.terminal\.write\(chunk,/);
  assert.match(source, /serializeTerminalSnapshot\(session\.terminal, session\.serializer/);
  assert.match(source, /sendTerminalSnapshot\(ws,\s*terminalSnapshot\)/);
  assert.match(source, /function sendTerminalSnapshot\(ws, snapshot\)/);
  assert.match(source, /encodeTerminalOutput\(data, undefined, true\)/);
  assert.equal(source.includes("session.buffer.join('')"), false);
  assert.equal(source.includes('for (const chunk of session.buffer)'), false);
});

test('server snapshot scrollback is bounded for lower memory reconnect state', () => {
  assert.match(source, /TERMINAL_SCROLLBACK_LINES = terminalPolicy.scrollbackLines/);
  assert.match(source, /scrollback:\s*TERMINAL_SCROLLBACK_LINES/);
  assert.equal(source.includes('scrollback: BUFFER_LIMIT'), false);
});

test('terminal output marks snapshots dirty instead of serializing on every chunk', () => {
  const writeSnapshot = source.match(/function writeTerminalSnapshot\(session, chunk, onParsed\) \{[\s\S]*?\n\}/)?.[0] ?? '';

  assert.match(source, /function readTerminalSnapshot\(session\)/);
  assert.match(writeSnapshot, /session\.snapshotDirty = true/);
  assert.equal(writeSnapshot.includes('session.serializer.serialize()'), false);
  assert.match(source, /session\.terminalSnapshot = serializeTerminalSnapshot\(/);
  assert.match(source, /const terminalSnapshot = replayPlan.mode === 'reset' \? readTerminalSnapshot\(session\)/);
});

test('serialized tab titles are stripped of volatile spinner prefixes', () => {
  assert.match(source, /SPINNER_TITLE_PREFIX/);
  assert.match(source, /title:\s*cleanTerminalTitle\(tab\.title\) \|\| tab\.title/);
});

test('terminal websocket leaves transport compression off for already-compressed output frames', () => {
  // encodeTerminalOutput already deflates output payloads, so enabling websocket
  // transport compression would only re-compress them. Bun.serve leaves compression
  // off unless perMessageDeflate is opted into, so assert it never is.
  assert.match(source, /websocket:\s*websocketHandlers/);
  assert.equal(/perMessageDeflate/.test(source), false);
});
