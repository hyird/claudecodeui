import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

import ts from 'typescript';

const paneSource = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');
const clipboardSource = fs.readFileSync(new URL('./clipboard.ts', import.meta.url), 'utf8');

function loadClipboardModule(navigator) {
  const compiled = ts.transpileModule(clipboardSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    exports: module.exports,
    module,
    navigator,
  });
  return module.exports;
}

function keyboardEvent(overrides = {}) {
  return {
    type: 'keydown',
    key: 'v',
    ctrlKey: true,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault() {},
    stopPropagation() {},
    ...overrides,
  };
}

test('terminal paste supports both native paste events and clipboard shortcut reads', () => {
  assert.match(clipboardSource, /navigator\.clipboard\.readText\(\)/);
  assert.match(paneSource, /pasteTerminalClipboard\(terminal, event\)/);
  assert.match(paneSource, /addEventListener\('paste', pasteHandler\)/);
});

test('terminal does not install xterm clipboard addon behavior', () => {
  assert.equal(paneSource.includes('@xterm/addon-clipboard'), false);
  assert.equal(paneSource.includes('ClipboardAddon'), false);
});

test('ctrl-v is handled as an explicit terminal paste shortcut', () => {
  assert.match(paneSource, /attachCustomKeyEventHandler/);
  assert.match(paneSource, /pasteTerminalClipboard/);
  assert.match(clipboardSource, /export function isPasteShortcut/);
  assert.match(clipboardSource, /isModifiedKeyShortcut\(event, 'v'\)/);
});

test('all pasted text flows through xterm bracketed-paste handling', () => {
  assert.match(clipboardSource, /terminal\.paste\(text\)/);
  assert.match(paneSource, /pasteTerminalText\(terminal, data\)/);
  assert.doesNotMatch(paneSource, /sendInput\(data\)/);
});

test('ctrl-v reads the clipboard once and pastes through xterm once', async () => {
  let readCount = 0;
  let preventCount = 0;
  let stopCount = 0;
  const calls = [];
  const { pasteTerminalClipboard } = loadClipboardModule({
    clipboard: {
      async readText() {
        readCount += 1;
        return 'clipboard payload';
      },
    },
  });
  const terminal = {
    focus() { calls.push('focus'); },
    paste(text) { calls.push(['paste', text]); },
  };
  const event = keyboardEvent({
    preventDefault() { preventCount += 1; },
    stopPropagation() { stopCount += 1; },
  });

  assert.equal(pasteTerminalClipboard(terminal, event), true);
  await Promise.resolve();

  assert.equal(readCount, 1);
  assert.equal(preventCount, 1);
  assert.equal(stopCount, 1);
  assert.deepEqual(calls, ['focus', ['paste', 'clipboard payload']]);
});

test('native paste text uses the same xterm paste path', () => {
  const { pasteTerminalText } = loadClipboardModule({});
  const calls = [];
  const terminal = {
    focus() { calls.push('focus'); },
    paste(text) { calls.push(['paste', text]); },
  };

  assert.equal(pasteTerminalText(terminal, 'native payload'), true);
  assert.deepEqual(calls, ['focus', ['paste', 'native payload']]);
  assert.equal(pasteTerminalText(terminal, ''), false);
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
