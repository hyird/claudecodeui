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
