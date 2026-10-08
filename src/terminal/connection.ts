import type { Terminal } from '@xterm/xterm';
import type { TerminalServerMessage, TerminalStatus } from './types';
import { decodeTerminalServerMessage, encodeTerminalClientMessage } from './wsCodec';
import { openAuthenticatedSocket } from '../wsHost';
import { getTerminalInputState, splitTerminalInput } from './input-state';

// Reconnect backoff: the base delay doubles each consecutive failure up to the cap,
// so a flaky network is retried gently instead of hammered every second. Reset to the
// base on a successful open or when the user returns to the tab.
const TERMINAL_RECONNECT_DELAY_MS = 1000;
const TERMINAL_RECONNECT_MAX_DELAY_MS = 15000;
const TERMINAL_CONNECT_TIMEOUT_MS = 10000;
const TERMINAL_RESUME_PONG_TIMEOUT_MS = 2500;
// Active liveness check: while the tab is visible, ping on an interval so a silently
// dropped socket (common on weak/mobile networks, no close event) is detected and
// resumed. The pong window is deliberately generous so high latency is not mistaken
// for a dead connection and does not trigger a needless reconnect.
const TERMINAL_HEARTBEAT_INTERVAL_MS = 20000;
const TERMINAL_HEARTBEAT_PONG_TIMEOUT_MS = 8000;

function createTerminalSocket(authToken: string) {
  return openAuthenticatedSocket('/terminal/output', authToken);
}


type ConnectionOptions = {
  terminal: Terminal;
  tabId: string;
  authToken: string;
  onStatusChange: (tabId: string, status: TerminalStatus) => void;
  beforeInit: () => void;
  afterInit: () => void;
  onReady: () => void;
  onSessionRebuilt: (visible: boolean) => void;
};

export type TerminalConnection = ReturnType<typeof connectTerminal>;

