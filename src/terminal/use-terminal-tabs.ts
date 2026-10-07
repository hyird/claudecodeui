import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TerminalStatus, TerminalTab, TerminalTabsState } from './types';
import { clearTerminalInputStates, discardTerminalInputState } from './input-state';
import { decodeTabsServerMessage, encodeTabsClientMessage } from './wsCodec';
import { openAuthenticatedSocket } from '../wsHost';

const TITLE_SYNC_DELAY_MS = 500;
const TABS_RECONNECT_DELAY_MS = 1000;
const TABS_RECONNECT_MAX_DELAY_MS = 15000;
const TABS_CONNECT_TIMEOUT_MS = 10000;
const TABS_RESUME_PONG_TIMEOUT_MS = 2500;
const TABS_HEARTBEAT_INTERVAL_MS = 20000;
const TABS_HEARTBEAT_PONG_TIMEOUT_MS = 8000;
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SPINNER_TITLE_PREFIX = /^[\u2800-\u28ff]+[\s:·.-]*/u;
const EMPTY_TABS_STATE: TerminalTabsState = {
  tabs: [],
  activeId: '',
};
const TERMINAL_STATUSES = new Set<string>([
  'connecting',
  'connected',
  'background',
  'disconnected',
  'exited',
  'error',
]);


type TabsClientCommand =
  | { type: 'move-tab'; tabId: string; targetId: string; after: boolean }
  | { type: 'add-tab' }
  | { type: 'set-active'; activeId: string }
  | { type: 'update-title'; tabId: string; title: string }
  | { type: 'close-tab'; tabId: string };

function createTabsSocket(authToken: string) {
  return openAuthenticatedSocket('/terminal/tabs', authToken);
}

function isTerminalStatus(value: unknown): value is TerminalStatus {
  return typeof value === 'string' && TERMINAL_STATUSES.has(value);
}

function normalizeTabsState(value: unknown): TerminalTabsState {
  const raw = value as Partial<TerminalTabsState>;
  const rawTabs = Array.isArray(raw?.tabs) ? (raw.tabs as unknown[]) : [];
  const tabs = rawTabs.length > 0
    ? rawTabs
        .filter((tab): tab is Partial<TerminalTab> & { id: string; title: string } => (
          typeof tab === 'object' &&
          tab !== null &&
          typeof (tab as Partial<TerminalTab>).id === 'string' &&
          UUID_V4_PATTERN.test((tab as Partial<TerminalTab>).id ?? '') &&
          typeof (tab as Partial<TerminalTab>).title === 'string' &&
          ((tab as Partial<TerminalTab>).title ?? '').trim().length > 0
        ))
        .map((tab) => ({
          id: tab.id,
          title: cleanTerminalTitle(tab.title),
          status: isTerminalStatus(tab.status) ? tab.status : 'disconnected',
        }))
    : [];

  if (tabs.length === 0) {
    return EMPTY_TABS_STATE;
  }

  const activeId = typeof raw.activeId === 'string' && tabs.some((tab) => tab.id === raw.activeId)
    ? raw.activeId
    : tabs[0].id;
  return { tabs, activeId };
}

// Strip C0 control characters (0x00–0x1F) and DEL (0x7F) from a terminal-set
// title, keeping printable and non-ASCII (e.g. CJK) characters intact.
function cleanTerminalTitle(title: string) {
  let cleaned = '';
  for (const char of title) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) {
      cleaned += char;
    }
  }
  return cleaned.trim().replace(SPINNER_TITLE_PREFIX, '').trim().slice(0, 80);
}


export type TerminalTabsController = ReturnType<typeof useTerminalTabs>;

