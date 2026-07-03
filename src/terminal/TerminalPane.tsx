import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { WebglAddon } from '@xterm/addon-webgl';
import { Terminal } from '@xterm/xterm';
import { useCallback, useEffect, useRef } from 'react';

import {
  copyTerminalSelection,
  isCopyShortcut,
  isPasteShortcut,
} from './clipboard';
import { terminalTheme } from './themes';
import type {
  TerminalPreferences,
  TerminalStatus,
  TerminalTab,
} from './types';
import { decodeTerminalServerMessage, encodeTerminalClientMessage } from './wsCodec';
import { websocketUrl } from '../wsHost';

type TerminalPaneProps = {
  tab: TerminalTab;
  active: boolean;
  authToken: string;
  preferences: TerminalPreferences;
  onStatusChange: (tabId: string, status: TerminalStatus) => void;
  onTitleChange: (tabId: string, title: string) => void;
};

type TerminalDimensions = {
  cols: number;
  rows: number;
};

const MIN_TERMINAL_COLS = 2;
const MIN_TERMINAL_ROWS = 1;

function createWebSocketUrl(authToken: string) {
  return websocketUrl('/terminal', authToken);
}

export default function TerminalPane({
  tab,
  active,
  authToken,
  preferences,
  onStatusChange,
  onTitleChange,
}: TerminalPaneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const activeRef = useRef(active);
  const resizeTimersRef = useRef<number[]>([]);
  const resizeFrameRef = useRef(0);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const clearResizeTimers = useCallback(() => {
    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [];
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = 0;
    }
  }, []);

  const readFitDimensions = useCallback((): TerminalDimensions | undefined => {
    const fitAddon = fitAddonRef.current;
    if (!fitAddon) {
      return undefined;
    }

    try {
      const dims = fitAddon.proposeDimensions();
      if (dims && Number.isFinite(dims.cols) && Number.isFinite(dims.rows)) {
        return dims;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }, []);

  const measureCellCapacity = useCallback((fallback?: TerminalDimensions) => {
    const terminal = terminalRef.current;
    const container = containerRef.current;
    const screen = terminal?.element?.querySelector<HTMLElement>('.xterm-screen');
    if (!terminal || !container || !screen) {
      return fallback;
    }

    const baseCols = terminal.cols || fallback?.cols || lastSizeRef.current.cols;
    const baseRows = terminal.rows || fallback?.rows || lastSizeRef.current.rows;
    if (baseCols <= 0 || baseRows <= 0 || screen.offsetWidth <= 0 || screen.offsetHeight <= 0) {
      return fallback;
    }

    const cellWidth = screen.offsetWidth / baseCols;
    const cellHeight = screen.offsetHeight / baseRows;
    if (!Number.isFinite(cellWidth) || !Number.isFinite(cellHeight) || cellWidth <= 0 || cellHeight <= 0) {
      return fallback;
    }

    const style = window.getComputedStyle(container);
    const availWidth = container.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availHeight = container.clientHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    return {
      cols: Math.max(MIN_TERMINAL_COLS, Math.floor(availWidth / cellWidth)),
      rows: Math.max(MIN_TERMINAL_ROWS, Math.floor(availHeight / cellHeight)),
    };
  }, []);

  const proposeFrameDimensions = useCallback(() => (
    measureCellCapacity(readFitDimensions())
  ), [measureCellCapacity, readFitDimensions]);

  // Fit to the largest whole-cell grid the current frame can contain. Any
  // leftover pixels stay blank instead of clipping the right edge/bottom row.
  const fitAndResize = useCallback(() => {
    const terminal = terminalRef.current;
    const socket = socketRef.current;
    const dims = proposeFrameDimensions();
    if (!terminal || !dims) {
      return;
    }

    const last = lastSizeRef.current;
    if (dims.cols === last.cols && dims.rows === last.rows) {
      return;
    }
    lastSizeRef.current = { cols: dims.cols, rows: dims.rows };

    if (terminal.cols !== dims.cols || terminal.rows !== dims.rows) {
      terminal.resize(dims.cols, dims.rows);
    }

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(encodeTerminalClientMessage({
        type: 'resize',
        cols: dims.cols,
        rows: dims.rows,
      }));
    }
  }, [proposeFrameDimensions]);

  const sendInput = useCallback((data: string) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(encodeTerminalClientMessage({ type: 'input', data }));
    }
  }, []);

  const clearScreenTransform = useCallback(() => {
    const screen = terminalRef.current?.element?.querySelector<HTMLElement>('.xterm-screen');
    if (!screen) {
      return;
    }

    screen.style.transform = '';
    screen.style.transformOrigin = '';
    screen.style.willChange = '';
  }, []);

  const updateScrollbackAffordance = useCallback(() => {
    const terminal = terminalRef.current;
    const viewport = terminal?.element?.querySelector<HTMLElement>('.xterm-viewport');
    if (!terminal || !viewport) {
      return;
    }

    viewport.classList.toggle('has-scrollback', terminal.buffer.active.baseY > 0);
  }, []);

  // A scroll or an in-place TUI repaint changes what each viewport row should
  // show. Claude Code hits the paths where xterm may not issue a full viewport
  // refresh on its own: alt-screen mouse scrolling, in-place updates, and
  // streaming while the buffer moves under a fixed viewport. Force a full-range
  // refresh synchronously so it unions into xterm's current render frame.
  const forceFullRefresh = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.refresh(0, Math.max(0, terminal.rows - 1));
  }, []);

  // Resize only on whole-cell boundaries. Any sub-cell remainder stays blank.
  const resizeAfterLayoutSettles = useCallback(() => {
    fitAndResize();
    clearScreenTransform();

    // Coalesce a burst of ResizeObserver ticks into at most one fit per frame
    // so a live drag stays responsive without thrashing layout.
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      fitAndResize();
      clearScreenTransform();
    });

    // One trailing pass after the layout settles (drag end, tab switch,
    // settings panel toggle) to lock onto the final whole-cell grid.
    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [window.setTimeout(() => {
      fitAndResize();
      clearScreenTransform();
    }, 120)];
  }, [clearScreenTransform, fitAndResize]);

  // During a window drag, keep fitting to whole cells. Any sub-cell remainder
  // stays as blank space instead of scaling or clipping the character grid.
  const resizeDuringDrag = useCallback(() => {
    fitAndResize();
    clearScreenTransform();

    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      fitAndResize();
      clearScreenTransform();
    });

    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [
      window.setTimeout(() => {
        fitAndResize();
        clearScreenTransform();
      }, 180),
      window.setTimeout(clearScreenTransform, 320),
    ];
  }, [clearScreenTransform, fitAndResize]);

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
      fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
      fontSize: preferences.fontSize,
      lineHeight: 1.12,
      scrollback: 10000,
      theme: terminalTheme,
    });
    const fitAddon = new FitAddon();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(new WebglAddon());
    terminal.attachCustomKeyEventHandler((event) => {
      if (isCopyShortcut(event) && copyTerminalSelection(terminal, event)) {
        return false;
      }

      if (isPasteShortcut(event)) {
        return false;
      }

      return true;
    });
    terminal.attachCustomWheelEventHandler((event) => {
      const mouseTrackingEnabled = terminal.element?.classList.contains('enable-mouse-events') === true;
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

    terminal.open(container);
    updateScrollbackAffordance();
    terminal.writeln('\x1b[36mCloudCLI Terminal\x1b[0m');
    terminal.writeln('\x1b[90mConnecting...\x1b[0m');

    const socket = new WebSocket(createWebSocketUrl(authToken));
    socket.binaryType = 'arraybuffer';
    socketRef.current = socket;
    onStatusChange(tab.id, 'connecting');

    socket.addEventListener('open', () => {
      // Size the grid to the frame first, then announce it via init. Sending a
      // resize before init would be rejected by the server ("not initialized")
      // and flash an error line.
      const dims = proposeFrameDimensions();
      if (dims) {
        terminal.resize(dims.cols, dims.rows);
        lastSizeRef.current = { cols: dims.cols, rows: dims.rows };
      }
      socket.send(encodeTerminalClientMessage({
        type: 'init',
        sessionId: tab.id,
        cols: terminal.cols,
        rows: terminal.rows,
      }));
      resizeAfterLayoutSettles();
    });

    const handleTerminalServerMessage = async (raw: MessageEvent['data']) => {
      const message = await decodeTerminalServerMessage(raw);
      if (!message) {
        return;
      }

      if (message.type === 'ready') {
        terminal.clear();
        terminal.writeln(`\x1b[36mSession ${message.sessionId}\x1b[0m`);
        terminal.writeln(`\x1b[90m${message.cwd}\x1b[0m\r\n`);
        onStatusChange(tab.id, 'connected');
        updateScrollbackAffordance();
        resizeAfterLayoutSettles();
        forceFullRefresh();
        return;
      }

      if (message.type === 'output' && typeof message.data === 'string') {
        terminal.write(message.data, () => {
          forceFullRefresh();
        });
        return;
      }

      if (message.type === 'error' && typeof message.message === 'string') {
        terminal.writeln(`\r\n\x1b[31m${message.message}\x1b[0m`);
        onStatusChange(tab.id, 'error');
        return;
      }

      if (message.type === 'exit') {
        onStatusChange(tab.id, 'exited');
      }
    };

    let terminalMessageQueue = Promise.resolve();
    socket.addEventListener('message', (event) => {
      terminalMessageQueue = terminalMessageQueue
        .then(() => handleTerminalServerMessage(event.data))
        .catch(() => undefined);
    });

    socket.addEventListener('close', () => {
      onStatusChange(tab.id, 'disconnected');
    });

    socket.addEventListener('error', () => {
      onStatusChange(tab.id, 'error');
    });

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
      refreshAfterTerminalChange();
    });
    const resizeSubscription = terminal.onResize(() => {
      refreshAfterTerminalChange();
    });
    const pasteHandler = (event: ClipboardEvent) => {
      const data = event.clipboardData?.getData('text/plain');
      if (!data) {
        return;
      }

      event.preventDefault();
      terminal.focus();
      sendInput(data);
    };
    container.addEventListener('paste', pasteHandler);
    const copyHandler = (event: ClipboardEvent) => {
      copyTerminalSelection(terminal, event);
    };
    container.addEventListener('copy', copyHandler, true);

    const resizeObserver = new ResizeObserver(() => {
      if (activeRef.current) {
        resizeDuringDrag();
      }
    });
    resizeObserver.observe(container);

    return () => {
      clearResizeTimers();
      clearScreenTransform();
      dataSubscription.dispose();
      titleSubscription.dispose();
      scrollSubscription.dispose();
      writeParsedSubscription.dispose();
      resizeSubscription.dispose();
      container.removeEventListener('paste', pasteHandler);
      container.removeEventListener('copy', copyHandler, true);
      resizeObserver.disconnect();
      socket.close();
      terminal.dispose();
      socketRef.current = null;
      fitAddonRef.current = null;
      terminalRef.current = null;
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
    sendInput,
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
      terminal.focus();
    } else {
      terminal.blur();
    }
  }, [active, preferences.fontSize, resizeAfterLayoutSettles]);

  useEffect(() => {
    if (!active) {
      return;
    }

    resizeAfterLayoutSettles();
    terminalRef.current?.focus();
  }, [active, resizeAfterLayoutSettles]);

  return (
    <div className="terminal-pane">
      <div ref={containerRef} className="terminal-frame" />
    </div>
  );
}
