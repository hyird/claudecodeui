import { FitAddon } from '@xterm/addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { UnicodeGraphemesAddon } from '@xterm/addon-unicode-graphemes';
import { Terminal } from '@xterm/xterm';
import { useCallback, useEffect, useRef, useState } from 'react';

import { terminalTheme } from './themes';
import { copyToClipboard, readClipboardText } from './clipboard';
import type {
  TerminalPreferences,
  TerminalStatus,
  TerminalTab,
} from './types';
import { connectTerminal, type TerminalConnection } from './connection';
import { useTerminalLayout } from './use-terminal-layout';
import {
  configureTerminalRenderer, registerTerminalModeReports, TERMINAL_FONT_FAMILY,
  TERMINAL_SCROLLBAR_GUTTER,
} from './renderer';

type TerminalPaneProps = {
  tab: TerminalTab;
  active: boolean;
  focusOnMount: boolean;
  authToken: string;
  preferences: TerminalPreferences;
  onStatusChange: (tabId: string, status: TerminalStatus) => void;
  onTitleChange: (tabId: string, title: string) => void;
};

export default function TerminalPane({
  tab,
  active,
  focusOnMount,
  authToken,
  preferences,
  onStatusChange,
  onTitleChange,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const connectionRef = useRef<TerminalConnection | null>(null);
  const [sessionRebuiltNoticeVisible, setSessionRebuiltNoticeVisible] = useState(false);
  const [pendingCopyText, setPendingCopyText] = useState<string | null>(null);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const activeRef = useRef(active);
  const focusOnMountRef = useRef(focusOnMount);
  useEffect(() => { activeRef.current = active; }, [active]);

  const sendResize = useCallback((cols: number, rows: number) => connectionRef.current?.resize(cols, rows), []);
  const { clearResizeTimers, clearScreenTransform, fitAndResize, proposeFrameDimensions,
    resizeAfterLayoutSettles, resizeDuringDrag, forceFullRefresh, updateScrollbackAffordance, reset: resetLayout }
    = useTerminalLayout({ terminalRef, fitAddonRef, containerRef, onResize: sendResize });
  useEffect(() => {
    const container = containerRef.current;
    if (!container || terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      allowProposedApi: true,
      cursorBlink: false,
      cursorInactiveStyle: 'none',
      cursorStyle: 'bar',
      fontFamily: TERMINAL_FONT_FAMILY,
      fontSize: preferences.fontSize,
      lineHeight: 1.12,
      overviewRuler: { width: TERMINAL_SCROLLBAR_GUTTER },
      scrollback: 10000,
      theme: terminalTheme,
    });
    const fitAddon = new FitAddon();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    let disposed = false;
    let clipboardWriteSeq = 0;
    const writeClipboard = (text: string) => {
      const writeSeq = ++clipboardWriteSeq;
      return copyToClipboard(text).then((copied) => {
        if (!disposed && writeSeq === clipboardWriteSeq) {
          setPendingCopyText(copied ? null : text);
          setManualCopyText(null);
        }
      });
    };
    terminal.loadAddon(new UnicodeGraphemesAddon());
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(new ClipboardAddon(undefined, {
      readText: (selection) => selection === 'c' ? readClipboardText() : '',
      writeText: (selection, text) => {
        if (selection !== 'c') return;
        return writeClipboard(text);
      },
    }));

    terminal.open(container);
    const renderer = configureTerminalRenderer(terminal, resizeAfterLayoutSettles, forceFullRefresh);
    const modeReports = registerTerminalModeReports(terminal);
    // Input handling mirrors cloudcli-plugin-terminal's TerminalSession.
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'c' && terminal.hasSelection()) {
        event.preventDefault();
        void writeClipboard(terminal.getSelection());
        return false;
      }
      if (mod && event.key.toLowerCase() === 'v') {
        // Leave the browser's native paste action intact. xterm receives the paste
        // event from its helper textarea, normalizes newlines and adds bracketed-paste
        // markers when the active application requested them. Reading through
        // navigator.clipboard here both fails on insecure HTTP and bypasses that path.
        return false;
      }
      return true;
    });
    terminal.attachCustomWheelEventHandler((event) => {
      const mouseTrackingEnabled = terminal.modes.mouseTrackingMode !== 'none';
      if (mouseTrackingEnabled) {
        return true;
      }

      if (terminal.buffer.active.baseY <= 0) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }

      return true;
    });

    updateScrollbackAffordance();
    terminal.writeln('\x1b[36mCloud Terminal\x1b[0m');
    terminal.writeln('\x1b[90mConnecting...\x1b[0m');

    const connection = connectTerminal({
      terminal, tabId: tab.id, authToken, onStatusChange,
      beforeInit: fitAndResize, afterInit: resizeAfterLayoutSettles,
      onReady() { updateScrollbackAffordance(); resizeAfterLayoutSettles(); forceFullRefresh(); },
      onSessionRebuilt: setSessionRebuiltNoticeVisible,
    });
    connectionRef.current = connection;
    const sendInput = connection.sendInput;
    const dataSubscription = terminal.onData(sendInput);
    const titleSubscription = terminal.onTitleChange((title) => {
      onTitleChange(tab.id, title);
    });
    const refreshAfterTerminalChange = () => {
      updateScrollbackAffordance();
      forceFullRefresh();
    };
    const scrollSubscription = terminal.onScroll(() => {
      refreshAfterTerminalChange();
    });
    const writeParsedSubscription = terminal.onWriteParsed(() => {
      // xterm tracks dirty rows and schedules rendering after parsing. A full
      // viewport refresh here would repaint every row for every output batch.
      updateScrollbackAffordance();
      const buffer = terminal.buffer.active;
      if (buffer.viewportY !== buffer.baseY) {
        forceFullRefresh();
      }
    });
    const resizeSubscription = terminal.onResize(() => {
      refreshAfterTerminalChange();
    });
    const resizeObserver = new ResizeObserver(() => {
      if (activeRef.current) {
        resizeDuringDrag();
      }
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      connection.dispose();
      clearResizeTimers();
      clearScreenTransform();
      dataSubscription.dispose();
      titleSubscription.dispose();
      scrollSubscription.dispose();
      writeParsedSubscription.dispose();
      resizeSubscription.dispose();
      modeReports.dispose();
      resizeObserver.disconnect();
      renderer.dispose();
      terminal.dispose();
      connectionRef.current = null;
      fitAddonRef.current = null;
      terminalRef.current = null;
      resetLayout();
    };
  }, [
    clearResizeTimers,
    clearScreenTransform,
    fitAndResize,
    onStatusChange,
    onTitleChange,
    proposeFrameDimensions,
    resizeAfterLayoutSettles,
    resizeDuringDrag,
    forceFullRefresh,
    resetLayout,
    updateScrollbackAffordance,
    authToken,
    tab.id,
  ]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.options.fontSize = preferences.fontSize;
    terminal.options.theme = terminalTheme;
    if (active) {
      resizeAfterLayoutSettles();
    } else {
      terminal.blur();
    }
  }, [active, preferences.fontSize, resizeAfterLayoutSettles]);

  useEffect(() => {
    if (!active) {
      return;
    }

    resizeAfterLayoutSettles();
    if (focusOnMountRef.current) {
      terminalRef.current?.focus();
    }
  }, [active, resizeAfterLayoutSettles]);

  return (
    <div className="terminal-pane">
      <div id={`terminal-frame-${tab.id}`} ref={containerRef} className="terminal-frame" />
      <div className="terminal-notices">
        {sessionRebuiltNoticeVisible && (
          <div className="terminal-session-notice" role="status" aria-live="polite" aria-atomic="true">
            <span>终端会话已重建，请重新输入尚未完成的命令。</span>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => setSessionRebuiltNoticeVisible(false)}
            >
              ×
            </button>
          </div>
        )}
        {pendingCopyText !== null && (
          <div className="terminal-session-notice terminal-copy-notice" role="status" aria-live="polite" aria-atomic="true">
            <span>{manualCopyText === pendingCopyText
              ? '浏览器阻止自动复制，请在文本框内复制。'
              : '终端请求复制内容，请点击复制。'}</span>
            <button
              type="button"
              className="terminal-copy-button"
              onClick={() => {
                const text = pendingCopyText;
                void copyToClipboard(text).then((copied) => {
                  if (copied) {
                    setPendingCopyText((current) => current === text ? null : current);
                    setManualCopyText(null);
                    terminalRef.current?.focus();
                  } else {
                    setManualCopyText(text);
                  }
                });
              }}
            >
              复制
            </button>
            <button
              type="button"
              aria-label="关闭复制提示"
              onClick={() => {
                setPendingCopyText(null);
                setManualCopyText(null);
              }}
            >
              ×
            </button>
            {manualCopyText === pendingCopyText && (
              <textarea
                aria-label="待复制内容"
                readOnly
                value={manualCopyText}
                onFocus={(event) => event.currentTarget.select()}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
