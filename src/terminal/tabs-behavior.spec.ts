import { describe, expect, test } from 'bun:test';
import {
  createHarness, emitServerMessage, findElements, flushMicrotasks, loadLoop, loadModule, runEffect,
  sentMessagesOfType, type Harness, type VNode,
} from './test-support/component-harness';
import type { TerminalTab, TerminalTabsState } from './types';
import type { TerminalTabsController } from './use-terminal-tabs';

const TAB_A = '00000000-0000-4000-8000-00000000000a';
const TAB_B = '00000000-0000-4000-8000-00000000000b';
const TAB_C = '00000000-0000-4000-8000-00000000000c';

type TabsCall = [name: string, ...args: unknown[]];

// TerminalTabs is a pure view over the controller, so a stub controller lets the
// strip's rendered semantics and keyboard handling be checked directly.
function renderTabStrip(tabs: TerminalTab[], activeId: string) {
  const harness = createHarness();
  const TerminalTabs = loadModule(new URL('./TerminalTabs.tsx', import.meta.url), harness).default as (
    props: { controller: TerminalTabsController },
  ) => unknown;
  const calls: TabsCall[] = [];
  const tabsState: TerminalTabsState = { tabs, activeId };
  const controller = {
    tabsState,
    tabsStateRef: { current: tabsState },
    activeTab: tabs.find((tab) => tab.id === activeId),
    draggedTabRef: { current: null },
    pendingTabFocusRef: { current: null },
    pendingKeyboardTabFocusRef: { current: null as string | null },
    selectTab: (tabId: string) => { calls.push(['selectTab', tabId]); },
    moveTab: (tabId: string, targetId: string, after: boolean) => { calls.push(['moveTab', tabId, targetId, after]); },
    closeTab: (tabId: string) => { calls.push(['closeTab', tabId]); },
  } as unknown as TerminalTabsController; // stub: only the members TerminalTabs reads
  const tree = TerminalTabs({ controller });
  const buttons = findElements(tree, (element) => element.props.role === 'tab');
  return { tree, buttons, calls, controller };
}

function pressKey(button: VNode, key: string, modifiers: { altKey?: boolean; shiftKey?: boolean } = {}) {
  let prevented = false;
  const onKeyDown = button.props.onKeyDown as (event: unknown) => void;
  onKeyDown({ key, altKey: false, shiftKey: false, ...modifiers, preventDefault() { prevented = true; } });
  return prevented;
}

const threeTabs: TerminalTab[] = [
  { id: TAB_A, title: 'build', status: 'connected' },
  { id: TAB_B, title: 'logs', status: 'background' },
  { id: TAB_C, title: 'shell', status: 'exited' },
];

describe('terminal tab strip', () => {
  test('exposes tablist semantics with one focusable selected tab', () => {
    const { tree, buttons } = renderTabStrip(threeTabs, TAB_B);
    const [tablist] = findElements(tree, (element) => element.props.role === 'tablist');
    expect(tablist.props['aria-orientation']).toBe('horizontal');

    expect(buttons.map((button) => ({
      id: button.props.id,
      selected: button.props['aria-selected'],
      tabIndex: button.props.tabIndex,
      controls: button.props['aria-controls'],
      label: button.props['aria-label'],
    }))).toEqual([
      { id: `terminal-tab-${TAB_A}`, selected: false, tabIndex: -1, controls: 'active-terminal-panel', label: 'build，已连接' },
      { id: `terminal-tab-${TAB_B}`, selected: true, tabIndex: 0, controls: 'active-terminal-panel', label: 'logs，后台运行' },
      { id: `terminal-tab-${TAB_C}`, selected: false, tabIndex: -1, controls: 'active-terminal-panel', label: 'shell，已退出' },
    ]);
  });

  test('arrow, Home and End keys move selection with wrap-around and request focus', () => {
    const cases: Array<[from: number, key: string, to: string]> = [
      [1, 'ArrowRight', TAB_C],
      [2, 'ArrowRight', TAB_A],
      [0, 'ArrowLeft', TAB_C],
      [2, 'Home', TAB_A],
      [0, 'End', TAB_C],
    ];
    for (const [from, key, to] of cases) {
      const { buttons, calls, controller } = renderTabStrip(threeTabs, threeTabs[from].id);
      expect(pressKey(buttons[from], key)).toBe(true);
      expect(calls).toEqual([['selectTab', to]]);
      expect(controller.pendingKeyboardTabFocusRef.current).toBe(to);
    }
  });

  test('Delete closes the focused tab and Alt+Shift+Arrow reorders it', () => {
    const { buttons, calls } = renderTabStrip(threeTabs, TAB_B);
    expect(pressKey(buttons[1], 'Delete')).toBe(true);
    expect(pressKey(buttons[1], 'ArrowRight', { altKey: true, shiftKey: true })).toBe(true);
    expect(pressKey(buttons[1], 'ArrowLeft', { altKey: true, shiftKey: true })).toBe(true);
    expect(pressKey(buttons[2], 'ArrowRight', { altKey: true, shiftKey: true })).toBe(true);
    expect(calls).toEqual([
      ['closeTab', TAB_B],
      ['moveTab', TAB_B, TAB_C, true],
      ['moveTab', TAB_B, TAB_A, false],
    ]);
  });

  test('other keys and a lone tab are left to the browser', () => {
    const many = renderTabStrip(threeTabs, TAB_A);
    expect(pressKey(many.buttons[0], 'a')).toBe(false);
    const single = renderTabStrip([threeTabs[0]], TAB_A);
    expect(pressKey(single.buttons[0], 'Delete')).toBe(false);
    expect([...many.calls, ...single.calls]).toEqual([]);
  });
});

