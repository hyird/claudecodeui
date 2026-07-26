import { FitAddon } from '@xterm/addon-fit';
import { ClipboardAddon } from '@xterm/addon-clipboard';
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
import { decodeTerminalServerMessage, encodeTerminalClientMessage } from './wsCodec';
import { openAuthenticatedSocket } from '../wsHost';

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
// Width of the scrollback scrollbar to reserve so the rightmost column is never
// rendered beneath it. MUST match `.xterm-viewport.has-scrollback::-webkit-scrollbar`
// in styles.css. xterm's own FitAddon reserves the same gutter (`- scrollBarWidth`).
const TERMINAL_SCROLLBAR_GUTTER = 6;
// Sub-pixel guard shaved off each fit axis so integer/HiDPI cell-size rounding can
// never round the last whole cell up past the frame edge (bottom row / right column).
const FIT_EDGE_GUARD_PX = 1;
// Reconnect backoff: the base delay doubles each consecutive failure up to the cap,
// so a flaky network is retried gently instead of hammered every second. Reset to the
// base on a successful open or when the user returns to the tab.
const TERMINAL_RECONNECT_DELAY_MS = 1000;
const TERMINAL_RECONNECT_MAX_DELAY_MS = 15000;
const TERMINAL_RESUME_PONG_TIMEOUT_MS = 2500;
// Active liveness check: while the tab is visible, ping on an interval so a silently
// dropped socket (common on weak/mobile networks, no close event) is detected and
// resumed. The pong window is deliberately generous so high latency is not mistaken
// for a dead connection and does not trigger a needless reconnect.
const TERMINAL_HEARTBEAT_INTERVAL_MS = 20000;
const TERMINAL_HEARTBEAT_PONG_TIMEOUT_MS = 8000;
const TERMINAL_INPUT_MAX_FRAME_BYTES = 4 * 1024;

type ReliableTerminalInputState = {
  streamId: string;
  nextSeq: number;
  pending: Map<number, string>;
};

const terminalInputEncoder = new TextEncoder();
const terminalInputDecoder = new TextDecoder();
const terminalInputStates = new Map<string, ReliableTerminalInputState>();

export function discardTerminalInputState(tabId: string) {
  terminalInputStates.delete(tabId);
}

export function clearTerminalInputStates() {
  terminalInputStates.clear();
}

function getTerminalInputState(tabId: string) {
  let state = terminalInputStates.get(tabId);
  if (!state) {
    state = {
      streamId: crypto.randomUUID(),
      nextSeq: 1,
      pending: new Map(),
    };
    terminalInputStates.set(tabId, state);
  }
  return state;
}

function splitTerminalInput(data: string) {
  const bytes = terminalInputEncoder.encode(data);
  const frames: string[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    let end = Math.min(offset + TERMINAL_INPUT_MAX_FRAME_BYTES, bytes.length);
    while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    frames.push(terminalInputDecoder.decode(bytes.subarray(offset, end)));
    offset = end;
  }

  return frames;
}

