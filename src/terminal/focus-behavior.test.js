import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('inactive terminals do not keep a visible xterm cursor', () => {
  assert.match(source, /cursorBlink:\s*false/);
  assert.match(source, /cursorInactiveStyle:\s*'none'/);
  assert.match(source, /terminal\.blur\(\)/);
});

test('xterm helper textarea cannot paint a native browser caret', () => {
  const helperRule = styles.match(/\.terminal-pane \.xterm-helper-textarea \{[\s\S]*?\}/)?.[0] ?? '';

  assert.match(helperRule, /caret-color:\s*transparent/);
  assert.match(helperRule, /outline:\s*none/);
  assert.match(helperRule, /background:\s*transparent/);
});
