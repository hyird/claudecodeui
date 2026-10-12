import { randomUUID } from 'node:crypto';
import * as terminalState from './terminal-state.js';
import { encodeTabsServerMessage } from './wire.js';
import { UUID_V4_PATTERN, cleanTerminalTitle, readString } from './terminal-validation.js';
import { WS_OPEN, websocketWritable } from './terminal-output.js';

// `store` persists tab state; it defaults to the SQLite-backed terminal state.
export function createTerminalWorkspaces({ sessions, persistentPty, closeSession, store = terminalState }) {
  const workspaces = new Map();

  function createTab(index) {
    return {
      id: randomUUID(),
      title: `\u7ec8\u7aef ${index}`,
    };
  }

  function createInitialTabsState() {
    const firstTab = createTab(1);
    return {
      tabs: [firstTab],
      activeId: firstTab.id,
      nextIndex: 2,
    };
  }

  function workspaceFor(userId) {
    let workspace = workspaces.get(userId);
    if (!workspace) {
      const saved = store.readTerminalWorkspace(userId);
      const tabsState = saved?.tabsState?.tabs?.length ? saved.tabsState : createInitialTabsState();
      if (!tabsState.tabs.some((tab) => tab.id === tabsState.activeId)) {
        tabsState.activeId = tabsState.tabs[0].id;
      }
      workspace = {
        userId,
        tabsState,
        exitedTabs: new Set(saved?.exitedTabs ?? []),
        tabSubscribers: new Set(),
      };
      workspaces.set(userId, workspace);
      store.saveTerminalWorkspace(workspace);
    }
    return workspace;
  }

  function closeUserWorkspace(userId) {
    const workspace = workspaces.get(userId) || workspaceFor(userId);
    for (const ws of workspace.tabSubscribers) ws.close(4001, 'User removed');
    for (const tab of workspace.tabsState.tabs) closeSession(tab.id, false);
    store.deleteTerminalWorkspace(userId);
    workspaces.delete(userId);
  }

  // Tab order, titles, the active tab and exited tabs are persisted when they change;
  // attach/detach broadcasts only change the derived connection status.
  function persistWorkspace(workspace) {
    store.saveTerminalWorkspace(workspace);
  }

  function getTabStatus(workspace, tabId) {
    const session = sessions.get(tabId);
    if (!session || session.workspace !== workspace) {
      // The persistent service's live ids are cached from its push notifications.
      if (persistentPty.enabled && persistentPty.sessionIds.has(tabId)) {
        return tabId === workspace.tabsState.activeId ? 'disconnected' : 'background';
      }
      return workspace.exitedTabs.has(tabId) ? 'exited' : 'disconnected';
    }

    if (session.closed) {
      return 'exited';
    }

    if (session.socket?.readyState === WS_OPEN) {
      return 'connected';
    }

    // Only the selected pane owns a browser WebSocket. Its PTY keeps running after
    // the pane is unmounted, so an inactive session without a viewer is healthy
    // background work rather than a broken connection.
    return tabId === workspace.tabsState.activeId ? 'disconnected' : 'background';
  }

  function serializeTabsState(workspace) {
    const { tabsState } = workspace;
    return {
      tabs: tabsState.tabs.map((tab) => ({
        ...tab,
        title: cleanTerminalTitle(tab.title) || tab.title,
        status: getTabStatus(workspace, tab.id),
      })),
      activeId: tabsState.activeId,
    };
  }

  function sendTabsState(ws) {
    if (websocketWritable(ws)) {
      if (ws.send(encodeTabsServerMessage({ type: 'tabs', state: serializeTabsState(ws.data.workspace) })) === 0) {
        ws.close(1013, 'Tab state dropped');
      }
    }
  }

  function broadcastTabsState(workspace) {
    const payload = encodeTabsServerMessage({ type: 'tabs', state: serializeTabsState(workspace) });
    for (const ws of workspace.tabSubscribers) {
      if (websocketWritable(ws)) {
        if (ws.send(payload) === 0) ws.close(1013, 'Tab state dropped');
      }
      if (ws.readyState !== WS_OPEN) {
        workspace.tabSubscribers.delete(ws);
      }
    }
  }

  function commitTabsState(workspace) {
    persistWorkspace(workspace);
    broadcastTabsState(workspace);
  }

  function addTab(workspace) {
    const { tabsState } = workspace;
    const tab = createTab(tabsState.nextIndex);
    tabsState.tabs.push(tab);
    tabsState.activeId = tab.id;
    tabsState.nextIndex += 1;
    commitTabsState(workspace);
  }

  function setActiveTab(workspace, activeId) {
    const { tabsState } = workspace;
    if (!UUID_V4_PATTERN.test(activeId) || !tabsState.tabs.some((tab) => tab.id === activeId)) {
      return false;
    }

    if (tabsState.activeId !== activeId) {
      tabsState.activeId = activeId;
      commitTabsState(workspace);
    } else {
      broadcastTabsState(workspace);
    }
    return true;
  }

  function updateTabTitle(workspace, tabId, rawTitle) {
    const { tabsState } = workspace;
    if (!UUID_V4_PATTERN.test(tabId)) {
      return false;
    }

    const title = cleanTerminalTitle(rawTitle);
    if (!title) {
      return false;
    }

    const tab = tabsState.tabs.find((candidate) => candidate.id === tabId);
    if (!tab) {
      return false;
    }

    if (tab.title !== title) {
      tab.title = title;
      commitTabsState(workspace);
    }

    return true;
  }

  function removeTab(workspace, tabId) {
    const { tabsState } = workspace;
    if (!UUID_V4_PATTERN.test(tabId) || tabsState.tabs.length <= 1) {
      return false;
    }

    const closedIndex = tabsState.tabs.findIndex((tab) => tab.id === tabId);
    if (closedIndex < 0) {
      return false;
    }

    tabsState.tabs = tabsState.tabs.filter((tab) => tab.id !== tabId);
    if (tabsState.activeId === tabId) {
      tabsState.activeId = tabsState.tabs[Math.max(0, closedIndex - 1)]?.id ?? tabsState.tabs[0].id;
    }

    workspace.exitedTabs.delete(tabId);
    closeSession(tabId, false);
    commitTabsState(workspace);
    return true;
  }

  function sendTabsError(ws, message) {
    if (websocketWritable(ws)) {
      ws.send(encodeTabsServerMessage({ type: 'error', message }));
    }
  }

  function handleTabsCommand(ws, message) {
    const workspace = ws.data.workspace;
    const { tabsState } = workspace;
    if (message?.type === 'move-tab') {
      const from = tabsState.tabs.findIndex((tab) => tab.id === message.tabId);
      const target = tabsState.tabs.findIndex((tab) => tab.id === message.targetId);
      if (from < 0 || target < 0 || from === target) {
        sendTabsError(ws, 'Invalid tab move');
        return;
      }
      const [tab] = tabsState.tabs.splice(from, 1);
      const insertion = tabsState.tabs.findIndex((item) => item.id === message.targetId);
      tabsState.tabs.splice(insertion + (message.after === true ? 1 : 0), 0, tab);
      commitTabsState(workspace);
      return;
    }
    if (message?.type === 'ping') {
      ws.send(encodeTabsServerMessage({ type: 'pong' }));
      return;
    }

    if (message?.type === 'add-tab') {
      addTab(workspace);
      return;
    }

    if (message?.type === 'set-active') {
      const activeId = readString(message.activeId);
      if (!activeId || !setActiveTab(workspace, activeId)) {
        sendTabsError(ws, 'Invalid active tab');
      }
      return;
    }

    if (message?.type === 'update-title') {
      const tabId = readString(message.tabId);
      if (!tabId || !updateTabTitle(workspace, tabId, message.title)) {
        sendTabsError(ws, 'Invalid tab update');
      }
      return;
    }

    if (message?.type === 'close-tab') {
      const tabId = readString(message.tabId);
      if (!tabId || !removeTab(workspace, tabId)) {
        sendTabsError(ws, 'Invalid tab close');
      }
      return;
    }

    sendTabsError(ws, 'Unknown tabs command');
  }

  return {
    workspaceFor, closeUserWorkspace, sendTabsState, broadcastTabsState, persistWorkspace, handleTabsCommand,
  };
}