export function useTerminalTabs(authToken: string) {
  const [tabsState, setTabsState] = useState<TerminalTabsState>(EMPTY_TABS_STATE);
  const draggedTabRef = useRef<string | null>(null);
  const tabsStateRef = useRef(tabsState);
  const tabsSocketRef = useRef<WebSocket | null>(null);
  const pendingTabsCommandsRef = useRef<TabsClientCommand[]>([]);
  const pendingTitlesRef = useRef<Record<string, string>>({});
  const titleSyncTimersRef = useRef<Record<string, number>>({});

  const pendingTabFocusRef = useRef<{ closedId: string; focusId: string } | null>(null);
  const pendingKeyboardTabFocusRef = useRef<string | null>(null);

  const { tabs, activeId } = tabsState;

  useEffect(() => {
    tabsStateRef.current = tabsState;
  }, [tabsState]);

  const applyTabsState = useCallback((state: TerminalTabsState) => {
    const normalized = normalizeTabsState(state);
    setTabsState((current) => {
      const dragging = Boolean(draggedTabRef.current);
      const orderedTabs = dragging
        ? current.tabs
            .map((tab) => normalized.tabs.find((item) => item.id === tab.id) ?? tab)
            .filter((tab) => normalized.tabs.some((item) => item.id === tab.id))
        : normalized.tabs;
      const activeId = dragging && orderedTabs.some((tab) => tab.id === current.activeId)
        ? current.activeId
        : normalized.activeId;

      return {
        ...normalized,
        activeId,
        tabs: orderedTabs.map((tab) => {
          const pendingTitle = pendingTitlesRef.current[tab.id];
          if (!pendingTitle) {
            return tab;
          }
          if (pendingTitle === tab.title) {
            delete pendingTitlesRef.current[tab.id];
            return tab;
          }
          // A status broadcast may race ahead of the title mutation. Keep the latest
          // local title visible until the server echoes that exact value back.
          return { ...tab, title: pendingTitle };
        }),
      };
    });
  }, []);

  const sendTabsCommand = useCallback((command: TabsClientCommand) => {
    const socket = tabsSocketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      try {
        socket.send(encodeTabsClientMessage(command));
        return;
      } catch {
        // Keep the mutation queued. The socket lifecycle below will reconnect and
        // flush it once the tab-control channel is healthy again.
        socket.close();
      }
    }

    pendingTabsCommandsRef.current.push(command);
  }, []);

  const flushPendingTitles = useCallback(() => {
    Object.values(titleSyncTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    titleSyncTimersRef.current = {};
    for (const [tabId, title] of Object.entries(pendingTitlesRef.current)) {
      sendTabsCommand({ type: 'update-title', tabId, title });
    }
  }, [sendTabsCommand]);

  useEffect(() => {
    // pagehide runs while the WebSocket is still usable, including mobile refreshes
    // and back/forward-cache navigations. Flush the trailing title before teardown.
    window.addEventListener('pagehide', flushPendingTitles);
    return () => {
      window.removeEventListener('pagehide', flushPendingTitles);
      flushPendingTitles();
      pendingTitlesRef.current = {};
      pendingTabsCommandsRef.current = [];
      clearTerminalInputStates();
    };
  }, [flushPendingTitles]);


  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer = 0;
    let reconnectAttempts = 0;
    let heartbeatTimer = 0;
    let connectionTimer = 0;
    let pongTimer = 0;
    let tabsMessageQueue = Promise.resolve();

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = 0;
      }
    };

    const clearConnectionTimer = () => {
      if (connectionTimer) {
        window.clearTimeout(connectionTimer);
        connectionTimer = 0;
      }
    };

    const clearPongTimer = () => {
      if (pongTimer) {
        window.clearTimeout(pongTimer);
        pongTimer = 0;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) {
        return;
      }

      const backoff = Math.min(
        TABS_RECONNECT_MAX_DELAY_MS,
        TABS_RECONNECT_DELAY_MS * 2 ** reconnectAttempts,
      );
      reconnectAttempts += 1;
      const delay = backoff / 2 + Math.random() * (backoff / 2);
      reconnectTimer = window.setTimeout(connect, delay);
    };

    function connect() {
      if (disposed) {
        return;
      }

      const currentSocket = tabsSocketRef.current;
      if (
        currentSocket
        && (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      clearReconnectTimer();
      clearConnectionTimer();
      clearPongTimer();
      const nextSocket = createTabsSocket(authToken);
      socket = nextSocket;
      nextSocket.binaryType = 'arraybuffer';
      tabsSocketRef.current = nextSocket;
      connectionTimer = window.setTimeout(() => {
        if (disposed || tabsSocketRef.current !== nextSocket) {
          return;
        }

        connectionTimer = 0;
        tabsSocketRef.current = null;
        nextSocket.close();
        scheduleReconnect();
      }, TABS_CONNECT_TIMEOUT_MS);
      nextSocket.addEventListener('open', () => {
        if (disposed || tabsSocketRef.current !== nextSocket) {
          return;
        }

        clearConnectionTimer();
        reconnectAttempts = 0;
        const pendingCommands = pendingTabsCommandsRef.current;
        pendingTabsCommandsRef.current = [];
        for (let index = 0; index < pendingCommands.length; index += 1) {
          try {
            nextSocket.send(encodeTabsClientMessage(pendingCommands[index]));
          } catch {
            pendingTabsCommandsRef.current.unshift(...pendingCommands.slice(index));
            tabsSocketRef.current = null;
            nextSocket.close();
            scheduleReconnect();
            break;
          }
        }
      });
      nextSocket.addEventListener('message', (event) => {
        if (tabsSocketRef.current !== nextSocket) {
          return;
        }

        tabsMessageQueue = tabsMessageQueue
          .then(async () => {
            const message = await decodeTabsServerMessage(event.data);
            if (tabsSocketRef.current !== nextSocket) {
              return;
            }
            if (message?.type === 'tabs') {
              applyTabsState(normalizeTabsState(message.state));
            } else if (message?.type === 'pong') {
              clearPongTimer();
            }
          })
          .catch(() => undefined);
      });
      nextSocket.addEventListener('close', () => {
        if (tabsSocketRef.current === nextSocket) {
          tabsSocketRef.current = null;
          clearConnectionTimer();
          clearPongTimer();
          scheduleReconnect();
        }
      });
      nextSocket.addEventListener('error', () => {
        if (tabsSocketRef.current === nextSocket) {
          tabsSocketRef.current = null;
          clearConnectionTimer();
          clearPongTimer();
          nextSocket.close();
          scheduleReconnect();
        }
      });
    }

    const probeTabsConnection = (pongTimeoutMs: number) => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      const currentSocket = tabsSocketRef.current;
      if (
        !currentSocket
        || currentSocket.readyState === WebSocket.CLOSED
        || currentSocket.readyState === WebSocket.CLOSING
      ) {
        scheduleReconnect();
        return;
      }
      if (currentSocket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (pongTimer) {
        return;
      }

      try {
        currentSocket.send(encodeTabsClientMessage({ type: 'ping' }));
      } catch {
        tabsSocketRef.current = null;
        currentSocket.close();
        scheduleReconnect();
        return;
      }

      pongTimer = window.setTimeout(() => {
        if (tabsSocketRef.current !== currentSocket) {
          return;
        }

        pongTimer = 0;
        tabsSocketRef.current = null;
        currentSocket.close();
        scheduleReconnect();
      }, pongTimeoutMs);
    };

    const probeTabsConnectionAfterResume = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      const currentSocket = tabsSocketRef.current;
      reconnectAttempts = 0;

      if (
        !currentSocket
        || currentSocket.readyState === WebSocket.CLOSED
        || currentSocket.readyState === WebSocket.CLOSING
      ) {
        clearReconnectTimer();
        connect();
        return;
      }

      probeTabsConnection(TABS_RESUME_PONG_TIMEOUT_MS);
    };

    document.addEventListener('visibilitychange', probeTabsConnectionAfterResume);
    window.addEventListener('focus', probeTabsConnectionAfterResume);
    window.addEventListener('online', probeTabsConnectionAfterResume);
    heartbeatTimer = window.setInterval(
      () => probeTabsConnection(TABS_HEARTBEAT_PONG_TIMEOUT_MS),
      TABS_HEARTBEAT_INTERVAL_MS,
    );
    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      clearPongTimer();
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = 0;
      }
      document.removeEventListener('visibilitychange', probeTabsConnectionAfterResume);
      window.removeEventListener('focus', probeTabsConnectionAfterResume);
      window.removeEventListener('online', probeTabsConnectionAfterResume);
      clearConnectionTimer();
      if (tabsSocketRef.current === socket) {
        tabsSocketRef.current = null;
      }
      socket?.close();
    };
  }, [applyTabsState, authToken]);


  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeId) ?? tabs[0],
    [activeId, tabs],
  );


  const updateTabStatus = useCallback((tabId: string, status: TerminalStatus) => {
    setTabsState((current) => ({
      ...current,
      tabs: current.tabs.map((tab) => (
        tab.id === tabId ? { ...tab, status } : tab
      )),
    }));
  }, []);

  const updateTabTitle = useCallback((tabId: string, rawTitle: string) => {
    const title = cleanTerminalTitle(rawTitle);
    if (!title) {
      return;
    }

    const currentTitle = pendingTitlesRef.current[tabId]
      ?? tabsStateRef.current.tabs.find((tab) => tab.id === tabId)?.title;
    if (currentTitle === title) {
      return;
    }
    pendingTitlesRef.current[tabId] = title;

    setTabsState((current) => ({
      ...current,
      tabs: current.tabs.map((tab) => (
        tab.id === tabId ? { ...tab, title } : tab
      )),
    }));

    const existingTimer = titleSyncTimersRef.current[tabId];
    if (existingTimer) {
      // The leading update has already been sent. Keep only the latest trailing
      // title during the cooldown instead of resetting the timer indefinitely.
      return;
    }
    sendTabsCommand({ type: 'update-title', tabId, title });
    titleSyncTimersRef.current[tabId] = window.setTimeout(() => {
      delete titleSyncTimersRef.current[tabId];
      const pendingTitle = pendingTitlesRef.current[tabId];
      if (!pendingTitle) {
        return;
      }

      sendTabsCommand({ type: 'update-title', tabId, title: pendingTitle });
    }, TITLE_SYNC_DELAY_MS);
  }, [sendTabsCommand]);


  const addTab = useCallback(() => {
    sendTabsCommand({ type: 'add-tab' });
  }, [sendTabsCommand]);

  const selectTab = useCallback((tabId: string) => {
    if (!UUID_V4_PATTERN.test(tabId)) {
      return;
    }

    setTabsState((current) => ({ ...current, activeId: tabId }));
    sendTabsCommand({ type: 'set-active', activeId: tabId });
  }, [sendTabsCommand]);

  const moveTab = useCallback((tabId: string, targetId: string, after: boolean) => {
    const current = tabsStateRef.current;
    const tab = current.tabs.find((item) => item.id === tabId);
    if (!tab || tabId === targetId || !current.tabs.some((item) => item.id === targetId)) return;
    const reordered = current.tabs.filter((item) => item.id !== tabId);
    const index = reordered.findIndex((item) => item.id === targetId);
    reordered.splice(index + (after ? 1 : 0), 0, tab);
    const next = { ...current, tabs: reordered };
    tabsStateRef.current = next;
    setTabsState(next);
    sendTabsCommand({ type: 'move-tab', tabId, targetId, after });
  }, [sendTabsCommand]);


  const closeTab = useCallback((tabId: string) => {
    const currentTabs = tabsStateRef.current.tabs;
    if (currentTabs.length <= 1) {
      return;
    }

    const closedIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (closedIndex < 0) {
      return;
    }

    const remainingTabs = currentTabs.filter((tab) => tab.id !== tabId);
    const focusId = tabsStateRef.current.activeId === tabId
      ? remainingTabs[Math.max(0, closedIndex - 1)]?.id ?? remainingTabs[0].id
      : tabsStateRef.current.activeId;
    pendingTabFocusRef.current = { closedId: tabId, focusId };

    const titleTimer = titleSyncTimersRef.current[tabId];
    if (titleTimer) {
      window.clearTimeout(titleTimer);
      delete titleSyncTimersRef.current[tabId];
    }
    delete pendingTitlesRef.current[tabId];
    discardTerminalInputState(tabId);
    sendTabsCommand({ type: 'close-tab', tabId });
  }, [sendTabsCommand]);


  return {
    tabsState, tabsStateRef, activeTab, draggedTabRef, pendingTabFocusRef, pendingKeyboardTabFocusRef,
    updateTabStatus, updateTabTitle, addTab, selectTab, moveTab, closeTab,
  };
}
