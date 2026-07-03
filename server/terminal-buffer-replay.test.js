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

test('serialized tab titles are stripped of volatile spinner prefixes', () => {
  assert.match(source, /SPINNER_TITLE_PREFIX/);
  assert.match(source, /title:\s*cleanTerminalTitle\(tab\.title\) \|\| tab\.title/);
});