function createTerminalSocket(authToken: string) {
  return openAuthenticatedSocket('/terminal', authToken);
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.cssText = 'position:fixed;top:-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function copyText(text: string) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
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
  const terminalReadyRef = useRef(false);
  const inputStateRef = useRef(getTerminalInputState(tab.id));
  const activeRef = useRef(active);
  const resizeTimersRef = useRef<number[]>([]);
  const resizeFrameRef = useRef(0);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });
  const screenElementRef = useRef<HTMLElement | null>(null);
  const viewportElementRef = useRef<HTMLElement | null>(null);
  const hasScrollbackRef = useRef(false);

  // xterm builds .xterm-screen and .xterm-viewport once in terminal.open() and keeps
  // them for the terminal's lifetime, but the scrollback affordance runs off every
  // parsed write and every scroll — re-querying the DOM there costs a tree walk per
  // frame of output. Resolve each once and reuse it; isConnected re-resolves if xterm
  // ever rebuilds its DOM.
  const readScreenElement = useCallback(() => {
    if (!screenElementRef.current?.isConnected) {
      screenElementRef.current = terminalRef.current?.element
        ?.querySelector<HTMLElement>('.xterm-screen') ?? null;
    }
    return screenElementRef.current;
  }, []);

  const readViewportElement = useCallback(() => {
    if (!viewportElementRef.current?.isConnected) {
      viewportElementRef.current = terminalRef.current?.element
        ?.querySelector<HTMLElement>('.xterm-viewport') ?? null;
    }
    return viewportElementRef.current;
  }, []);

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
    const screen = readScreenElement();
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
    // Reserve the scrollbar's gutter (as xterm's FitAddon does) so the rightmost
    // column is never clipped beneath the scrollback scrollbar once it appears.
    const scrollbarGutter = terminal.options.scrollback ? TERMINAL_SCROLLBAR_GUTTER : 0;
    const availWidth = container.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - scrollbarGutter - FIT_EDGE_GUARD_PX;
    const availHeight = container.clientHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      - FIT_EDGE_GUARD_PX;

    return {
      cols: Math.max(MIN_TERMINAL_COLS, Math.floor(availWidth / cellWidth)),
      rows: Math.max(MIN_TERMINAL_ROWS, Math.floor(availHeight / cellHeight)),
    };
  }, [readScreenElement]);

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
    if (!data) {
      return;
    }

    const inputState = inputStateRef.current;
    const socket = socketRef.current;
    let canSend = terminalReadyRef.current && socket?.readyState === WebSocket.OPEN;

    for (const frame of splitTerminalInput(data)) {
      const inputSeq = inputState.nextSeq;
      inputState.nextSeq += 1;
      inputState.pending.set(inputSeq, frame);

      if (!canSend || !socket) {
        continue;
      }

      try {
        socket.send(encodeTerminalClientMessage({ type: 'input', data: frame, inputSeq }));
      } catch {
        terminalReadyRef.current = false;
        canSend = false;
        socket.close();
      }
    }
  }, []);

  const clearScreenTransform = useCallback(() => {
    const screen = readScreenElement();
    if (!screen) {
      return;
    }

    screen.style.transform = '';
    screen.style.transformOrigin = '';
    screen.style.willChange = '';
  }, [readScreenElement]);

  const updateScrollbackAffordance = useCallback(() => {
    const terminal = terminalRef.current;
    const viewport = readViewportElement();
    if (!terminal || !viewport) {
      return;
    }

    // Runs on every parsed write, so skip the class mutation unless the state flipped.
    const hasScrollback = terminal.buffer.active.baseY > 0;
    if (hasScrollback === hasScrollbackRef.current) {
      return;
    }
    hasScrollbackRef.current = hasScrollback;
    viewport.classList.toggle('has-scrollback', hasScrollback);
  }, [readViewportElement]);

  // A scroll or an in-place TUI repaint changes what each viewport row should
  // show. Full-screen TUIs hit paths where xterm may not issue a full viewport
  // refresh on its own: alt-screen mouse scrolling, in-place updates, and streaming
  // while the buffer moves under a fixed viewport. Force a full-range
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
    terminal.loadAddon(new ClipboardAddon());

    terminal.open(container);
    // xterm 6.0.0's bundled DECRPM handler throws while Vim probes terminal
    // modes. Handle the probes first so xterm's write queue stays alive.
    const registerModeReportGuard = (ansi: boolean) => terminal.parser.registerCsiHandler({
      prefix: ansi ? undefined : '?',
      intermediates: '$',
      final: 'p',
    }, (params) => {
      const value = params[0];
      const mode = typeof value === 'number' ? value : (value?.[0] ?? 0);
      terminal.input(`\x1b[${ansi ? '' : '?'}${mode};0$y`, false);
      return true;
    });
    const ansiModeReportGuard = registerModeReportGuard(true);
    const privateModeReportGuard = registerModeReportGuard(false);

    // Input handling mirrors cloudcli-plugin-terminal's TerminalSession.
    terminal.attachCustomKeyEventHandler((event) => {
      if (event.type !== 'keydown') return true;
      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === 'c' && terminal.hasSelection()) {
        event.preventDefault();
        copyText(terminal.getSelection());
        return false;
      }
      if (mod && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        navigator.clipboard?.readText?.().then((text) => text && sendInput(text)).catch(() => {});
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

    updateScrollbackAffordance();
    terminal.writeln('\x1b[36mCloud Terminal\x1b[0m');
    terminal.writeln('\x1b[90mConnecting...\x1b[0m');

    let lastAppliedTerminalSeq = 0;
    const pendingTerminalMessages = new Map<number, TerminalServerMessage>();
    let terminalResyncTimer = 0;

    const writeTerminalData = (data: string) => {
      terminal.write(data);
      try {
        forceFullRefresh();
      } catch {
        // Rendering is best-effort and must never block later terminal frames.
      }
    };

    function clearTerminalResyncTimer() {
      if (terminalResyncTimer) {
        window.clearTimeout(terminalResyncTimer);
        terminalResyncTimer = 0;
      }
    }

    function scheduleTerminalResync(socket: WebSocket) {
      if (terminalResyncTimer) {
        return;
      }

      terminalResyncTimer = window.setTimeout(() => {
        terminalResyncTimer = 0;
        if (socketRef.current === socket) {
          pendingTerminalMessages.clear();
          lastAppliedTerminalSeq = 0;
          socket.close(1011, 'Terminal sequence gap');
        }
      }, 250);
    }

    const applyTerminalServerMessage = async (socket: WebSocket, message: TerminalServerMessage) => {
      if (message.type === 'ready') {
        if (message.reset) {
          pendingTerminalMessages.clear();
          lastAppliedTerminalSeq = typeof message.lastSeq === 'number' ? message.lastSeq : 0;
          terminal.clear();
          terminal.writeln(`\x1b[36mSession ${message.sessionId}\x1b[0m`);
          terminal.writeln(`\x1b[90m${message.cwd}\x1b[0m\r\n`);
        }
        terminalReadyRef.current = true;
        for (const [inputSeq, data] of inputStateRef.current.pending) {
          if (socketRef.current !== socket || socket.readyState !== WebSocket.OPEN) {
            terminalReadyRef.current = false;
            break;
          }
          try {
            socket.send(encodeTerminalClientMessage({ type: 'input', data, inputSeq }));
          } catch {
            terminalReadyRef.current = false;
            socket.close();
            break;
          }
        }
        onStatusChange(tab.id, 'connected');
        updateScrollbackAffordance();
        resizeAfterLayoutSettles();
        forceFullRefresh();
        return;
      }

      if (message.type === 'output' && typeof message.data === 'string') {
        writeTerminalData(message.data);
        return;
      }

      if (message.type === 'error' && typeof message.message === 'string') {
        terminal.writeln(`\r\n\x1b[31m${message.message}\x1b[0m`);
        onStatusChange(tab.id, 'error');
        return;
      }

      if (message.type === 'exit') {
        onStatusChange(tab.id, 'exited');
        return;
      }

      if (message.type === 'pong') {
        clearPongTimer();
        return;
      }

      if (message.type === 'input-ack' && typeof message.inputSeq === 'number') {
        for (const inputSeq of inputStateRef.current.pending.keys()) {
          if (inputSeq <= message.inputSeq) {
            inputStateRef.current.pending.delete(inputSeq);
          }
        }
        return;
      }
    };

    const applyOrderedTerminalServerMessage = async (socket: WebSocket, message: TerminalServerMessage) => {
      if (typeof message.seq !== 'number' || message.seq <= 0 || message.type === 'ready') {
        await applyTerminalServerMessage(socket, message);
        return;
      }

      if (message.seq <= lastAppliedTerminalSeq) {
        return;
      }

      if (message.seq > lastAppliedTerminalSeq + 1) {
        pendingTerminalMessages.set(message.seq, message);
        scheduleTerminalResync(socket);
        return;
      }

      await applyTerminalServerMessage(socket, message);
      lastAppliedTerminalSeq = message.seq;

      while (pendingTerminalMessages.has(lastAppliedTerminalSeq + 1)) {
        const nextSeq = lastAppliedTerminalSeq + 1;
        const nextMessage = pendingTerminalMessages.get(nextSeq)!;
        pendingTerminalMessages.delete(nextSeq);
        await applyTerminalServerMessage(socket, nextMessage);
        lastAppliedTerminalSeq = nextSeq;
      }

      if (pendingTerminalMessages.size === 0) {
        clearTerminalResyncTimer();
      }
    };

    const handleTerminalServerMessage = async (socket: WebSocket, raw: MessageEvent['data']) => {
      const message = await decodeTerminalServerMessage(raw);
      if (!message || socketRef.current !== socket) {
        return;
      }

      await applyOrderedTerminalServerMessage(socket, message);
    };

    let disposed = false;
    let reconnectTimer = 0;
    let reconnectAttempts = 0;
    let heartbeatTimer = 0;
    let pongTimer = 0;
    let terminalMessageQueue = Promise.resolve();

    function clearReconnectTimer() {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = 0;
      }
    }

    function clearPongTimer() {
      if (pongTimer) {
        window.clearTimeout(pongTimer);
        pongTimer = 0;
      }
    }

    function scheduleReconnect() {
      if (disposed || reconnectTimer) {
        return;
      }
      onStatusChange(tab.id, 'disconnected');
      const backoff = Math.min(
        TERMINAL_RECONNECT_MAX_DELAY_MS,
        TERMINAL_RECONNECT_DELAY_MS * 2 ** reconnectAttempts,
      );
      reconnectAttempts += 1;
      // Equal jitter (half fixed, half random) keeps a floor delay while spreading
      // retries so many panes dropping together don't reconnect in lockstep.
      const delay = backoff / 2 + Math.random() * (backoff / 2);
      reconnectTimer = window.setTimeout(connect, delay);
    }

    function connect() {
      if (disposed) {
        return;
      }

      const currentSocket = socketRef.current;
      if (
        currentSocket
        && (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING)
      ) {
        return;
      }

      clearReconnectTimer();
      clearPongTimer();
      terminalReadyRef.current = false;

      const socket = createTerminalSocket(authToken);
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;
      onStatusChange(tab.id, 'connecting');

      socket.addEventListener('open', () => {
        if (disposed || socketRef.current !== socket) {
          return;
        }

        // Transport is healthy again — restart backoff from the base delay.
        reconnectAttempts = 0;

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
          lastSeq: lastAppliedTerminalSeq,
          inputStreamId: inputStateRef.current.streamId,
        }));
        resizeAfterLayoutSettles();
      });

      socket.addEventListener('message', (event) => {
        if (socketRef.current !== socket) {
          return;
        }

        terminalMessageQueue = terminalMessageQueue
          .then(() => handleTerminalServerMessage(socket, event.data))
          .catch(() => undefined);
      });

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) {
          socketRef.current = null;
          terminalReadyRef.current = false;
          clearPongTimer();
          clearTerminalResyncTimer();
          scheduleReconnect();
        }
      });

      socket.addEventListener('error', () => {
        if (socketRef.current === socket) {
          terminalReadyRef.current = false;
          onStatusChange(tab.id, 'error');
          socket.close();
          scheduleReconnect();
        }
      });
    }

    // Ping the socket and reconnect if no pong lands within pongTimeoutMs. A dead or
    // closed socket reconnects immediately; a live one just confirms liveness.
    const probeConnection = (pongTimeoutMs: number) => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      const socket = socketRef.current;
      if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
        scheduleReconnect();
        return;
      }

      if (socket.readyState !== WebSocket.OPEN) {
        return;
      }

      clearPongTimer();
      try {
        socket.send(encodeTerminalClientMessage({ type: 'ping' }));
      } catch {
        socketRef.current = null;
        socket.close();
        scheduleReconnect();
        return;
      }

      pongTimer = window.setTimeout(() => {
        if (socketRef.current !== socket) {
          return;
        }

        socketRef.current = null;
        socket.close();
        scheduleReconnect();
      }, pongTimeoutMs);
    };

    // The user just came back to the tab: reconnect promptly (skip the backoff ramp)
    // and use the tight pong window since a slept socket is usually already dead.
    const probeConnectionAfterResume = () => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      reconnectAttempts = 0;
      probeConnection(TERMINAL_RESUME_PONG_TIMEOUT_MS);
    };

    document.addEventListener('visibilitychange', probeConnectionAfterResume);
    window.addEventListener('focus', probeConnectionAfterResume);
    // Passive heartbeat: catches a silently dropped socket while the tab stays open.
    heartbeatTimer = window.setInterval(
      () => probeConnection(TERMINAL_HEARTBEAT_PONG_TIMEOUT_MS),
      TERMINAL_HEARTBEAT_INTERVAL_MS,
    );
    connect();

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
    const resizeObserver = new ResizeObserver(() => {
      if (activeRef.current) {
        resizeDuringDrag();
      }
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      terminalReadyRef.current = false;
      clearResizeTimers();
      clearReconnectTimer();
      clearPongTimer();
      if (heartbeatTimer) {
        window.clearInterval(heartbeatTimer);
        heartbeatTimer = 0;
      }
      clearTerminalResyncTimer();
      clearScreenTransform();
      dataSubscription.dispose();
      titleSubscription.dispose();
      scrollSubscription.dispose();
      writeParsedSubscription.dispose();
      resizeSubscription.dispose();
      ansiModeReportGuard.dispose();
      privateModeReportGuard.dispose();
      document.removeEventListener('visibilitychange', probeConnectionAfterResume);
      window.removeEventListener('focus', probeConnectionAfterResume);
      resizeObserver.disconnect();
      socketRef.current?.close();
      terminal.dispose();
      socketRef.current = null;
      fitAddonRef.current = null;
      terminalRef.current = null;
      // The cached nodes belong to the disposed terminal, and the affordance state
      // must not leak into the next one or its first toggle would be skipped.
      screenElementRef.current = null;
      viewportElementRef.current = null;
      hasScrollbackRef.current = false;
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
