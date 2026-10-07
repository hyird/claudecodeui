import assert from 'node:assert/strict';
import { readTerminalSource } from './test-support/read-source.js';
import fs from 'node:fs';
import { test } from 'node:test';

const paneSource = readTerminalSource();
const clipboardSource = fs.readFileSync(new URL('./clipboard.ts', import.meta.url), 'utf8');

test('terminal keyboard input mirrors the original plugin handler', () => {
  assert.match(paneSource, /if \(event\.type !== 'keydown'\) return true/);
  assert.match(paneSource, /const mod = event\.ctrlKey \|\| event\.metaKey/);
  assert.match(paneSource, /mod && event\.key\.toLowerCase\(\) === 'c' && terminal\.hasSelection\(\)/);
  const copyBranch = paneSource.match(/if \(mod && event\.key\.toLowerCase\(\) === 'c' && terminal\.hasSelection\(\)\) \{[\s\S]*?\n\s*\}/);
  assert.ok(copyBranch, 'Could not find copy shortcut branch');
  assert.match(copyBranch[0], /return false/);
  assert.match(copyBranch[0], /event\.preventDefault\(\)/);
  assert.match(copyBranch[0], /writeClipboard\(terminal\.getSelection\(\)\)/);
  assert.match(paneSource, /mod && event\.key\.toLowerCase\(\) === 'v'/);
  assert.equal(paneSource.includes('navigator.clipboard?.readText'), false);
  assert.match(paneSource, /return true/);
});

test('paste shortcuts stay on xterm native paste path', () => {
  const pasteBranch = paneSource.match(
    /if \(mod && event\.key\.toLowerCase\(\) === 'v'\) \{[\s\S]*?\n\s*\}/,
  );
  assert.ok(pasteBranch, 'Could not find paste shortcut branch');
  assert.match(pasteBranch[0], /return false/);
  assert.equal(pasteBranch[0].includes('preventDefault'), false);
  assert.equal(pasteBranch[0].includes('sendInput'), false);
  assert.equal(pasteBranch[0].includes('clipboard.readText'), false);
});

test('all ordinary xterm input is sent directly by onData', () => {
  assert.match(paneSource, /terminal\.onData\(sendInput\)/);
});

test('xterm input addons and initialization order mirror the original plugin', () => {
  assert.match(paneSource, /terminal\.loadAddon\(new ClipboardAddon\(undefined, \{/);
  assert.match(paneSource, /writeText: \(selection, text\) =>/);
  assert.match(paneSource, /return writeClipboard\(text\)/);
  assert.match(paneSource, /pendingCopyText !== null/);
  assert.match(clipboardSource, /document\.execCommand\('copy'\)/);
  assert.ok(paneSource.indexOf('terminal.open(container)') < paneSource.indexOf('terminal.attachCustomKeyEventHandler'));
});

test('Vim mode reports cannot crash xterm 6 write processing', () => {
  assert.match(paneSource, /registerModeReportGuard/);
  assert.match(paneSource, /registerCsiHandler/);
  assert.match(paneSource, /terminal\.input/);
  assert.match(paneSource, /mode\};\$\{status\}\$y/);
});

test('paste remains on xterm native event handling', () => {
  assert.equal(paneSource.includes("addEventListener('paste'"), false);
  assert.equal(paneSource.includes("addEventListener('copy'"), false);
  assert.equal(paneSource.includes('pasteTerminalClipboard'), false);
  assert.equal(paneSource.includes('pasteTerminalText'), false);
  assert.equal(paneSource.includes('isPasteShortcut'), false);
});

test('mouse-mode native selection stays on xterm shift-selection path', () => {
  assert.equal(paneSource.includes("addEventListener('mousedown'"), false);
  assert.equal(paneSource.includes("addEventListener('pointerdown'"), false);
  assert.equal(paneSource.includes('shiftKey = true'), false);
});
