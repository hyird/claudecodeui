import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');

test('terminal attach replays a serialized screen snapshot instead of raw PTY history', () => {
  assert.match(source, /HeadlessTerminal/);
  assert.match(source, /SerializeAddon/);
  assert.match(source, /terminalSnapshot/);
  assert.match(source, /session\.terminal\.write\(chunk,/);
  assert.match(source, /session\.serializer\.serialize\(\)/);
  assert.match(source, /sendTerminalOutput\(ws,\s*terminalSnapshot\)/);
  assert.equal(source.includes("session.buffer.join('')"), false);
  assert.equal(source.includes('for (const chunk of session.buffer)'), false);
});

test('server snapshot scrollback is bounded for lower memory reconnect state', () => {
  assert.match(source, /const SERVER_SNAPSHOT_SCROLLBACK = 1000/);
  assert.match(source, /scrollback:\s*SERVER_SNAPSHOT_SCROLLBACK/);
  assert.equal(source.includes('scrollback: BUFFER_LIMIT'), false);
});

test('terminal output marks snapshots dirty instead of serializing on every chunk', () => {
  const writeSnapshot = source.match(/function writeTerminalSnapshot\(session, chunk\) \{[\s\S]*?\n\}/)?.[0] ?? '';

  assert.match(source, /function readTerminalSnapshot\(session\)/);
  assert.match(writeSnapshot, /session\.snapshotDirty = true/);
  assert.equal(writeSnapshot.includes('session.serializer.serialize()'), false);
  assert.match(source, /session\.terminalSnapshot = session\.serializer\.serialize\(\)/);
  assert.match(source, /const terminalSnapshot = readTerminalSnapshot\(session\)/);
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
