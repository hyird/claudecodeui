import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');

test('terminal attach replays buffered output in one websocket frame', () => {
  assert.match(source, /const bufferedOutput = session\.buffer\.join\(''\)/);
  assert.match(source, /sendTerminalOutput\(ws,\s*bufferedOutput\)/);
  assert.equal(source.includes('for (const chunk of session.buffer)'), false);
});

test('serialized tab titles are stripped of volatile spinner prefixes', () => {
  assert.match(source, /SPINNER_TITLE_PREFIX/);
  assert.match(source, /title:\s*cleanTerminalTitle\(tab\.title\) \|\| tab\.title/);
});
