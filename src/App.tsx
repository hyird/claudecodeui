import { LogOut, Minus, Plus, Settings, Terminal as TerminalIcon, Users } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { AuthGate } from './auth';
import type { AuthUser } from './auth';
import CollaboratorsDialog from './auth/CollaboratorsDialog';
import TerminalPane from './terminal/TerminalPane';
import TerminalTabs from './terminal/TerminalTabs';
import { useTerminalTabs } from './terminal/use-terminal-tabs';
import { clampFontSize, readPreferences, MIN_FONT_SIZE, MAX_FONT_SIZE } from './terminal/preferences';
import type { TerminalPreferences } from './terminal/types';
type TerminalAppProps = {
  authToken: string;
  user: AuthUser;
  onLogout: () => Promise<void>;
};

function TerminalApp({ authToken, user, onLogout }: TerminalAppProps) {
  const tabsController = useTerminalTabs(authToken);
  const { activeTab, pendingTabFocusRef, pendingKeyboardTabFocusRef, updateTabStatus, updateTabTitle, addTab } = tabsController;
  const [preferences, setPreferences] = useState<TerminalPreferences>(readPreferences);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);
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

  const updateFontSize = useCallback((value: number | string) => {
    setPreferences((current) => ({
      ...current,
      fontSize: clampFontSize(value),
    }));
  }, []);

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

        <TerminalTabs controller={tabsController} />

        <div className="toolbar">
          <button type="button" className="icon-button" onClick={addTab} title="新增终端" aria-label="新增终端">
            <Plus size={16} aria-hidden="true" />
          </button>
          {user.role === 'admin' && (
            <button type="button" className="icon-button" onClick={() => setCollaboratorsOpen(true)} title="管理协作者" aria-label="管理协作者">
              <Users size={16} aria-hidden="true" />
            </button>
          )}
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
              focusOnMount={
                pendingKeyboardTabFocusRef.current !== activeTab.id
                && pendingTabFocusRef.current?.focusId !== activeTab.id
              }
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
      {collaboratorsOpen && <CollaboratorsDialog token={authToken} onClose={() => setCollaboratorsOpen(false)} />}
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
