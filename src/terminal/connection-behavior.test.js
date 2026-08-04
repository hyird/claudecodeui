import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const terminalPaneSource = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');
const serverSource = fs.readFileSync(new URL('../../server/index.js', import.meta.url), 'utf8');
const stylesSource = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function extractTerminalStack() {
  const match = source.match(/<section[\s\S]*?className="terminal-stack"[\s\S]*?<\/section>/);
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

test('terminal tabs expose standard semantics and keyboard navigation', () => {
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-orientation="horizontal"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected=\{isActive\}/);
  assert.match(source, /aria-controls="active-terminal-panel"/);
  assert.match(source, /tabIndex=\{isActive \? 0 : -1\}/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /aria-labelledby=\{activeTab \? `terminal-tab-\$\{activeTab\.id\}`/);
  assert.match(source, /event\.key === 'ArrowRight'/);
  assert.match(source, /event\.key === 'ArrowLeft'/);
  assert.match(source, /event\.key === 'Home'/);
  assert.match(source, /event\.key === 'End'/);
  assert.match(source, /selectTab\(nextTabId\)/);
  assert.match(source, /tabButtonRefs\.current\.get\(nextTabId\)\?\.focus\(\)/);
});

test('closing a terminal tab restores focus to the server-selected fallback', () => {
  assert.match(source, /event\.key === 'Delete'/);
  assert.match(source, /pendingTabFocusRef/);
  assert.match(
    source,
    /remainingTabs\[Math\.max\(0, closedIndex - 1\)\]\?\.id \?\? remainingTabs\[0\]\.id/,
  );
  assert.match(source, /tabs\.some\(\(tab\) => tab\.id === pendingFocus\.closedId\)/);
  assert.match(source, /const focusTarget = tabButtonRefs\.current\.get\(pendingFocus\.focusId\)/);
  assert.match(source, /focusTarget\.focus\(\);\s*\n\s*pendingTabFocusRef\.current = null/);
  assert.match(source, /window\.clearTimeout\(titleTimer\)/);
  assert.match(source, /discardTerminalInputState\(tabId\)/);
});

test('inactive live sessions are presented as background work, not disconnections', () => {
  assert.match(serverSource, /return tabId === tabsState\.activeId \? 'disconnected' : 'background'/);
  assert.match(serverSource, /exitedTabs\.has\(tabId\) \? 'exited' : 'disconnected'/);
  assert.match(source, /'background'/);
  assert.match(source, /if \(status === 'background'\) return '后台运行'/);
  assert.match(stylesSource, /\.status-dot\.background/);
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

test('tab controls recover from silently dropped sockets without losing queued mutations', () => {
  assert.match(source, /pendingTabsCommandsRef\.current\.push\(command\)/);
  assert.match(source, /pendingTabsCommandsRef\.current\.unshift\(\.\.\.pendingCommands\.slice\(index\)\)/);
  assert.match(source, /let reconnectAttempts = 0/);
  assert.match(
    source,
    /TABS_RECONNECT_MAX_DELAY_MS,\s*\n\s*TABS_RECONNECT_DELAY_MS \* 2 \*\* reconnectAttempts/,
  );
  assert.match(source, /backoff \/ 2 \+ Math\.random\(\) \* \(backoff \/ 2\)/);
  assert.match(source, /document\.addEventListener\('visibilitychange', probeTabsConnectionAfterResume\)/);
  assert.match(source, /window\.addEventListener\('focus', probeTabsConnectionAfterResume\)/);
  assert.match(source, /encodeTabsClientMessage\(\{ type: 'ping' \}\)/);
  assert.match(
    source,
    /heartbeatTimer = window\.setInterval\(\s*\n\s*\(\) => probeTabsConnection\(TABS_HEARTBEAT_PONG_TIMEOUT_MS\),\s*\n\s*TABS_HEARTBEAT_INTERVAL_MS/,
  );
  assert.match(source, /message\?\.type === 'pong'/);
  assert.match(source, /window\.clearInterval\(heartbeatTimer\)/);
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

test('terminal output uses bounded frames with a 20ms forced send', () => {
  assert.match(serverSource, /TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 \* 1024/);
  assert.match(serverSource, /TERMINAL_OUTPUT_FLUSH_INTERVAL_MS = 20/);
  assert.match(
    serverSource,
    /setTimeout\(\s*\n\s*\(\) => flushTerminalOutput\(session\),\s*\n\s*TERMINAL_OUTPUT_FLUSH_INTERVAL_MS/,
  );
  assert.match(serverSource, /Buffer\.from\(chunk\)/);
});

test('terminal input remains queued until the server acknowledges it', () => {
  assert.match(terminalPaneSource, /TERMINAL_INPUT_MAX_FRAME_BYTES = 4 \* 1024/);
  assert.match(terminalPaneSource, /streamId:\s*createUuidV4\(\)/);
  assert.match(terminalPaneSource, /inputState\.pending\.set\(inputSeq, frame\)/);
  assert.match(terminalPaneSource, /for \(const \[inputSeq, data\] of inputStateRef\.current\.pending\)/);
  assert.match(terminalPaneSource, /type:\s*'input', data, inputSeq/);
  assert.match(terminalPaneSource, /message\.type === 'input-ack'/);
  assert.match(terminalPaneSource, /inputStateRef\.current\.pending\.delete\(inputSeq\)/);
});

test('terminal reset renders only the authoritative server snapshot', () => {
  assert.match(terminalPaneSource, /if \(message\.reset\) \{/);
  assert.match(terminalPaneSource, /terminal\.clear\(\)/);
  assert.equal(terminalPaneSource.includes('Session ${message.sessionId}'), false);
  assert.equal(terminalPaneSource.includes('${message.cwd}'), false);
});
