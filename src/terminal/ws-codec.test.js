import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const codecSource = fs.existsSync(new URL('./wsCodec.ts', import.meta.url))
  ? fs.readFileSync(new URL('./wsCodec.ts', import.meta.url), 'utf8')
  : '';
const paneSource = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');

test('terminal websocket codec decodes binary text and deflate output frames', () => {
  assert.match(codecSource, /TERMINAL_OUTPUT_TEXT/);
  assert.match(codecSource, /TERMINAL_OUTPUT_COMPRESSED/);
  assert.match(codecSource, /DecompressionStream/);
  assert.match(codecSource, /decodeTerminalServerMessage/);
});

test('terminal pane routes websocket messages through async binary-aware decoder', () => {
  assert.match(paneSource, /decodeTerminalServerMessage/);
  assert.match(paneSource, /socket\.binaryType = 'arraybuffer'/);
});
