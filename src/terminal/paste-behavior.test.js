import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');

test('terminal paste relies on native paste events instead of async clipboard reads', () => {
  assert.equal(source.includes('navigator.clipboard.readText'), false);
  assert.match(source, /addEventListener\('paste', pasteHandler\)/);
});

test('ctrl-v is reserved for browser paste instead of terminal control input', () => {
  assert.match(source, /attachCustomKeyEventHandler/);
  assert.match(source, /isPasteShortcut/);
  assert.match(source, /return false;/);
});
