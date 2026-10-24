import { FitAddon } from '@xterm/addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { UnicodeGraphemesAddon } from '@xterm/addon-unicode-graphemes';
import { Terminal } from '@xterm/xterm';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { terminalTheme } from './themes';
import { copyToClipboard, readClipboardText } from './clipboard';
import type { TerminalPreferences, TerminalStatus } from './types';
import { connectTerminal, type TerminalConnection } from './connection';
import { useTerminalLayout } from './use-terminal-layout';
import { attachTerminalTouchScroll } from './touch-scroll';
import terminalPolicy from '../../shared/terminal-policy.json';
import {
  configureTerminalRenderer, TERMINAL_FONT_FAMILY,
  TERMINAL_SCROLLBAR_GUTTER,
  type TerminalRenderer,
} from './renderer';

// Every prop is a primitive or a referentially stable value (preferences state,
// memoized callbacks), so the default shallow memo skips re-rendering every pane
// when another tab's title or status changes.
type TerminalPaneProps = {
  tabId: string;
  active: boolean;
  focusOnMount: boolean;
  authToken: string;
  preferences: TerminalPreferences;
  onStatusChange: (tabId: string, status: TerminalStatus) => void;
};

function TerminalPane({
  tabId,
  active,
  focusOnMount,
  authToken,
  preferences,
  onStatusChange,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const connectionRef = useRef<TerminalConnection | null>(null);
  const rendererRef = useRef<TerminalRenderer | null>(null);
  const wasActiveRef = useRef(false);
  const [sessionRebuiltNoticeVisible, setSessionRebuiltNoticeVisible] = useState(false);
  const [pendingCopyText, setPendingCopyText] = useState<string | null>(null);
  const [manualCopyText, setManualCopyText] = useState<string | null>(null);
  const activeRef = useRef(active);
  const focusOnMountRef = useRef(focusOnMount);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { focusOnMountRef.current = focusOnMount; }, [focusOnMount]);

  const sendResize = useCallback((cols: number, rows: number) => connectionRef.current?.resize(cols, rows), []);
  const { clearResizeTimers, fitAndResize,
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
      scrollback: terminalPolicy.scrollbackLines,
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
    const disposeTouchScroll = attachTerminalTouchScroll(terminal, container);
    const renderer = configureTerminalRenderer(terminal, resizeAfterLayoutSettles, forceFullRefresh);
    renderer.setActive(activeRef.current);
    rendererRef.current = renderer;
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

      if (terminal.buffer.active.type !== 'alternate' && terminal.buffer.active.baseY <= 0) {
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
      terminal, tabId, authToken, onStatusChange,
      beforeInit: fitAndResize,
      onReady() { updateScrollbackAffordance(); resizeAfterLayoutSettles(); forceFullRefresh(); },
      onSessionRebuilt: setSessionRebuiltNoticeVisible,
    });
    connectionRef.current = connection;
    const sendInput = connection.sendInput;
    const dataSubscription = terminal.onData(sendInput);
    const scrollSubscription = terminal.onScroll(updateScrollbackAffordance);
    const writeParsedSubscription = terminal.onWriteParsed(updateScrollbackAffordance);
    const resizeSubscription = terminal.onResize(updateScrollbackAffordance);
    const resizeObserver = new ResizeObserver(() => {
      if (activeRef.current) {
        resizeDuringDrag();
      }
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      connection.dispose();
      disposeTouchScroll();
      clearResizeTimers();
      dataSubscription.dispose();
      scrollSubscription.dispose();
      writeParsedSubscription.dispose();
      resizeSubscription.dispose();
      resizeObserver.disconnect();
      renderer.dispose();
      rendererRef.current = null;
      terminal.dispose();
      connectionRef.current = null;
      fitAddonRef.current = null;
      terminalRef.current = null;
      resetLayout();
    };
  }, [
    clearResizeTimers,
    fitAndResize,
    onStatusChange,
    resizeAfterLayoutSettles,
    resizeDuringDrag,
    forceFullRefresh,
    resetLayout,
    updateScrollbackAffordance,
    authToken,
    tabId,
  ]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.options.fontSize = preferences.fontSize;
    terminal.options.theme = terminalTheme;
    rendererRef.current?.setActive(active);
    const becameActive = active && !wasActiveRef.current;
    wasActiveRef.current = active;
    if (!active) {
      terminal.blur();
      return;
    }

    resizeAfterLayoutSettles();
    // Only a newly shown pane takes focus; a font-size change must not pull
    // focus away from the settings stepper.
    if (becameActive && focusOnMountRef.current && !window.matchMedia?.('(pointer: coarse)').matches) {
      terminal.focus();
    }
  }, [active, preferences.fontSize, resizeAfterLayoutSettles]);

  return (
    <div className="terminal-pane">
      <div id={`terminal-frame-${tabId}`} className="terminal-frame">
        <div ref={containerRef} className="terminal-host" />
      </div>
      <div className="terminal-touch-toolbar" role="toolbar" aria-label="终端快捷键">
        <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={() => {
          const terminal = terminalRef.current;
          if (terminal?.textarea === document.activeElement) terminal.blur();
          else terminal?.focus();
        }}>键盘</button>
        {[
          ['Esc', '\x1b', 'Escape'], ['Tab', '\t', 'Tab'], ['Ctrl+C', '\x03', '中断命令'],
          ['←', 'D', '向左'], ['↓', 'B', '向下'], ['↑', 'A', '向上'], ['→', 'C', '向右'],
        ].map(([label, value, description]) => (
          <button key={label} type="button" aria-label={description}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => {
              const terminal = terminalRef.current;
              if (!terminal) return;
              const data = value.length === 1 && /[ABCD]/.test(value)
                ? `\x1b${terminal.modes.applicationCursorKeysMode ? 'O' : '['}${value}` : value;
              terminal.input(data, true);
            }}>{label}</button>
        ))}
      </div>
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

export default memo(TerminalPane);
