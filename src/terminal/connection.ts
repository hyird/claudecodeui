import type { Terminal } from '@xterm/xterm';
import type { TerminalStatus } from './types';
import { decodeTerminalServerMessage, encodeTerminalClientMessage } from './wsCodec';
import { openAuthenticatedSocket } from '../wsHost';
import { getTerminalInputState, splitTerminalInput } from './input-state';
import terminalPolicy from '../../shared/terminal-policy.json';

const RECONNECT_DELAY_MS = 1000;
const RECONNECT_MAX_DELAY_MS = 15000;
const CONNECT_TIMEOUT_MS = 10000;
const RESUME_PONG_TIMEOUT_MS = 2500;
const HEARTBEAT_INTERVAL_MS = 20000;
const HEARTBEAT_PONG_TIMEOUT_MS = 8000;

type ConnectionOptions = {
  terminal: Terminal;
  tabId: string;
  authToken: string;
  onStatusChange: (tabId: string, status: TerminalStatus) => void;
  beforeInit: () => void;
  onReady: () => void;
  onSessionRebuilt: (visible: boolean) => void;
};

export type TerminalConnection = ReturnType<typeof connectTerminal>;

export function connectTerminal({
  terminal, tabId, authToken, onStatusChange, beforeInit, onReady, onSessionRebuilt,
}: ConnectionOptions) {
  let currentSocket: WebSocket | null = null;
  let disposed = false;
  let ready = false;
  let exited = false;
  let awaitingSnapshot = false;
  let snapshotGeometry: { cols: number; rows: number } | null = null;
  let desiredSize = { cols: terminal.cols, rows: terminal.rows };
  const inputState = getTerminalInputState(tabId);
  let reconnectAttempts = 0;
  let reconnectTimer = 0;
  let connectionTimer = 0;
  let pongTimer = 0;
  let outputAckTimer = 0;
  let outputAckSeq: number | null = null;
  let outputAckBytes = 0;

  const isCurrent = (socket: WebSocket) => !disposed && currentSocket === socket
    && socket.readyState === WebSocket.OPEN;

  function clearConnectionTimers() {
    window.clearTimeout(connectionTimer);
    window.clearTimeout(pongTimer);
    window.clearTimeout(outputAckTimer);
    connectionTimer = pongTimer = outputAckTimer = 0;
  }

  function scheduleReconnect() {
    if (disposed || exited || reconnectTimer) return;
    onStatusChange(tabId, 'disconnected');
    const delay = Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_DELAY_MS * 2 ** reconnectAttempts++);
    reconnectTimer = window.setTimeout(connect, delay / 2 + Math.random() * delay / 2);
  }

  function disconnect(socket: WebSocket) {
    if (currentSocket !== socket) return;
    currentSocket = null;
    ready = false;
    clearConnectionTimers();
    socket.close();
    scheduleReconnect();
  }

  function send(message: Parameters<typeof encodeTerminalClientMessage>[0]) {
    const socket = currentSocket;
    if (!socket || !isCurrent(socket)) return false;
    try {
      socket.send(encodeTerminalClientMessage(message));
      return true;
    } catch {
      disconnect(socket);
      return false;
    }
  }

  function flushOutputAck() {
    window.clearTimeout(outputAckTimer);
    outputAckTimer = 0;
    if (!ready || outputAckSeq === null) return;
    if (send({ type: 'output-ack', seq: outputAckSeq })) {
      outputAckSeq = null;
      outputAckBytes = 0;
    }
  }

  // Credit means parsed bytes, not merely received bytes. These sequence numbers
  // are flow-control receipts; WebSocket itself provides stream ordering.
  function outputParsed(socket: WebSocket, seq: number, bytes: number) {
    if (!isCurrent(socket)) return;
    outputAckSeq = Math.max(outputAckSeq ?? 0, seq);
    outputAckBytes += bytes;
    if (outputAckBytes >= terminalPolicy.outputAckBatchBytes) flushOutputAck();
    else if (!outputAckTimer) outputAckTimer = window.setTimeout(flushOutputAck, 50);
  }

  function sendInput(data: string) {
    for (const frame of splitTerminalInput(data)) {
      const inputSeq = inputState.nextSeq++;
      inputState.pending.set(inputSeq, frame);
      if (ready) send({ type: 'input', data: frame, inputSeq });
    }
  }

  function restoreSnapshot(socket: WebSocket, data: Uint8Array) {
    return new Promise<void>((resolve) => {
      // Queue the reset behind any old writes, then restore the saved geometry.
      // The native synchronized-output mode hides intermediate restore frames.
      terminal.write('\x1bc\x1b[?2026h', () => {
        if (!isCurrent(socket)) { resolve(); return; }
        if (snapshotGeometry) terminal.resize(snapshotGeometry.cols, snapshotGeometry.rows);
        terminal.write(data);
        terminal.write('\x1b[?2026l', resolve);
      });
    });
  }

  function finishRestore(socket: WebSocket, bytes: number) {
    if (!isCurrent(socket)) return;
    awaitingSnapshot = false;
    ready = true;
    reconnectAttempts = 0;
    window.clearTimeout(connectionTimer);
    connectionTimer = 0;
    outputParsed(socket, 0, bytes);
    flushOutputAck();
    // Retries keep their original sequence. The PTY owner deduplicates them,
    // including when the web service restarted after writing but before ACKing.
    for (const [inputSeq, data] of inputState.pending) {
      if (!send({ type: 'input', data, inputSeq })) return;
    }
    if (!send({ type: 'resize', ...desiredSize })) return;
    terminal.scrollToBottom();
    onStatusChange(tabId, 'connected');
    onReady();
  }

  async function handleMessage(socket: WebSocket, raw: MessageEvent['data']) {
    const message = await decodeTerminalServerMessage(raw);
    if (!isCurrent(socket)) return;
    if (!message) throw new Error('Invalid terminal message');
    switch (message.type) {
      case 'ready': {
        const generation = message.sessionGeneration as string;
        if (inputState.generation && inputState.generation !== generation) {
          const discardedInput = inputState.pending.size > 0;
          inputState.pending.clear();
          inputState.nextSeq = 1;
          if (discardedInput) onSessionRebuilt(true);
        }
        inputState.generation = generation;
        snapshotGeometry = typeof message.cols === 'number' && typeof message.rows === 'number'
          && message.cols > 0 && message.rows > 0 ? { cols: message.cols, rows: message.rows } : null;
        awaitingSnapshot = true;
        return;
      }
      case 'output': {
        if (!(message.data instanceof Uint8Array)) throw new Error('Invalid terminal output');
        if (awaitingSnapshot) {
          await restoreSnapshot(socket, message.data);
          finishRestore(socket, message.data.byteLength);
        } else {
          const seq = typeof message.seq === 'number' ? message.seq : 0;
          const data = message.data;
          terminal.write(data, () => outputParsed(socket, seq, data.byteLength));
        }
        return;
      }
      case 'resize':
        await new Promise<void>((resolve) => terminal.write('', () => {
          if (isCurrent(socket)) {
            terminal.resize(message.cols as number, message.rows as number);
            terminal.scrollToBottom();
          }
          resolve();
        }));
        return;
      case 'input-ack':
        for (const inputSeq of inputState.pending.keys()) {
          if (inputSeq > (message.inputSeq as number)) break;
          inputState.pending.delete(inputSeq);
        }
        return;
      case 'pong':
        window.clearTimeout(pongTimer);
        pongTimer = 0;
        return;
      case 'exit':
        exited = true;
        disconnect(socket);
        onStatusChange(tabId, 'exited');
        return;
      case 'error':
        throw new Error(String(message.message));
    }
  }

  function connect() {
    if (disposed || exited || currentSocket) return;
    window.clearTimeout(reconnectTimer);
    reconnectTimer = 0;
    clearConnectionTimers();
    ready = awaitingSnapshot = false;
    snapshotGeometry = null;
    outputAckSeq = null;
    outputAckBytes = 0;
    const socket = openAuthenticatedSocket('/terminal', authToken);
    socket.binaryType = 'arraybuffer';
    currentSocket = socket;
    onStatusChange(tabId, 'connecting');
    // This covers opening, server preparation and parsing the first snapshot.
    connectionTimer = window.setTimeout(() => disconnect(socket), CONNECT_TIMEOUT_MS);
    let messageQueue = Promise.resolve();
    socket.addEventListener('open', () => {
      if (!isCurrent(socket)) return;
      beforeInit();
      send({ type: 'init', sessionId: tabId, ...desiredSize, inputStreamId: inputState.streamId });
    });
    socket.addEventListener('message', (event) => {
      if (!isCurrent(socket)) return;
      // Decode and restore in arrival order, without an additional replay queue.
      messageQueue = messageQueue.then(() => handleMessage(socket, event.data)).catch(() => disconnect(socket));
    });
    socket.addEventListener('close', () => disconnect(socket));
    socket.addEventListener('error', () => disconnect(socket));
  }

  function probeConnection(timeout: number) {
    if (disposed || exited || document.visibilityState === 'hidden') return;
    const socket = currentSocket;
    if (!socket) { scheduleReconnect(); return; }
    if (socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
      disconnect(socket);
      return;
    }
    if (!isCurrent(socket) || pongTimer) return;
    if (send({ type: 'ping' })) pongTimer = window.setTimeout(() => disconnect(socket), timeout);
  }

  function resume() {
    if (document.visibilityState === 'hidden') return;
    if (currentSocket?.readyState === WebSocket.CLOSED || currentSocket?.readyState === WebSocket.CLOSING) {
      disconnect(currentSocket);
    }
    if (!currentSocket) {
      reconnectAttempts = 0;
      window.clearTimeout(reconnectTimer);
      reconnectTimer = 0;
      connect();
    } else {
      probeConnection(RESUME_PONG_TIMEOUT_MS);
    }
  }

  document.addEventListener('visibilitychange', resume);
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
  const heartbeatTimer = window.setInterval(() => probeConnection(HEARTBEAT_PONG_TIMEOUT_MS), HEARTBEAT_INTERVAL_MS);
  connect();

  return {
    sendInput,
    resize(cols: number, rows: number) {
      if (disposed) return false;
      desiredSize = { cols, rows };
      if (ready) send({ type: 'resize', cols, rows });
      return true;
    },
    dispose() {
      disposed = true;
      ready = false;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeatTimer);
      clearConnectionTimers();
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
      window.removeEventListener('online', resume);
      currentSocket?.close();
      currentSocket = null;
    },
  };
}
