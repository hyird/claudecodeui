import assert from 'node:assert/strict';
import { readTerminalSource, readAppSource } from './test-support/read-source.js';
import { readServerSource } from '../../server/test-support/read-source.js';
import fs from 'node:fs';
import { test } from 'node:test';

const source = readAppSource();
const terminalPaneSource = readTerminalSource();
const serverSource = readServerSource();
const stylesSource = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function extractTerminalStack() {
  const match = source.match(/<section[\s\S]*?className="terminal-stack"[\s\S]*?<\/section>/);
  assert.ok(match, 'Could not find terminal stack');
  return match[0];
}

test('each terminal tab keeps its own mounted pane and independent connection pair', () => {
  const terminalStack = extractTerminalStack();

  assert.match(terminalStack, /tabsController.tabsState.tabs.map\(\(tab\) => \(/);
  assert.match(terminalStack, /key=\{tab.id\}/);
  assert.match(terminalStack, /tab=\{tab\}/);
  assert.match(terminalStack, /active=\{tab.id === activeTab\?\.id\}/);
  assert.match(terminalPaneSource, /const connectionRef = useRef<TerminalConnection \| null>\(null\)/);
});

test('terminal tabs expose standard semantics and keyboard navigation', () => {
  assert.match(source, /role="tablist"/);
  assert.match(source, /aria-orientation="horizontal"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected=\{isActive\}/);
  assert.match(source, /aria-label=\{`\$\{tab\.title\}，\$\{statusLabel\(tab\.status\)\}`\}/);
  assert.match(source, /aria-controls="active-terminal-panel"/);
  assert.match(source, /tabIndex=\{isActive \? 0 : -1\}/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /aria-labelledby=\{activeTab \? `terminal-tab-\$\{activeTab\.id\}`/);
  assert.match(source, /event\.key === 'ArrowRight'/);
  assert.match(source, /event\.key === 'ArrowLeft'/);
  assert.match(source, /event\.key === 'Home'/);
  assert.match(source, /event\.key === 'End'/);
  assert.match(source, /selectTab\(nextTabId\)/);
  assert.match(source, /pendingKeyboardTabFocusRef\.current = nextTabId/);
  assert.match(source, /tabButtonRefs\.current\.get\(pendingFocusId\)\?\.focus\(\)/);
});

test('tabs can be reordered by pointer drag without using HTML5 draggable', () => {
  assert.match(source, /type: 'move-tab'/);
  assert.match(source, /data-tab-id=\{tab.id\}/);
  assert.match(source, /handleTabPointerDown/);
  assert.match(source, /onPointerDown=\{\(event\) => handleTabPointerDown\(event, tab.id\)\}/);
  assert.match(source, /suppressTabClickRef/);
  assert.match(source, /draggedTabRef\.current/);
  assert.match(source, /event\.altKey && event\.shiftKey && \(event\.key === 'ArrowLeft' \|\| event\.key === 'ArrowRight'\)/);
  assert.match(serverSource, /message\?\.type === 'move-tab'/);
  assert.match(stylesSource, /\.tab\.dragging \{[^}]*pointer-events:\s*none/);
  assert.equal(source.includes('draggable={'), false);
  assert.equal(source.includes('onDragStart'), false);
  assert.equal(source.includes('onDrop='), false);
});

test('keyboard tab navigation cannot race with terminal autofocus', () => {
  assert.match(source, /focusOnMount=\{[\s\S]*?pendingKeyboardTabFocusRef\.current !== tab\.id/);
  assert.match(terminalPaneSource, /const focusOnMountRef = useRef\(focusOnMount\)/);
  assert.match(
    terminalPaneSource,
    /if \(focusOnMountRef\.current\) \{\s*terminalRef\.current\?\.focus\(\)/,
  );
});

test('the active terminal tab stays visible inside an overflowing tab strip', () => {
  assert.match(source, /useLayoutEffect/);
  assert.match(source, /tabButtonRefs\.current\s*\.get\(activeTab\.id\)/);
  assert.match(source, /\.closest<HTMLElement>\('\.tab'\)/);
  assert.match(source, /tab\?\.closest<HTMLElement>\('\.tabs'\)/);
  assert.match(source, /strip\.scrollLeft/);
  assert.equal(source.includes('scrollIntoView({'), false);
});

test('terminal settings dialog receives focus and is linked to its trigger', () => {
  assert.match(source, /id="terminal-settings-dialog"/);
  assert.match(source, /aria-controls="terminal-settings-dialog"/);
  assert.match(source, /settingsPanelRef\.current\?\.querySelector<HTMLButtonElement>/);
  assert.match(source, /'button:not\(:disabled\)'/);
  assert.match(source, /firstSettingsControl\?\.focus\(\)/);
  assert.match(source, /settingsButtonRef\.current\?\.focus\(\)/);
});

test('changing terminal font size does not steal focus from settings', () => {
  const preferencesEffect = terminalPaneSource.match(
    /useEffect\(\(\) => \{[\s\S]*?terminal\.options\.fontSize[\s\S]*?\}, \[active, preferences\.fontSize, resizeAfterLayoutSettles\]\);/,
  );
  assert.ok(preferencesEffect, 'Could not find terminal preference effect');
  assert.equal(preferencesEffect[0].includes('terminal.focus()'), false);
  assert.match(terminalPaneSource, /terminalRef\.current\?\.focus\(\)/);
});

test('mobile terminal controls expose practical touch targets', () => {
  const mobileStyles = stylesSource.slice(stylesSource.indexOf('@media (max-width: 720px)'));
  assert.match(mobileStyles, /\.icon-button \{\s*width:\s*40px;\s*height:\s*40px;/);
  assert.match(mobileStyles, /\.tab \{[\s\S]*?height:\s*40px;/);
  assert.match(mobileStyles, /\.tab-close \{\s*width:\s*32px;\s*height:\s*32px;/);
  assert.match(mobileStyles, /\.font-stepper \{\s*height:\s*42px;/);
  assert.match(mobileStyles, /\.step-button \{\s*width:\s*40px;\s*height:\s*40px;/);
});

test('hidden tab close controls let pointer input reach the tab underneath', () => {
  assert.match(stylesSource, /\.tab-main \{[\s\S]*?width:\s*100%;/);
  assert.match(stylesSource, /\.tab-close \{[\s\S]*?position:\s*absolute;/);
  assert.match(stylesSource, /\.tab-close \{[\s\S]*?pointer-events:\s*none;/);
  assert.match(
    stylesSource,
    /\.tab\.active \.tab-close,[\s\S]*?\.tab-close:focus-visible \{[\s\S]*?pointer-events:\s*auto;/,
  );
  assert.match(
    stylesSource,
    /@media \(hover: hover\) and \(pointer: fine\) \{\s*\.tab:hover \.tab-close \{\s*opacity:\s*1;\s*pointer-events:\s*auto;/,
  );
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
  assert.match(serverSource, /return tabId === workspace\.tabsState\.activeId \? 'disconnected' : 'background'/);
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
  assert.match(source, /type:\s*'move-tab'/);
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
  assert.match(extractTerminalStack(), /key=\{tab\.id\}/);
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
  const resumeHandler = terminalPaneSource.match(/const probeConnectionAfterResume = \(\) => \{[\s\S]*?\n    \};/)?.[0];
  assert.ok(resumeHandler, 'terminal resume handler must exist');
  assert.match(resumeHandler, /reconnectAttempts = 0;/);
  assert.match(resumeHandler, /clearReconnectTimer\(\);\s*connect\(\);/);
  assert.match(resumeHandler, /probeConnection\(TERMINAL_RESUME_PONG_TIMEOUT_MS\)/);
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

test('terminal output coalesces only the current delivery into bounded frames', () => {
  assert.match(serverSource, /TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 \* 1024/);
  assert.match(serverSource, /setImmediate\(\(\) => \{/);
  assert.match(serverSource, /session.outputFlushTask !== task \|\| session.disposed/);
  assert.equal(serverSource.includes('TERMINAL_OUTPUT_FLUSH_INTERVAL_MS'), false);
  assert.match(serverSource, /Buffer\.from\(chunk\)/);
});

test('terminal input remains queued until the server acknowledges it', () => {
  assert.match(terminalPaneSource, /TERMINAL_INPUT_MAX_FRAME_BYTES = 4 \* 1024/);
  assert.match(terminalPaneSource, /streamId:\s*createUuidV4\(\)/);
  assert.match(terminalPaneSource, /inputState\.pending\.set\(inputSeq, frame\)/);
  assert.match(terminalPaneSource, /for \(const \[inputSeq, data\] of inputState\.pending\)/);
  assert.match(terminalPaneSource, /type:\s*'input', data, inputSeq/);
  assert.match(terminalPaneSource, /message\.type === 'input-ack'/);
  assert.match(terminalPaneSource, /inputState\.pending\.delete\(inputSeq\)/);
});

test('terminal reset renders only the authoritative server snapshot', () => {
  assert.match(terminalPaneSource, /if \(message\.reset\) \{/);
  assert.match(terminalPaneSource, /terminal\.write\(`\\x1bc\\x1b\[\?2026h\$\{message\.data\}\\x1b\[\?2026l`/);
  assert.equal(terminalPaneSource.includes('Session ${message.sessionId}'), false);
  assert.equal(terminalPaneSource.includes('${message.cwd}'), false);
});
