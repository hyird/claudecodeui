import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const terminalPaneSource = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');

function extractTerminalStack() {
  const match = source.match(/<section className="terminal-stack">[\s\S]*?<\/section>/);
  assert.ok(match, 'Could not find terminal stack');
  return match[0];
}

test('only the active terminal pane is mounted to avoid websocket bursts on login', () => {
  const terminalStack = extractTerminalStack();

  assert.match(terminalStack, /activeTab && \(/);
  assert.match(terminalStack, /key=\{activeTab\.id\}/);
  assert.match(terminalStack, /tab=\{activeTab\}/);
  assert.equal(terminalStack.includes('tabs.map'), false);
});

test('tab mutations use the tabs websocket instead of HTTP mutation endpoints', () => {
  assert.match(source, /tabsSocketRef/);
  assert.match(source, /sendTabsCommand/);
  assert.match(source, /type:\s*'add-tab'/);
  assert.match(source, /type:\s*'set-active'/);
  assert.match(source, /type:\s*'close-tab'/);
  assert.equal(source.includes("sendTabsMutation('/api/terminal/tabs'"), false);
  assert.equal(source.includes('/api/terminal/tabs/active'), false);
  assert.equal(source.includes('/api/terminal/tabs/${encodeURIComponent'), false);
});

test('toolbar does not remount or restart the active terminal session', () => {
  assert.match(extractTerminalStack(), /key=\{activeTab\.id\}/);
  assert.equal(source.includes('reconnectKeys'), false);
  assert.equal(source.includes('activeReconnectKey'), false);
  assert.equal(source.includes('reconnectActiveTab'), false);
  assert.equal(source.includes("type: 'restart-tab'"), false);
  assert.equal(source.includes('restartActiveTab'), false);
});

test('terminal pane reconnects its websocket after sleep or disconnect', () => {
  assert.match(terminalPaneSource, /let reconnectTimer = 0/);
  assert.match(terminalPaneSource, /reconnectTimer = window\.setTimeout\(connect, TERMINAL_RECONNECT_DELAY_MS\)/);
  assert.match(terminalPaneSource, /document\.addEventListener\('visibilitychange', probeConnectionAfterResume\)/);
  assert.match(terminalPaneSource, /window\.addEventListener\('focus', probeConnectionAfterResume\)/);
  assert.match(terminalPaneSource, /type: 'ping'/);
});
