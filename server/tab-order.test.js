import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const handler = source.match(/function handleTabsCommand\(ws, message\) \{[^]*?\n\}/)[0];

function setup() {
  const tabsState = { tabs: ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id })), activeId: 'b' };
  const workspace = { tabsState };
  const broadcasts = [];
  const errors = [];
  const context = vm.createContext({
    tabsState,
    broadcastTabsState: () => broadcasts.push(tabsState.tabs.map((tab) => tab.id)),
    sendTabsError: (_, message) => errors.push(message),
  });
  vm.runInContext(handler, context);
  const command = (targetWorkspace, message) => context.handleTabsCommand({ data: { workspace: targetWorkspace } }, message);
  return { tabsState, workspace, broadcasts, errors, command, move: (tabId, targetId, after) => command(workspace, { type: 'move-tab', tabId, targetId, after }) };
}

test('tab move inserts on either side without changing the active terminal or tab objects', () => {
  const state = setup();
  const active = state.tabsState.tabs[1];
  state.move('a', 'c', true);
  assert.deepEqual(state.broadcasts.at(-1), ['b', 'c', 'a', 'd']);
  state.move('d', 'b', false);
  assert.deepEqual(state.broadcasts.at(-1), ['d', 'b', 'c', 'a']);
  assert.equal(state.tabsState.activeId, 'b');
  assert.equal(state.tabsState.tabs[1], active);
});

test('duplicate move delivery is idempotent and unrelated concurrent additions survive', () => {
  const state = setup();
  state.move('a', 'c', true);
  state.tabsState.tabs.push({ id: 'new', title: 'new' });
  state.move('a', 'c', true);
  assert.deepEqual(state.broadcasts.at(-1), ['b', 'c', 'a', 'd', 'new']);
});

test('missing, closed and self-targeted tabs cannot corrupt the order', () => {
  const state = setup();
  state.move('missing', 'a', true);
  state.move('a', 'closed', true);
  state.move('a', 'a', false);
  assert.equal(state.errors.length, 3);
  assert.equal(state.broadcasts.length, 0);
  assert.deepEqual(state.tabsState.tabs.map((tab) => tab.id), ['a', 'b', 'c', 'd']);
});

test('tab moves affect only the authenticated user workspace', () => {
  const state = setup();
  const other = {
    tabsState: { tabs: ['x', 'y', 'z'].map((id) => ({ id, title: id })), activeId: 'x' },
  };
  state.command(other, { type: 'move-tab', tabId: 'x', targetId: 'z', after: true });
  assert.deepEqual(other.tabsState.tabs.map((tab) => tab.id), ['y', 'z', 'x']);
  assert.deepEqual(state.tabsState.tabs.map((tab) => tab.id), ['a', 'b', 'c', 'd']);
  state.move('a', 'c', true);
  assert.deepEqual(other.tabsState.tabs.map((tab) => tab.id), ['y', 'z', 'x']);
});
