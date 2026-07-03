import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const paneSource = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');
const clipboardSource = fs.readFileSync(new URL('./clipboard.ts', import.meta.url), 'utf8');

test('terminal paste relies on native paste events instead of async clipboard reads', () => {
  assert.equal(paneSource.includes('navigator.clipboard.readText'), false);
  assert.equal(clipboardSource.includes('navigator.clipboard.readText'), false);
  assert.match(paneSource, /addEventListener\('paste', pasteHandler\)/);
});

test('terminal does not install xterm clipboard addon behavior', () => {
  assert.equal(paneSource.includes('@xterm/addon-clipboard'), false);
  assert.equal(paneSource.includes('ClipboardAddon'), false);
});

test('ctrl-v is reserved for browser paste instead of terminal control input', () => {
  assert.match(paneSource, /attachCustomKeyEventHandler/);
  assert.match(paneSource, /isPasteShortcut/);
  assert.match(clipboardSource, /export function isPasteShortcut/);
  assert.match(clipboardSource, /isModifiedKeyShortcut\(event, 'v'\)/);
});

test('selected terminal text is copied only after xterm has a native selection', () => {
  assert.match(paneSource, /isCopyShortcut/);
  assert.match(paneSource, /addEventListener\('copy', copyHandler, true\)/);
  assert.match(clipboardSource, /terminal\.hasSelection\(\)/);
  assert.match(clipboardSource, /terminal\.getSelection\(\)/);
  assert.match(clipboardSource, /navigator\.clipboard\.writeText/);
  assert.match(clipboardSource, /event\.stopPropagation\(\)/);
});

test('mouse-mode native selection stays on xterm shift-selection path', () => {
  assert.equal(paneSource.includes("addEventListener('mousedown'"), false);
  assert.equal(paneSource.includes("addEventListener('pointerdown'"), false);
  assert.equal(paneSource.includes('shiftKey = true'), false);
});
