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
  assert.match(terminalPaneSource, /reconnectTimer = window\.setTimeout\(connect, delay\)/);
  assert.match(terminalPaneSource, /document\.addEventListener\('visibilitychange', probeConnectionAfterResume\)/);
  assert.match(terminalPaneSource, /window\.addEventListener\('focus', probeConnectionAfterResume\)/);
  assert.match(terminalPaneSource, /type: 'ping'/);
});

test('terminal reconnect uses capped exponential backoff with jitter', () => {
  // A flaky network must be retried gently, not hammered at a fixed 1s interval.
  assert.match(terminalPaneSource, /let reconnectAttempts = 0/);
  assert.match(
    terminalPaneSource,
    /TERMINAL_RECONNECT_MAX_DELAY_MS,\s*\n\s*TERMINAL_RECONNECT_DELAY_MS \* 2 \*\* reconnectAttempts/,
  );
  assert.match(terminalPaneSource, /reconnectAttempts \+= 1/);
  assert.match(terminalPaneSource, /backoff \/ 2 \+ Math\.random\(\) \* \(backoff \/ 2\)/);
  // Backoff resets on a healthy transport and when the user returns to the tab.
  assert.match(terminalPaneSource, /reconnectAttempts = 0;\s*\n\s*\/\/ Size the grid/);
  assert.match(terminalPaneSource, /reconnectAttempts = 0;\s*\n\s*probeConnection\(TERMINAL_RESUME_PONG_TIMEOUT_MS\)/);
});

test('terminal keeps a visible-tab heartbeat to detect silently dropped sockets', () => {
  // Weak/mobile networks can drop a socket without a close event; a passive ping
  // keeps liveness detection working while the tab stays open.
  assert.match(terminalPaneSource, /let heartbeatTimer = 0/);
  assert.match(
    terminalPaneSource,
    /heartbeatTimer = window\.setInterval\(\s*\n\s*\(\) => probeConnection\(TERMINAL_HEARTBEAT_PONG_TIMEOUT_MS\),\s*\n\s*TERMINAL_HEARTBEAT_INTERVAL_MS,/,
  );
  // The heartbeat pong window is more tolerant than the resume probe so high latency
  // is not mistaken for a dead connection.
  assert.match(terminalPaneSource, /const TERMINAL_HEARTBEAT_PONG_TIMEOUT_MS = 8000/);
  assert.match(terminalPaneSource, /const TERMINAL_HEARTBEAT_INTERVAL_MS = 20000/);
  // The interval is torn down with the pane.
  assert.match(terminalPaneSource, /window\.clearInterval\(heartbeatTimer\)/);
});
