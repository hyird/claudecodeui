import { ClipboardAddon } from '@xterm/addon-clipboard';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal } from '@xterm/xterm';
import { useCallback, useEffect, useRef } from 'react';

import { terminalTheme } from './themes';
import type {
  TerminalPreferences,
  TerminalServerMessage,
  TerminalStatus,
  TerminalTab,
} from './types';

type TerminalPaneProps = {
  tab: TerminalTab;
  active: boolean;
  authToken: string;
  preferences: TerminalPreferences;
  onStatusChange: (tabId: string, status: TerminalStatus) => void;
  onTitleChange: (tabId: string, title: string) => void;
};

const MAX_DRAG_UPSCALE = 1.22;

function createWebSocketUrl(authToken: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const url = new URL(`${protocol}//${window.location.host}/terminal`);
  url.searchParams.set('token', authToken);
  return url.toString();
}

function parseServerMessage(raw: MessageEvent['data']): TerminalServerMessage | null {
  try {
    return JSON.parse(String(raw)) as TerminalServerMessage;
  } catch {
    return null;
  }
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

  // Fit the grid to the frame, but only do the expensive work — grid resize,
  // repaint and PTY reflow — when the cell count actually changes. A character
  // terminal can only grow/shrink one whole cell at a time, so most resize
  // frames leave cols/rows untouched; forwarding those no-op sizes to node-pty
  // floods ConPTY with redundant reflows and makes dragging lag behind the
  // window edge.
  const fitAndResize = useCallback(() => {
    const terminal = terminalRef.current;
    const fitAddon = fitAddonRef.current;
    const socket = socketRef.current;
    if (!terminal || !fitAddon) {
      return;
    }

    let dims: { cols: number; rows: number } | undefined;
    try {
      dims = fitAddon.proposeDimensions();
    } catch {
      return;
    }
    if (!dims || !Number.isFinite(dims.cols) || !Number.isFinite(dims.rows)) {
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
      socket.send(JSON.stringify({
        type: 'resize',
        cols: dims.cols,
        rows: dims.rows,
      }));
    }
  }, []);

  const sendInput = useCallback((data: string) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'input', data }));
    }
  }, []);

  const clearScreenScale = useCallback(() => {
    const screen = terminalRef.current?.element?.querySelector<HTMLElement>('.xterm-screen');
    if (!screen) {
      return;
    }

    screen.style.transform = '';
    screen.style.transformOrigin = '';
    screen.style.willChange = '';
  }, []);

  // Between cell boundaries the character grid can be a few pixels larger than
  // the frame (a grid only snaps a whole cell at a time, and xterm re-renders
  // async). Left alone, `overflow: hidden` clips the last row/column. This
  // pass scales the rendered grid down just enough to stay inside the frame —
  // and clears the transform the moment it fits, so text is crisp at rest.
  const clampScaleToFrame = useCallback((allowGrow = false) => {
    const terminal = terminalRef.current;
    const container = containerRef.current;
    const screen = terminal?.element?.querySelector<HTMLElement>('.xterm-screen');
    if (!container || !screen) {
      return;
    }

    const gridWidth = screen.offsetWidth;
    const gridHeight = screen.offsetHeight;
    if (gridWidth <= 0 || gridHeight <= 0) {
      return;
    }

    const style = window.getComputedStyle(container);
    const availWidth = container.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const availHeight = container.clientHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);

    const fitScale = Math.min(availWidth / gridWidth, availHeight / gridHeight);
    const scale = allowGrow
      ? Math.min(MAX_DRAG_UPSCALE, fitScale)
      : Math.min(1, fitScale);

    if (scale > 0.999 && scale < 1.001) {
      screen.style.transform = '';
      screen.style.transformOrigin = '';
      screen.style.willChange = '';
    } else {
      screen.style.transformOrigin = '0 0';
      screen.style.willChange = 'transform';
      screen.style.transform = `scale(${scale})`;
    }
  }, []);

  const resizeAfterLayoutSettles = useCallback(() => {
    // Coalesce a burst of ResizeObserver ticks into at most one fit per frame
    // so a live drag stays responsive without thrashing layout.
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      fitAndResize();
      clearScreenScale();
    });

    // One trailing pass after the layout settles (drag end, tab switch,
    // settings panel toggle) to lock onto the final size and crisp scale.
    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [window.setTimeout(() => {
      fitAndResize();
      clearScreenScale();
    }, 120)];
  }, [clearScreenScale, fitAndResize]);

  // During a window drag, full-screen TUIs such as Claude repaint the whole
  // alternate screen whenever the PTY size changes. Scale the current grid
  // during drag, then resize xterm/PTY once after the layout settles.
  const resizeDuringDrag = useCallback(() => {
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      clampScaleToFrame(true);
    });

    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [
      window.setTimeout(() => {
        fitAndResize();
        clearScreenScale();
      }, 180),
      // Converge after xterm's async re-render so any lingering shrink-scale is
      // cleared and text ends up pixel-crisp.
      window.setTimeout(clearScreenScale, 320),
    ];
  }, [clampScaleToFrame, clearScreenScale, fitAndResize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || terminalRef.current) {
      return;
    }

    const terminal = new Terminal({
      allowProposedApi: true,
      cursorBlink: true,
      cursorStyle: 'bar',
      fontFamily: '"Cascadia Code", "JetBrains Mono", Consolas, monospace',
      fontSize: preferences.fontSize,
      lineHeight: 1.12,
      scrollback: 10000,
      theme: terminalTheme,
      windowsMode: true,
    });
    const fitAddon = new FitAddon();

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(new WebLinksAddon());
    terminal.loadAddon(new ClipboardAddon());

    terminal.open(container);
    terminal.writeln('\x1b[36mCloudCLI Terminal\x1b[0m');
    terminal.writeln('\x1b[90mConnecting...\x1b[0m');

    const socket = new WebSocket(createWebSocketUrl(authToken));
    socketRef.current = socket;
    onStatusChange(tab.id, 'connecting');

    socket.addEventListener('open', () => {
      // Size the grid to the frame first, then announce it via init. Sending a
      // resize before init would be rejected by the server ("not initialized")
      // and flash an error line.
      const dims = fitAddon.proposeDimensions();
      if (dims && Number.isFinite(dims.cols) && Number.isFinite(dims.rows)) {
        terminal.resize(dims.cols, dims.rows);
        lastSizeRef.current = { cols: dims.cols, rows: dims.rows };
      }
      socket.send(JSON.stringify({
        type: 'init',
        sessionId: tab.id,
        cols: terminal.cols,
        rows: terminal.rows,
      }));
      resizeAfterLayoutSettles();
    });

    socket.addEventListener('message', (event) => {
      const message = parseServerMessage(event.data);
      if (!message) {
        return;
      }

      if (message.type === 'ready') {
        terminal.clear();
        terminal.writeln(`\x1b[36mSession ${message.sessionId}\x1b[0m`);
        terminal.writeln(`\x1b[90m${message.cwd}\x1b[0m\r\n`);
        onStatusChange(tab.id, 'connected');
        resizeAfterLayoutSettles();
        return;
      }

      if (message.type === 'output' && typeof message.data === 'string') {
        terminal.write(message.data);
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

    const resizeObserver = new ResizeObserver(() => {
      if (activeRef.current) {
        resizeDuringDrag();
      }
    });
    resizeObserver.observe(container);

    return () => {
      clearResizeTimers();
      clearScreenScale();
      dataSubscription.dispose();
      titleSubscription.dispose();
      container.removeEventListener('paste', pasteHandler);
      resizeObserver.disconnect();
      socket.close();
      terminal.dispose();
      socketRef.current = null;
      fitAddonRef.current = null;
      terminalRef.current = null;
    };
  }, [
    clearResizeTimers,
    clearScreenScale,
    fitAndResize,
    onStatusChange,
    onTitleChange,
    resizeAfterLayoutSettles,
    resizeDuringDrag,
    sendInput,
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