function tabsController(rendered: unknown) {
  const [strip] = findElements(rendered, (element) => 'controller' in element.props);
  return strip.props.controller as TerminalTabsController;
}

function latestTabsState(harness: Harness) {
  return harness.stateUpdates.findLast((value): value is TerminalTabsState => (
    typeof value === 'object' && value !== null && 'tabs' in value
  ));
}

function broadcastTabs(harness: Harness, tabs: Array<Pick<TerminalTab, 'id' | 'title'>>) {
  emitServerMessage(harness, harness.sockets[0], {
    type: 'tabs',
    state: { tabs: tabs.map((tab) => ({ ...tab, status: 'connected' })), activeId: tabs[0].id },
  });
}

describe('terminal tabs controller', () => {
  test('mutations issued while the tabs socket is down are sent once it opens', () => {
    const harness = createHarness();
    const { cleanup, rendered } = loadLoop('tabs', harness);
    const controller = tabsController(rendered);
    const socket = harness.sockets[0];

    controller.addTab();
    controller.selectTab(TAB_B);
    expect(socket.sent).toEqual([]);
    socket.open();

    expect(sentMessagesOfType(socket, 'add-tab')).toHaveLength(1);
    expect(sentMessagesOfType(socket, 'set-active')).toEqual([{ type: 'set-active', activeId: TAB_B }]);
    cleanup();
  });

  test('closing the active tab hands focus to its left neighbour', () => {
    const harness = createHarness();
    const { cleanup, rendered } = loadLoop('tabs', harness);
    const controller = tabsController(rendered);
    harness.sockets[0].open();
    controller.tabsStateRef.current = { tabs: threeTabs, activeId: TAB_B };

    controller.closeTab(TAB_B);
    expect(controller.pendingTabFocusRef.current).toEqual({ closedId: TAB_B, focusId: TAB_A });
    controller.closeTab(TAB_A);
    expect(controller.pendingTabFocusRef.current).toEqual({ closedId: TAB_A, focusId: TAB_B });
    expect(sentMessagesOfType(harness.sockets[0], 'close-tab').map((message) => message.tabId)).toEqual([TAB_B, TAB_A]);

    controller.tabsStateRef.current = { tabs: [threeTabs[0]], activeId: TAB_A };
    controller.closeTab(TAB_A);
    expect(sentMessagesOfType(harness.sockets[0], 'close-tab')).toHaveLength(2);
    cleanup();
  });

  test('terminal titles lose spinner prefixes and sync with a leading and a trailing update', () => {
    const harness = createHarness();
    const { cleanup, rendered } = loadLoop('tabs', harness);
    const controller = tabsController(rendered);
    const socket = harness.sockets[0];
    socket.open();
    const titles = () => sentMessagesOfType(socket, 'update-title').map((message) => message.title);

    controller.updateTabTitle(TAB_A, '\u280b\u2819 npm run build');
    expect(titles()).toEqual(['npm run build']);
    controller.updateTabTitle(TAB_A, 'step 2');
    controller.updateTabTitle(TAB_A, 'step 3');
    expect(titles()).toEqual(['npm run build']);
    harness.clock.advance(500);
    expect(titles()).toEqual(['npm run build', 'step 3']);
    cleanup();
  });

  test('a pending title survives a stale broadcast and is flushed on pagehide', async () => {
    const harness = createHarness();
    const { cleanup, rendered } = loadLoop('tabs', harness);
    const cleanupPageHide = runEffect(harness, 'pagehide');
    const controller = tabsController(rendered);
    const socket = harness.sockets[0];
    socket.open();

    controller.updateTabTitle(TAB_A, 'first');
    controller.updateTabTitle(TAB_A, 'latest');
    broadcastTabs(harness, [{ id: TAB_A, title: 'stale' }]);
    await flushMicrotasks();
    expect(latestTabsState(harness)?.tabs[0].title).toBe('latest');

    harness.window.dispatch('pagehide');
    expect(sentMessagesOfType(socket, 'update-title').map((message) => message.title)).toEqual(['first', 'latest']);

    // Once the server echoes the title back, later broadcasts win again.
    broadcastTabs(harness, [{ id: TAB_A, title: 'latest' }]);
    broadcastTabs(harness, [{ id: TAB_A, title: '\u280b renamed' }]);
    await flushMicrotasks();
    expect(latestTabsState(harness)?.tabs[0].title).toBe('renamed');
    cleanupPageHide();
    cleanup();
  });
});