export function connectTerminal({
  terminal, tabId, authToken, onStatusChange, beforeInit, afterInit, onReady, onSessionRebuilt,
}: ConnectionOptions) {
  let currentOutputSocket: WebSocket | null = null;
  let currentInputSocket: WebSocket | null = null;
  let inputReady = false;
  let disposed = false;
  const inputState = getTerminalInputState(tabId);

  function sendInput(data: string) {
    if (!data) {
      return;
    }

    const socket = currentInputSocket;
    let canSend = inputReady && socket?.readyState === WebSocket.OPEN;

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
        inputReady = false;
        canSend = false;
        socket.close();
      }
    }
  }

  let lastAppliedTerminalSeq = 0;
  const pendingTerminalMessages = new Map<number, TerminalServerMessage>();
  let terminalResyncTimer = 0;
  let awaitingSnapshot: WebSocket | null = null;

  const writeTerminalData = (data: string) => {
    terminal.write(data);
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
      if (currentOutputSocket === socket) {
        pendingTerminalMessages.clear();
        lastAppliedTerminalSeq = 0;
        socket.close(1011, 'Terminal sequence gap');
      }
    }, 250);
  }

  const applyTerminalServerMessage = async (socket: WebSocket, message: TerminalServerMessage) => {
    if (message.type === 'ready') {
      const sessionGeneration = typeof message.sessionGeneration === 'string'
        ? message.sessionGeneration
        : '';
      if (sessionGeneration) {
        if (inputState.generation && inputState.generation !== sessionGeneration) {
          const discardedPendingInput = inputState.pending.size > 0;
          inputState.pending.clear();
          inputState.nextSeq = 1;
          if (discardedPendingInput) {
            onSessionRebuilt(true);
          }
        }
        inputState.generation = sessionGeneration;
      }
      if (message.reset) {
        pendingTerminalMessages.clear();
        lastAppliedTerminalSeq = typeof message.lastSeq === 'number' ? message.lastSeq : 0;
        // Retain the existing display until the complete snapshot arrives.
        awaitingSnapshot = socket;
        return;
      }
      awaitingSnapshot = null;
      connectInputSocket(socket);
      onReady();
      return;
    }

    if (message.type === 'output' && typeof message.data === 'string') {
      if (awaitingSnapshot === socket) {
        await new Promise<void>((resolve) => {
          // One write and DEC 2026 prevent painting intermediate history rows.
          terminal.write(`\x1bc\x1b[?2026h${message.data}\x1b[?2026l`, () => {
            if (!disposed && currentOutputSocket === socket && awaitingSnapshot === socket
              && socket.readyState === WebSocket.OPEN) {
              awaitingSnapshot = null;
              terminal.scrollToBottom();
              onReady();
              connectInputSocket(socket);
            }
            resolve();
          });
        });
        return;
      }
      writeTerminalData(message.data);
      return;
    }

    if (message.type === 'error' && typeof message.message === 'string') {
      terminal.writeln(`\r\n\x1b[31m${message.message}\x1b[0m`);
      onStatusChange(tabId, 'error');
      return;
    }

    if (message.type === 'exit') {
      closeInputSocket();
      onStatusChange(tabId, 'exited');
      return;
    }

    if (message.type === 'pong') {
      clearPongTimer();
      return;
    }

    if (message.type === 'input-ack' && typeof message.inputSeq === 'number') {
      for (const inputSeq of inputState.pending.keys()) {
        if (inputSeq > message.inputSeq) break;
        inputState.pending.delete(inputSeq);
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
    if (!message || currentOutputSocket !== socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    await applyOrderedTerminalServerMessage(socket, message);
  };

  let reconnectTimer = 0;
  let reconnectAttempts = 0;
  let heartbeatTimer = 0;
  let connectionTimer = 0;
  let pongTimer = 0;
  let inputConnectionTimer = 0;
  let inputPongTimer = 0;
  let terminalMessageQueue = Promise.resolve();

  function closeInputSocket() {
    inputReady = false;
    window.clearTimeout(inputConnectionTimer);
    window.clearTimeout(inputPongTimer);
    inputConnectionTimer = 0;
    inputPongTimer = 0;
    const inputSocket = currentInputSocket;
    currentInputSocket = null;
    inputSocket?.close();
  }

  function connectInputSocket(outputSocket: WebSocket) {
    if (disposed || currentOutputSocket !== outputSocket || outputSocket.readyState !== WebSocket.OPEN) return;
    closeInputSocket();
    const inputSocket = openAuthenticatedSocket('/terminal/input', authToken);
    inputSocket.binaryType = 'arraybuffer';
    currentInputSocket = inputSocket;
    // A separate queue keeps input acknowledgements and pongs independent of
    // output decoding, replay and rendering work on the downlink.
    let inputMessageQueue = Promise.resolve();
    const failInputConnection = () => {
      if (currentInputSocket !== inputSocket) return;
      closeInputSocket();
      outputSocket.close();
    };
    inputConnectionTimer = window.setTimeout(failInputConnection, TERMINAL_CONNECT_TIMEOUT_MS);
    inputSocket.addEventListener('open', () => {
      if (currentInputSocket !== inputSocket) return;
      if (currentOutputSocket !== outputSocket || outputSocket.readyState !== WebSocket.OPEN) {
        failInputConnection();
        return;
      }
      try {
        inputSocket.send(encodeTerminalClientMessage({
          type: 'init', sessionId: tabId,
          cols: terminal.cols, rows: terminal.rows,
          inputStreamId: inputState.streamId,
          sessionGeneration: inputState.generation,
        }));
      } catch {
        failInputConnection();
      }
    });
    inputSocket.addEventListener('message', (event) => {
      inputMessageQueue = inputMessageQueue.then(async () => {
        const message = await decodeTerminalServerMessage(event.data);
        if (disposed || currentInputSocket !== inputSocket
          || currentOutputSocket !== outputSocket || !message) return;
        if (message.type === 'ready') {
          if (message.sessionGeneration !== inputState.generation) {
            failInputConnection();
            return;
          }
          window.clearTimeout(inputConnectionTimer);
          inputConnectionTimer = 0;
          inputReady = true;
          for (const [inputSeq, data] of inputState.pending) {
            inputSocket.send(encodeTerminalClientMessage({ type: 'input', data, inputSeq }));
          }
          inputSocket.send(encodeTerminalClientMessage({
            type: 'resize', cols: terminal.cols, rows: terminal.rows,
          }));
          reconnectAttempts = 0;
          onStatusChange(tabId, 'connected');
        } else if (message.type === 'pong') {
          window.clearTimeout(inputPongTimer);
          inputPongTimer = 0;
        } else if (message.type === 'input-ack') {
          await applyTerminalServerMessage(inputSocket, message);
        } else if (message.type === 'error') {
          // An output replacement can overtake the input handshake. Retry the
          // pair without inserting this recoverable transport error into the TUI.
          if (message.message === 'Terminal output connection is not ready') {
            failInputConnection();
            return;
          }
          await applyTerminalServerMessage(inputSocket, message);
          failInputConnection();
        }
      }).catch(failInputConnection);
    });
    inputSocket.addEventListener('close', failInputConnection);
    inputSocket.addEventListener('error', failInputConnection);
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = 0;
    }
  }

  function clearConnectionTimer() {
    if (connectionTimer) {
      window.clearTimeout(connectionTimer);
      connectionTimer = 0;
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
    onStatusChange(tabId, 'disconnected');
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

    const currentSocket = currentOutputSocket;
    if (
      currentSocket
      && (currentSocket.readyState === WebSocket.OPEN || currentSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    clearReconnectTimer();
    clearConnectionTimer();
    clearPongTimer();
    closeInputSocket();
    awaitingSnapshot = null;
    terminalMessageQueue = Promise.resolve();

    const socket = createTerminalSocket(authToken);
    socket.binaryType = 'arraybuffer';
    currentOutputSocket = socket;
    onStatusChange(tabId, 'connecting');
    connectionTimer = window.setTimeout(() => {
      if (disposed || currentOutputSocket !== socket) {
        return;
      }

      connectionTimer = 0;
      currentOutputSocket = null;
      inputReady = false;
      closeInputSocket();
      clearTerminalResyncTimer();
      socket.close();
      scheduleReconnect();
    }, TERMINAL_CONNECT_TIMEOUT_MS);

    socket.addEventListener('open', () => {
      if (disposed || currentOutputSocket !== socket) {
        return;
      }

      clearConnectionTimer();
      // Transport is healthy again — restart backoff from the base delay.
      reconnectAttempts = 0;

      // Size the grid to the frame first, then announce it via init. Sending a
      // resize before init would be rejected by the server ("not initialized")
      // and flash an error line.
      beforeInit();
      socket.send(encodeTerminalClientMessage({
        type: 'init',
        sessionId: tabId,
        cols: terminal.cols,
        rows: terminal.rows,
        lastSeq: lastAppliedTerminalSeq,
        inputStreamId: inputState.streamId,
        sessionGeneration: inputState.generation,
      }));
      afterInit();
    });

    socket.addEventListener('message', (event) => {
      if (currentOutputSocket !== socket) {
        return;
      }

      terminalMessageQueue = terminalMessageQueue
        .then(() => handleTerminalServerMessage(socket, event.data))
        .catch(() => undefined);
    });

    socket.addEventListener('close', () => {
      if (currentOutputSocket === socket) {
        currentOutputSocket = null;
        inputReady = false;
        closeInputSocket();
        clearConnectionTimer();
        clearPongTimer();
        clearTerminalResyncTimer();
        scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      if (currentOutputSocket === socket) {
        inputReady = false;
        closeInputSocket();
        clearConnectionTimer();
        onStatusChange(tabId, 'error');
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

    const socket = currentOutputSocket;
    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      scheduleReconnect();
      return;
    }

    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }

    if (pongTimer) {
      return;
    }

    try {
      socket.send(encodeTerminalClientMessage({ type: 'ping' }));
    } catch {
      currentOutputSocket = null;
      closeInputSocket();
      socket.close();
      scheduleReconnect();
      return;
    }

    pongTimer = window.setTimeout(() => {
      if (currentOutputSocket !== socket) {
        return;
      }

      pongTimer = 0;
      currentOutputSocket = null;
      closeInputSocket();
      socket.close();
      scheduleReconnect();
    }, pongTimeoutMs);

    const inputSocket = currentInputSocket;
    if (inputReady && inputSocket?.readyState === WebSocket.OPEN && !inputPongTimer) {
      try {
        inputSocket.send(encodeTerminalClientMessage({ type: 'ping' }));
        inputPongTimer = window.setTimeout(() => {
          inputPongTimer = 0;
          if (currentInputSocket === inputSocket) {
            closeInputSocket();
            socket.close();
          }
        }, pongTimeoutMs);
      } catch {
        closeInputSocket();
        socket.close();
      }
    }
  };

  // The user just came back to the tab: reconnect promptly (skip the backoff ramp)
  // and use the tight pong window since a slept socket is usually already dead.
  const probeConnectionAfterResume = () => {
    if (document.visibilityState === 'hidden') {
      return;
    }
    const socket = currentOutputSocket;
    reconnectAttempts = 0;

    if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      clearReconnectTimer();
      connect();
      return;
    }

    probeConnection(TERMINAL_RESUME_PONG_TIMEOUT_MS);
  };

  document.addEventListener('visibilitychange', probeConnectionAfterResume);
  window.addEventListener('focus', probeConnectionAfterResume);
  window.addEventListener('online', probeConnectionAfterResume);
  // Passive heartbeat: catches a silently dropped socket while the tab stays open.
  heartbeatTimer = window.setInterval(
    () => probeConnection(TERMINAL_HEARTBEAT_PONG_TIMEOUT_MS),
    TERMINAL_HEARTBEAT_INTERVAL_MS,
  );
  connect();


  function dispose() {
    disposed = true;
    awaitingSnapshot = null;
    inputReady = false;
    closeInputSocket();
    clearReconnectTimer();
    clearPongTimer();
    window.clearInterval(heartbeatTimer);
    clearTerminalResyncTimer();
    clearConnectionTimer();
    document.removeEventListener('visibilitychange', probeConnectionAfterResume);
    window.removeEventListener('focus', probeConnectionAfterResume);
    window.removeEventListener('online', probeConnectionAfterResume);
    currentOutputSocket?.close();
    currentOutputSocket = null;
  }

  return {
    sendInput, dispose,
    resize(cols: number, rows: number) {
      if (inputReady && currentInputSocket?.readyState === WebSocket.OPEN) {
        currentInputSocket.send(encodeTerminalClientMessage({ type: 'resize', cols, rows }));
      }
    },
  };
}
