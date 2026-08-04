import { LogOut, Minus, Plus, Settings, Terminal as TerminalIcon, X } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

import { AuthGate } from './auth';
import type { AuthUser } from './auth';
import TerminalPane, {
  clearTerminalInputStates,
  discardTerminalInputState,
} from './terminal/TerminalPane';
import type {
  TerminalPreferences,
  TerminalStatus,
  TerminalTab,
  TerminalTabsState,
} from './terminal/types';
import { decodeTabsServerMessage, encodeTabsClientMessage } from './terminal/wsCodec';
import { openAuthenticatedSocket } from './wsHost';

const DEFAULT_PREFERENCES: TerminalPreferences = {
  fontSize: 14,
};

const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 22;
const TITLE_SYNC_DELAY_MS = 500;
const TABS_RECONNECT_DELAY_MS = 1000;
const TABS_RECONNECT_MAX_DELAY_MS = 15000;
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

type TerminalAppProps = {
  authToken: string;
  user: AuthUser;
  onLogout: () => Promise<void>;
};

type TabsClientCommand =
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

function clampFontSize(value: unknown) {
  const size = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(size)) {
    return DEFAULT_PREFERENCES.fontSize;
  }

  return Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(size)));
}

function readPreferences(): TerminalPreferences {
  try {
    const stored = localStorage.getItem('terminal-preferences');
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored) as Partial<TerminalPreferences>;
    return {
      fontSize: clampFontSize(parsed.fontSize),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function statusLabel(status: TerminalStatus) {
  if (status === 'connected') return '已连接';
  if (status === 'connecting') return '连接中';
  if (status === 'background') return '后台运行';
  if (status === 'exited') return '已退出';
  if (status === 'error') return '错误';
  return '已断开';
}

function TerminalApp({ authToken, user, onLogout }: TerminalAppProps) {
  const [tabsState, setTabsState] = useState<TerminalTabsState>(EMPTY_TABS_STATE);
  const [preferences, setPreferences] = useState<TerminalPreferences>(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const tabsStateRef = useRef(tabsState);
  const tabsSocketRef = useRef<WebSocket | null>(null);
  const pendingTabsCommandsRef = useRef<TabsClientCommand[]>([]);
  const pendingTitlesRef = useRef<Record<string, string>>({});
  const titleSyncTimersRef = useRef<Record<string, number>>({});
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingTabFocusRef = useRef<{ closedId: string; focusId: string } | null>(null);

  const { tabs, activeId } = tabsState;

  useEffect(() => {
    tabsStateRef.current = tabsState;
  }, [tabsState]);

  const applyTabsState = useCallback((state: TerminalTabsState) => {
    const normalized = normalizeTabsState(state);
    setTabsState({
      ...normalized,
      tabs: normalized.tabs.map((tab) => {
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
    localStorage.setItem('terminal-preferences', JSON.stringify(preferences));
  }, [preferences]);

  // Flag active window resizes so heavy backdrop-filter chrome can drop to
  // opaque while dragging — re-blurring the backdrop every frame tears and
  // flickers in Chromium/Electron. The flag clears once the resize settles.
  useEffect(() => {
    const root = document.documentElement;
    let settleTimer = 0;
    const onResize = () => {
      root.classList.add('is-resizing');
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        root.classList.remove('is-resizing');
      }, 180);
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(settleTimer);
      root.classList.remove('is-resizing');
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer = 0;
    let reconnectAttempts = 0;
    let heartbeatTimer = 0;
    let pongTimer = 0;
    let tabsMessageQueue = Promise.resolve();

    const clearReconnectTimer = () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = 0;
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
      clearPongTimer();
      const nextSocket = createTabsSocket(authToken);
      socket = nextSocket;
      nextSocket.binaryType = 'arraybuffer';
      tabsSocketRef.current = nextSocket;
      nextSocket.addEventListener('open', () => {
        if (disposed || tabsSocketRef.current !== nextSocket) {
          return;
        }

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
          clearPongTimer();
          scheduleReconnect();
        }
      });
      nextSocket.addEventListener('error', () => {
        if (tabsSocketRef.current === nextSocket) {
          tabsSocketRef.current = null;
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

      clearPongTimer();
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

        tabsSocketRef.current = null;
        currentSocket.close();
        scheduleReconnect();
      }, pongTimeoutMs);
    };

    const probeTabsConnectionAfterResume = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      reconnectAttempts = 0;
      probeTabsConnection(TABS_RESUME_PONG_TIMEOUT_MS);
    };

    document.addEventListener('visibilitychange', probeTabsConnectionAfterResume);
    window.addEventListener('focus', probeTabsConnectionAfterResume);
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

  // On compact screens the tab strip scrolls horizontally. Server-created tabs
  // become active without receiving DOM focus, so the browser does not reveal
  // them automatically. Move the whole pill (including its close button) into
  // view before paint whenever the active tab changes.
  useLayoutEffect(() => {
    if (!activeTab) {
      return;
    }

    tabButtonRefs.current
      .get(activeTab.id)
      ?.closest<HTMLElement>('.tab')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab?.id]);

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

  const updateFontSize = useCallback((value: number | string) => {
    setPreferences((current) => ({
      ...current,
      fontSize: clampFontSize(value),
    }));
  }, []);

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

  const handleTabKeyDown = useCallback((
    event: ReactKeyboardEvent<HTMLButtonElement>,
    tabId: string,
  ) => {
    const currentTabs = tabsStateRef.current.tabs;
    const currentIndex = currentTabs.findIndex((tab) => tab.id === tabId);
    if (currentIndex < 0 || currentTabs.length < 2) {
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      closeTab(tabId);
      return;
    }

    let nextIndex = currentIndex;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % currentTabs.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + currentTabs.length) % currentTabs.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = currentTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTabId = currentTabs[nextIndex].id;
    selectTab(nextTabId);
    window.requestAnimationFrame(() => {
      tabButtonRefs.current.get(nextTabId)?.focus();
    });
  }, [closeTab, selectTab]);

  useEffect(() => {
    const pendingFocus = pendingTabFocusRef.current;
    if (!pendingFocus || tabs.some((tab) => tab.id === pendingFocus.closedId)) {
      return;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      if (pendingTabFocusRef.current !== pendingFocus) {
        return;
      }

      const focusTarget = tabButtonRefs.current.get(pendingFocus.focusId);
      if (focusTarget) {
        focusTarget.focus();
        pendingTabFocusRef.current = null;
      }
    });
    return () => window.cancelAnimationFrame(focusFrame);
  }, [tabs]);

  useEffect(() => {
    document.title = activeTab?.title
      ? `${activeTab.title} - Cloud Terminal`
      : 'Cloud Terminal';
  }, [activeTab?.title]);

  useLayoutEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const firstSettingsControl = settingsPanelRef.current?.querySelector<HTMLButtonElement>(
      'button:not(:disabled)',
    );
    firstSettingsControl?.focus();
  }, [settingsOpen]);

  // The settings popover floats over the terminal, so opening it never changes
  // the terminal's size (which would otherwise trigger a reflow / PTY resize).
  // Dismiss it on outside-click or Escape, like any menu.
  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (
        !target ||
        settingsPanelRef.current?.contains(target) ||
        settingsButtonRef.current?.contains(target)
      ) {
        return;
      }
      setSettingsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettingsOpen(false);
        settingsButtonRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <TerminalIcon size={15} aria-hidden="true" />
          </span>
          <span className="brand-name">Cloud Terminal</span>
        </div>

        <nav
          className="tabs"
          role="tablist"
          aria-label="终端标签"
          aria-orientation="horizontal"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            return (
              <div className={`tab ${isActive ? 'active' : ''}`} key={tab.id}>
                <button
                  type="button"
                  className="tab-main"
                  id={`terminal-tab-${tab.id}`}
                  ref={(button) => {
                    if (button) {
                      tabButtonRefs.current.set(tab.id, button);
                    } else {
                      tabButtonRefs.current.delete(tab.id);
                    }
                  }}
                  role="tab"
                  onClick={() => selectTab(tab.id)}
                  onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
                  aria-selected={isActive}
                  aria-label={`${tab.title}，${statusLabel(tab.status)}`}
                  aria-controls="active-terminal-panel"
                  aria-current={isActive ? 'page' : undefined}
                  tabIndex={isActive ? 0 : -1}
                  title={`${tab.title} - ${statusLabel(tab.status)}`}
                >
                  <span className={`status-dot ${tab.status}`} aria-hidden="true" />
                  <span className="tab-title">{tab.title}</span>
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    className="tab-close"
                    onClick={() => closeTab(tab.id)}
                    title={`关闭 ${tab.title}`}
                    aria-label={`关闭 ${tab.title}`}
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            );
          })}
        </nav>

        <div className="toolbar">
          <button type="button" className="icon-button" onClick={addTab} title="新增终端" aria-label="新增终端">
            <Plus size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            ref={settingsButtonRef}
            className={`icon-button ${settingsOpen ? 'active' : ''}`}
            onClick={() => setSettingsOpen((open) => !open)}
            title="终端设置"
            aria-label="终端设置"
            aria-haspopup="dialog"
            aria-controls="terminal-settings-dialog"
            aria-expanded={settingsOpen}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => { void onLogout(); }}
            title={`退出 ${user.username}`}
            aria-label={`退出 ${user.username}`}
          >
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </header>

      <section
        id="active-terminal-panel"
        className="terminal-stack"
        role="tabpanel"
        aria-labelledby={activeTab ? `terminal-tab-${activeTab.id}` : undefined}
      >
        {activeTab && (
          <div
            key={activeTab.id}
            className="terminal-layer visible"
          >
            <TerminalPane
              tab={activeTab}
              active
              authToken={authToken}
              preferences={preferences}
              onStatusChange={updateTabStatus}
              onTitleChange={updateTabTitle}
            />
          </div>
        )}
      </section>

      {settingsOpen && (
        <div
          id="terminal-settings-dialog"
          ref={settingsPanelRef}
          className="settings-popover"
          role="dialog"
          aria-label="终端设置"
        >
          <div className="settings-control">
            <span>字号</span>
            <div className="font-stepper" role="group" aria-label="字号">
              <button
                type="button"
                className="step-button"
                onClick={() => updateFontSize(preferences.fontSize - 1)}
                disabled={preferences.fontSize <= MIN_FONT_SIZE}
                title="减小字号"
                aria-label="减小字号"
              >
                <Minus size={14} aria-hidden="true" />
              </button>
              <strong>{preferences.fontSize}px</strong>
              <button
                type="button"
                className="step-button"
                onClick={() => updateFontSize(preferences.fontSize + 1)}
                disabled={preferences.fontSize >= MAX_FONT_SIZE}
                title="增大字号"
                aria-label="增大字号"
              >
                <Plus size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function App() {
  return (
    <AuthGate>
      {({ token, user, logout }) => (
        <TerminalApp
          authToken={token}
          user={user}
          onLogout={logout}
        />
      )}
    </AuthGate>
  );
}
