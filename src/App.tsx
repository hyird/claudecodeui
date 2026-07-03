import { LogOut, Minus, Plus, RotateCcw, Settings, Terminal as TerminalIcon, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AuthApiError, AuthGate, authHeaders, isAuthExpiredError } from './auth';
import type { AuthUser } from './auth';
import TerminalPane from './terminal/TerminalPane';
import type {
  TerminalPreferences,
  TerminalStatus,
  TerminalTab,
  TerminalTabsServerMessage,
  TerminalTabsState,
} from './terminal/types';

const DEFAULT_PREFERENCES: TerminalPreferences = {
  fontSize: 14,
};

const MIN_FONT_SIZE = 11;
const MAX_FONT_SIZE = 22;
const TITLE_SYNC_DELAY_MS = 500;
const SAFE_TAB_ID = /^[a-zA-Z0-9_.:-]+$/;
const SPINNER_TITLE_PREFIX = /^[\u2800-\u28ff]+[\s:·.-]*/u;
const EMPTY_TABS_STATE: TerminalTabsState = {
  tabs: [],
  activeId: '',
  nextIndex: 1,
};
const TERMINAL_STATUSES = new Set<string>([
  'connecting',
  'connected',
  'disconnected',
  'exited',
  'error',
]);

type TerminalAppProps = {
  authToken: string;
  user: AuthUser;
  onLogout: () => Promise<void>;
  onAuthInvalidated: (invalidToken?: string) => void;
};

type TabsClientCommand =
  | { type: 'add-tab' }
  | { type: 'set-active'; activeId: string }
  | { type: 'update-title'; tabId: string; title: string }
  | { type: 'restart-tab'; tabId: string }
  | { type: 'close-tab'; tabId: string };

function createTabsWebSocketUrl(authToken: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${protocol}//${window.location.host}/terminal/tabs`);
  url.searchParams.set('token', authToken);
  return url.toString();
}

function parseTabsMessage(raw: MessageEvent['data']): TerminalTabsServerMessage | null {
  try {
    return JSON.parse(String(raw)) as TerminalTabsServerMessage;
  } catch {
    return null;
  }
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
          SAFE_TAB_ID.test((tab as Partial<TerminalTab>).id ?? '') &&
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
  const nextIndex = typeof raw.nextIndex === 'number' && raw.nextIndex > 0
    ? raw.nextIndex
    : tabs.length + 1;

  return { tabs, activeId, nextIndex };
}

async function requestTabsState(path: string, authToken: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: authHeaders(authToken, init?.headers),
  });
  if (!response.ok) {
    throw new AuthApiError(response.status, `Tab request failed: ${response.status}`);
  }

  const payload = await response.json() as { state?: unknown };
  return normalizeTabsState(payload.state);
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
  if (status === 'exited') return '已退出';
  if (status === 'error') return '错误';
  return '已断开';
}

function TerminalApp({ authToken, user, onLogout, onAuthInvalidated }: TerminalAppProps) {
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

  const { tabs, activeId } = tabsState;

  useEffect(() => {
    tabsStateRef.current = tabsState;
  }, [tabsState]);

  useEffect(() => () => {
    Object.values(titleSyncTimersRef.current).forEach((timer) => window.clearTimeout(timer));
    titleSyncTimersRef.current = {};
    pendingTitlesRef.current = {};
    pendingTabsCommandsRef.current = [];
  }, []);

  const applyTabsState = useCallback((state: TerminalTabsState) => {
    setTabsState(normalizeTabsState(state));
  }, []);

  const sendTabsCommand = useCallback((command: TabsClientCommand) => {
    const socket = tabsSocketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(command));
      return;
    }

    pendingTabsCommandsRef.current.push(command);
  }, []);

  useEffect(() => {
    localStorage.removeItem('terminal-tabs-state');
  }, []);

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

    const loadTabs = () => {
      void requestTabsState('/api/terminal/tabs', authToken)
        .then((state) => {
          if (!disposed) {
            applyTabsState(state);
          }
        })
        .catch((error) => {
          if (!disposed && isAuthExpiredError(error)) {
            disposed = true;
            window.clearTimeout(reconnectTimer);
            socket?.close();
            onAuthInvalidated(authToken);
          }
        });
    };

    const connect = () => {
      socket = new WebSocket(createTabsWebSocketUrl(authToken));
      tabsSocketRef.current = socket;
      socket.addEventListener('open', () => {
        if (tabsSocketRef.current !== socket) {
          return;
        }
        const pendingCommands = pendingTabsCommandsRef.current;
        pendingTabsCommandsRef.current = [];
        for (const command of pendingCommands) {
          socket?.send(JSON.stringify(command));
        }
      });
      socket.addEventListener('message', (event) => {
        const message = parseTabsMessage(event.data);
        if (message?.type === 'tabs') {
          applyTabsState(normalizeTabsState(message.state));
        }
      });
      socket.addEventListener('close', () => {
        if (tabsSocketRef.current === socket) {
          tabsSocketRef.current = null;
        }
        if (!disposed) {
          reconnectTimer = window.setTimeout(connect, 1000);
        }
      });
    };

    loadTabs();
    connect();

    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer);
      if (tabsSocketRef.current === socket) {
        tabsSocketRef.current = null;
      }
      socket?.close();
    };
  }, [applyTabsState, authToken, onAuthInvalidated]);

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
      window.clearTimeout(existingTimer);
    }
    titleSyncTimersRef.current[tabId] = window.setTimeout(() => {
      delete titleSyncTimersRef.current[tabId];
      const pendingTitle = pendingTitlesRef.current[tabId];
      delete pendingTitlesRef.current[tabId];
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
    if (!SAFE_TAB_ID.test(tabId)) {
      return;
    }

    setTabsState((current) => ({ ...current, activeId: tabId }));
    sendTabsCommand({ type: 'set-active', activeId: tabId });
  }, [sendTabsCommand]);

  const closeTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) {
      return;
    }

    sendTabsCommand({ type: 'close-tab', tabId });
  }, [sendTabsCommand, tabs.length]);

  const restartActiveTab = useCallback(() => {
    if (!activeTab) {
      return;
    }

    sendTabsCommand({ type: 'restart-tab', tabId: activeTab.id });
  }, [activeTab, sendTabsCommand]);

  useEffect(() => {
    document.title = activeTab?.title
      ? `${activeTab.title} - CloudCLI Terminal`
      : 'CloudCLI Terminal';
  }, [activeTab?.title]);

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
          <span className="brand-name">CloudCLI Terminal</span>
        </div>

        <nav className="tabs" aria-label="终端标签">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab?.id;
            return (
              <div className={`tab ${isActive ? 'active' : ''}`} key={tab.id}>
                <button
                  type="button"
                  className="tab-main"
                  onClick={() => selectTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
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
          <button type="button" className="icon-button" onClick={restartActiveTab} title="重启当前终端" aria-label="重启当前终端">
            <RotateCcw size={15} aria-hidden="true" />
          </button>
          <button
            type="button"
            ref={settingsButtonRef}
            className={`icon-button ${settingsOpen ? 'active' : ''}`}
            onClick={() => setSettingsOpen((open) => !open)}
            title="终端设置"
            aria-label="终端设置"
            aria-haspopup="dialog"
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

      <section className="terminal-stack">
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
      {({ token, user, logout, invalidateAuth }) => (
        <TerminalApp
          authToken={token}
          user={user}
          onLogout={logout}
          onAuthInvalidated={invalidateAuth}
        />
      )}
    </AuthGate>
  );
}
