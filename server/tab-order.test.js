import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { cloudcli } from '../proto/messages.js';
import { createTerminalWorkspaces, displayTabTitle } from './terminal-workspaces.js';

test('tab titles abbreviate the home directory without changing other paths or titles', () => {
  assert.equal(displayTabTitle('/home/user', '/home/user', path.posix), '~/');
  assert.equal(displayTabTitle('/home/user/project/nested', '/home/user', path.posix), '~/project/nested');
  assert.equal(displayTabTitle('/home/username/project', '/home/user', path.posix), '/home/username/project');
  assert.equal(displayTabTitle('~/project', '/home/user', path.posix), '~/project');
  assert.equal(displayTabTitle('build', '/home/user', path.posix), 'build');
  assert.equal(displayTabTitle('C:\\Users\\User\\project', 'C:\\Users\\User', path.win32), '~/project');
  assert.equal(displayTabTitle('D:\\project', 'C:\\Users\\User', path.win32), 'D:\\project');
});

const disabledPty = { enabled: false, sessionIds: new Set() };

function tabsSocket(workspace) {
  return {
    readyState: 1, data: { workspace }, messages: [], getBufferedAmount: () => 0,
    send(bytes) { this.messages.push(cloudcli.TabsServerMessage.decode(bytes)); return bytes.length; },
    close(code) { this.closedCode = code; this.readyState = 3; },
  };
}

function setup({ persistentPty = disabledPty, sessions = new Map() } = {}) {
  const stored = new Map();
  const saves = [];
  const store = {
    readTerminalWorkspace: (userId) => stored.get(userId) ?? null,
    saveTerminalWorkspace: (workspace) => { saves.push(workspace.tabsState.tabs.map((tab) => tab.id)); },
    deleteTerminalWorkspace: (userId) => stored.delete(userId),
  };
  stored.set(1, { tabsState: { tabs: ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id })), activeId: 'b', nextIndex: 5 }, exitedTabs: [] });
  stored.set(2, { tabsState: { tabs: ['x', 'y', 'z'].map((id) => ({ id, title: id })), activeId: 'x', nextIndex: 4 }, exitedTabs: [] });
  const workspaces = createTerminalWorkspaces({ sessions, persistentPty, store, closeSession: () => false });
  const workspace = workspaces.workspaceFor(1);
  const viewer = tabsSocket(workspace);
  workspace.tabSubscribers.add(viewer);
  saves.length = 0;
  const command = (targetWorkspace, message, ws = tabsSocket(targetWorkspace)) => {
    workspaces.handleTabsCommand(ws, message);
    return ws;
  };
  const broadcasts = () => viewer.messages.filter((m) => m.body === 'tabs').map((m) => m.tabs.tabs.map((tab) => tab.id));
  const errors = (ws) => ws.messages.filter((m) => m.body === 'error').map((m) => m.error.message);
  return {
    workspaces, workspace, tabsState: workspace.tabsState, viewer, saves, broadcasts, errors, command,
    move: (tabId, targetId, after) => command(workspace, { type: 'move-tab', tabId, targetId, after }),
  };
}

test('broadcasts display a home-relative title while keeping the session directory absolute', () => {
  const sessions = new Map();
  const h = setup({ sessions });
  const tabId = randomUUID();
  const cwd = path.join(os.homedir(), 'project');
  h.tabsState.tabs = [{ id: tabId, title: 'terminal' }];
  h.tabsState.activeId = tabId;
  sessions.set(tabId, { cwd, workspace: h.workspace });
  h.workspaces.updateTabTitle(h.workspace, tabId, cwd);
  assert.equal(h.viewer.messages.at(-1).tabs.tabs[0].title, '~/project');
  assert.equal(sessions.get(tabId).cwd, cwd);
  assert.equal(h.tabsState.tabs[0].title, cwd);
});

