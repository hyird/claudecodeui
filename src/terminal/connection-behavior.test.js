import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('only the active terminal pane is mounted to avoid websocket bursts on login', () => {
  assert.match(source, /activeTab && \(/);
  assert.match(source, /key=\{activeTab\.id\}/);
  assert.match(source, /tab=\{activeTab\}/);
  assert.equal(source.includes('{tabs.map((tab) => ('), false);
});

test('tab mutations use the tabs websocket instead of HTTP mutation endpoints', () => {
  assert.match(source, /tabsSocketRef/);
  assert.match(source, /sendTabsCommand/);
  assert.match(source, /type:\s*'add-tab'/);
  assert.match(source, /type:\s*'set-active'/);
  assert.match(source, /type:\s*'restart-tab'/);
  assert.match(source, /type:\s*'close-tab'/);
  assert.equal(source.includes("sendTabsMutation('/api/terminal/tabs'"), false);
  assert.equal(source.includes('/api/terminal/tabs/active'), false);
  assert.equal(source.includes('/api/terminal/tabs/${encodeURIComponent'), false);
});