test('tab move inserts on either side without changing the active terminal or tab objects', () => {
  const state = setup();
  const active = state.tabsState.tabs[1];
  state.move('a', 'c', true);
  assert.deepEqual(state.broadcasts().at(-1), ['b', 'c', 'a', 'd']);
  state.move('d', 'b', false);
  assert.deepEqual(state.broadcasts().at(-1), ['d', 'b', 'c', 'a']);
  assert.equal(state.tabsState.activeId, 'b');
  assert.equal(state.tabsState.tabs[1], active);
  assert.deepEqual(state.saves, [['b', 'c', 'a', 'd'], ['d', 'b', 'c', 'a']]);
});

test('duplicate move delivery is idempotent and unrelated concurrent additions survive', () => {
  const state = setup();
  state.move('a', 'c', true);
  state.tabsState.tabs.push({ id: 'new', title: 'new' });
  state.move('a', 'c', true);
  assert.deepEqual(state.broadcasts().at(-1), ['b', 'c', 'a', 'd', 'new']);
});

test('missing, closed and self-targeted tabs cannot corrupt the order', () => {
  const state = setup();
  const sockets = [
    state.move('missing', 'a', true),
    state.move('a', 'closed', true),
    state.move('a', 'a', false),
  ];
  assert.deepEqual(sockets.flatMap(state.errors), ['Invalid tab move', 'Invalid tab move', 'Invalid tab move']);
  assert.equal(state.broadcasts().length, 0);
  assert.equal(state.saves.length, 0);
  assert.deepEqual(state.tabsState.tabs.map((tab) => tab.id), ['a', 'b', 'c', 'd']);
});

test('tab moves affect only the authenticated user workspace', () => {
  const state = setup();
  const other = state.workspaces.workspaceFor(2);
  state.command(other, { type: 'move-tab', tabId: 'x', targetId: 'z', after: true });
  assert.deepEqual(other.tabsState.tabs.map((tab) => tab.id), ['y', 'z', 'x']);
  assert.deepEqual(state.tabsState.tabs.map((tab) => tab.id), ['a', 'b', 'c', 'd']);
  state.move('a', 'c', true);
  assert.deepEqual(other.tabsState.tabs.map((tab) => tab.id), ['y', 'z', 'x']);
});

test('tab broadcasts disconnect a slow subscriber without delaying healthy viewers', () => {
  const state = setup();
  const slow = {
    readyState: 1,
    getBufferedAmount: () => 1024 * 1024 + 1,
    send() { throw new Error('slow socket must not receive more frames'); },
    close(code) { this.readyState = 3; this.closedCode = code; },
  };
  state.workspace.tabSubscribers.add(slow);
  state.workspaces.broadcastTabsState(state.workspace);
  assert.equal(slow.closedCode, 1013);
  assert.equal(state.workspace.tabSubscribers.has(slow), false);
  assert.equal(state.broadcasts().length, 1);
});

test('status-only broadcasts are not persisted while tab changes are', () => {
  const state = setup();
  state.workspaces.broadcastTabsState(state.workspace);
  assert.equal(state.saves.length, 0);
  state.command(state.workspace, { type: 'add-tab' });
  assert.equal(state.saves.length, 1);
  const added = state.tabsState.tabs.at(-1).id;
  state.command(state.workspace, { type: 'update-title', tabId: added, title: 'same' });
  state.command(state.workspace, { type: 'update-title', tabId: added, title: 'same' });
  assert.equal(state.saves.length, 2);
});

test('persistent sessions without a viewer report background from the cached service ids', () => {
  const active = randomUUID();
  const inactive = randomUUID();
  const gone = randomUUID();
  const state = setup({ persistentPty: { enabled: true, sessionIds: new Set([active, inactive]) } });
  state.tabsState.tabs = [active, inactive, gone].map((id) => ({ id, title: id }));
  state.tabsState.activeId = active;
  state.workspace.exitedTabs.add(gone);
  state.workspaces.broadcastTabsState(state.workspace);
  const [message] = state.viewer.messages;
  assert.deepEqual(message.tabs.tabs.map((tab) => tab.status), ['disconnected', 'background', 'exited']);
});
