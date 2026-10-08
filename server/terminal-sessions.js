import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn as ptySpawn } from 'bun-pty';
import { createTerminalEventLog, getTerminalReplayPlan } from './terminal-stream.js';
import { readTerminalInputStream, saveTerminalInputStream, deleteTerminalInputStream } from './terminal-state.js';
import { decodeTerminalClientMessage, encodeTerminalServerMessage } from './wire.js';
import { UUID_V4_PATTERN, readString, readNumber } from './terminal-validation.js';
import {
  WS_OPEN, createTerminalSnapshot, writeTerminalSnapshot, cancelTerminalOutputFlush,
  flushTerminalOutput, queueTerminalOutput, sendTerminalSnapshot, websocketWritable,
  readTerminalSnapshot, resizeSession, recordAndSendTerminalEvent,
  sendTerminalEvent,
} from './terminal-output.js';

function resolveShell() {
  if (os.platform() === 'win32') {
    return {
      command: process.env.ComSpec || 'powershell.exe',
      args: process.env.ComSpec ? [] : ['-NoLogo'],
    };
  }

  return {
    command: process.env.SHELL || '/bin/bash',
    args: [],
  };
}

function resolveCwd(requestedCwd) {
  const fallback = os.homedir() || process.cwd();
  const candidate = readString(requestedCwd, fallback).trim() || fallback;
  const resolved = path.resolve(candidate);

  try {
    if (fs.statSync(resolved).isDirectory()) {
      return resolved;
    }
  } catch {
    // Fall through to home.
  }

  return fallback;
}

export function createTerminalSessions({ sessions, persistentPty, workspaces }) {
  const { broadcastTabsState } = workspaces;

  function createSession(sessionId, options, workspace) {
    let cwd = resolveCwd(options.cwd);
    const shell = resolveShell();
    const env = {
      ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', FORCE_COLOR: '3',
      SSH_CLIENT: process.env.SSH_CLIENT || '127.0.0.1 0 0',
    };
    const persistent = persistentPty.prepare(sessionId, { cwd, cols: options.cols, rows: options.rows, shell, env });
    if (persistent) cwd = persistent.cwd;
    const terminalSnapshot = createTerminalSnapshot(persistent?.cols ?? options.cols, persistent?.rows ?? options.rows);
    const shellProcess = persistent?.pty ?? ptySpawn(shell.command, shell.args, {
      name: 'xterm-256color',
      cols: options.cols,
      rows: options.rows,
      cwd,
      env,
    });
    workspace.exitedTabs.delete(sessionId);

    const session = {
      id: sessionId,
      workspace,
      generation: persistent?.generation ?? randomUUID(),
      forceSnapshot: !!persistent,
      cwd,
      pty: shellProcess,
      terminal: terminalSnapshot.terminal,
      serializer: terminalSnapshot.serializer,
      mouseEncoding: terminalSnapshot.mouseEncoding,
      terminalSnapshot: terminalSnapshot.terminalSnapshot,
      snapshotDirty: false,
      socket: null,
      socketReady: false,
      inputSocket: null,
      pendingOutputEvents: 0,
      terminalEvents: createTerminalEventLog(),
      inputStreams: new Map(),
      closed: false,
      disposed: false,
      pendingOutput: [],
      pendingOutputBytes: 0,
      outputFlushTask: null,
      nextOutputFlushAt: 0,
    };

    shellProcess.onData((chunk) => {
      queueTerminalOutput(session, chunk);
    });
    if (persistent?.data) queueTerminalOutput(session, persistent.data);
    shellProcess.onDisconnect?.(() => {
      if (session.disposed) return;
      session.disposed = true;
      cancelTerminalOutputFlush(session);
      session.socket?.close(1011, 'PTY service disconnected');
      session.inputSocket?.close(1011, 'PTY service disconnected');
      if (sessions.get(sessionId) === session) sessions.delete(sessionId);
      session.terminal.dispose();
    });

    shellProcess.onExit(({ exitCode, signal }) => {
      if (session.disposed) return;
      // Drain buffered output first so the exit notice never overtakes the process's
      // own final bytes.
      flushTerminalOutput(session);
      session.closed = true;
      const suffix = signal ? ` (${signal})` : '';
      const message = `\r\n\x1b[33mProcess exited with code ${exitCode}${suffix}\x1b[0m\r\n`;
      // closeSession may already have removed this PTY because the tab was closed or
      // force-restarted. Ignore that stale process's later onExit callback so it cannot
      // overwrite the replacement session's state.
      writeTerminalSnapshot(session, message, () => {
        recordAndSendTerminalEvent(session, { type: 'output', data: message });
        recordAndSendTerminalEvent(session, { type: 'exit', exitCode, signal });
        session.socket = null;
        session.socketReady = false;
        if (sessions.get(sessionId) === session) {
          workspace.exitedTabs.add(sessionId);
          sessions.delete(sessionId);
          broadcastTabsState(workspace);
        }
      });
    });

    const savedInput = readTerminalInputStream(sessionId, session.generation);
    if (savedInput) session.inputStreams.set(savedInput.streamId, savedInput.lastSeq);
    sessions.set(sessionId, session);
    return session;
  }

  function attachSocket(ws, session, lastSeq = 0) {
    // Land any buffered output in the event log and snapshot before the replay plan is
    // computed, so a reconnecting client is never handed a view that is missing it.
    flushTerminalOutput(session);
    const oldSocket = session.socket;
    const oldInputSocket = session.inputSocket;
    session.inputSocket = null;
    oldInputSocket?.close(1000, 'Replaced by newer terminal view');
    session.socket = ws;
    session.socketReady = false;
    if (oldSocket && oldSocket !== ws && oldSocket.readyState === WS_OPEN) {
      oldSocket.close(1000, 'Replaced by newer terminal view');
    }

    // Snapshot, replay boundary and ready are produced in the same parser callback.
    // Writes queued after this barrier cannot overtake the snapshot on the socket.
    session.terminal.write('', () => {
      if (session.disposed || session.socket !== ws || ws.readyState !== WS_OPEN) return;
      // A new web process has a new replay sequence, even when the PTY generation
      // survives. Its first viewer must receive the broker's complete snapshot.
      const replayPlan = getTerminalReplayPlan(session.terminalEvents, session.forceSnapshot ? 0 : lastSeq);
      session.forceSnapshot = false;
      const terminalSnapshot = replayPlan.mode === 'reset' ? readTerminalSnapshot(session) : null;
      // Advertise ready only after the exact stream and snapshot are established.
      session.socketReady = true;
      ws.send(encodeTerminalServerMessage({
        type: 'ready',
        cwd: session.cwd,
        sessionId: session.id,
        sessionGeneration: session.generation,
        reset: replayPlan.mode === 'reset',
        gap: replayPlan.gap,
        lastSeq: replayPlan.lastSeq,
      }));

      if (replayPlan.mode === 'replay') {
        for (const event of replayPlan.events) {
          sendTerminalEvent(ws, event);
        }
      } else {
        sendTerminalSnapshot(ws, terminalSnapshot);
      }
      broadcastTabsState(session.workspace);
    });
  }

  function detachSocket(session, ws) {
    if (session.inputSocket === ws) {
      session.inputSocket = null;
    }
    if (session.socket === ws) {
      session.socket = null;
      session.socketReady = false;
      const inputSocket = session.inputSocket;
      session.inputSocket = null;
      inputSocket?.close(1000, 'Terminal output disconnected');
      broadcastTabsState(session.workspace);
    }
  }

  function closeSession(sessionId, broadcast = true) {
    persistentPty.close(sessionId);
    deleteTerminalInputStream(sessionId);
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    session.workspace.exitedTabs.delete(sessionId);

    // The session is going away and its socket with it, so buffered output has nowhere
    // left to land — drop it instead of letting a queued flush revive a dead session.
    cancelTerminalOutputFlush(session);
    session.disposed = true;
    session.pendingOutput.length = 0;
    session.pendingOutputBytes = 0;
    session.socket?.close(1000, 'Terminal closed');
    session.socket = null;
    session.socketReady = false;
    session.inputSocket?.close(1000, 'Terminal closed');
    session.inputSocket = null;
    session.pty.kill();
    sessions.delete(sessionId);
    if (broadcast) {
      broadcastTabsState(session.workspace);
    }
    return true;
  }

  function handleInit(ws, message) {
    const workspace = ws.data.workspace;
    const sessionId = readString(message.sessionId);
    if (!sessionId || !UUID_V4_PATTERN.test(sessionId)) {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Invalid session id' }));
      return null;
    }
    if (!workspace.tabsState.tabs.some((tab) => tab.id === sessionId)) {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal is not available' }));
      return null;
    }
    const inputStreamId = readString(message.inputStreamId);
    if (!inputStreamId || !UUID_V4_PATTERN.test(inputStreamId)) {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Invalid input stream id' }));
      return null;
    }

    const cols = readNumber(message.cols, 100);
    const rows = readNumber(message.rows, 30);
    const forceRestart = message.forceRestart === true;
    const lastSeq = readNumber(message.lastSeq, 0);

    const existingSession = sessions.get(sessionId);
    if (existingSession && existingSession.workspace !== workspace) {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal is not available' }));
      return null;
    }
    if (ws.data.kind === 'terminal-input') {
      // The output connection owns session creation and replay. An input connection
      // can only join its exact stream and generation; it never starts another PTY.
      if (!existingSession || existingSession.closed || existingSession.disposed
        || !existingSession.socketReady
        || existingSession.socket?.readyState !== WS_OPEN
        || existingSession.socket?.data.kind !== 'terminal-output'
        || existingSession.socket.data.inputStreamId !== inputStreamId
        || existingSession.generation !== readString(message.sessionGeneration)) {
        ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal output connection is not ready' }));
        ws.close(1008, 'Invalid terminal input attachment');
        return null;
      }
      const oldInputSocket = existingSession.inputSocket;
      // Receipt and parsing of the complete snapshot precede input attachment.
      existingSession.socket.data.snapshotBufferAllowance = 0;
      existingSession.inputSocket = ws;
      ws.data.inputStreamId = inputStreamId;
      oldInputSocket?.close(1000, 'Replaced by newer terminal input');
      ws.send(encodeTerminalServerMessage({
        type: 'ready', sessionId, cwd: existingSession.cwd,
        sessionGeneration: existingSession.generation,
      }));
      return existingSession;
    }
    if (forceRestart || existingSession?.closed) {
      closeSession(sessionId, false);
    }

    const session = sessions.get(sessionId) || createSession(sessionId, {
      cwd: message.cwd,
      cols,
      rows,
    }, workspace);
    if (session.workspace !== workspace) {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal is not available' }));
      return null;
    }

    resizeSession(session, cols, rows);
    if (!session.inputStreams.has(inputStreamId)) {
      // A new browser input stream replaces the previous one for this PTY. Keep
      // sequence history only for the stream that can currently send input.
      session.inputStreams.clear();
      session.inputStreams.set(inputStreamId, 0);
      saveTerminalInputStream(session.id, session.generation, inputStreamId, 0);
    }
    ws.data.inputStreamId = inputStreamId;
    const knownGeneration = readString(message.sessionGeneration);
    attachSocket(ws, session, knownGeneration && knownGeneration !== session.generation ? 0 : lastSeq);
    return session;
  }

  function handleTerminalMessage(ws, raw) {
    const message = decodeTerminalClientMessage(raw);
    if (!message || typeof message.type !== 'string') {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Invalid message' }));
      return;
    }

    if (message.type === 'init') {
      if (ws.data.activeSession) {
        ws.close(1008, 'Terminal is already initialized');
        return;
      }
      ws.data.activeSession = handleInit(ws, message);
      return;
    }

    const activeSession = ws.data.activeSession;
    if (!activeSession) {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal is not initialized' }));
      return;
    }

    const attachedSocket = ws.data.kind === 'terminal-input'
      ? activeSession.inputSocket : activeSession.socket;
    if (attachedSocket !== ws || activeSession.disposed || activeSession.closed
      || sessions.get(activeSession.id) !== activeSession) {
      ws.close(1000, 'Terminal connection replaced');
      return;
    }

    if (ws.data.kind === 'terminal-output' && message.type !== 'ping') {
      ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Use the terminal input connection' }));
      return;
    }

    if (message.type === 'input') {
      const inputStreamId = readString(ws.data.inputStreamId);
      const inputSeq = readNumber(message.inputSeq, 0);
      if (activeSession.pty.writeInput) {
        // The persistent owner acknowledges and deduplicates input. A web restart
        // between delivery and acknowledgement must never lose or repeat a command.
        activeSession.pty.writeInput(readString(message.data), inputStreamId, inputSeq).then((ack) => {
          if (activeSession.disposed) return;
          activeSession.inputStreams.set(inputStreamId, ack);
          saveTerminalInputStream(activeSession.id, activeSession.generation, inputStreamId, ack);
          if (websocketWritable(ws)) ws.send(encodeTerminalServerMessage({ type: 'input-ack', inputSeq: ack }));
        }).catch(() => ws.close(1011, 'PTY input disconnected'));
        return;
      }
      const lastInputSeq = activeSession.inputStreams.get(inputStreamId);
      if (!inputStreamId || lastInputSeq === undefined || inputSeq <= 0) {
        ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Invalid terminal input' }));
        return;
      }

      if (inputSeq <= lastInputSeq) {
        ws.send(encodeTerminalServerMessage({ type: 'input-ack', inputSeq: lastInputSeq }));
        return;
      }

      if (inputSeq !== lastInputSeq + 1) {
        ws.send(encodeTerminalServerMessage({ type: 'error', message: 'Terminal input sequence gap' }));
        ws.close(1011, 'Terminal input sequence gap');
        return;
      }

      activeSession.pty.write(readString(message.data));
      activeSession.inputStreams.set(inputStreamId, inputSeq);
      saveTerminalInputStream(activeSession.id, activeSession.generation, inputStreamId, inputSeq);
      ws.send(encodeTerminalServerMessage({ type: 'input-ack', inputSeq }));
      return;
    }

    if (message.type === 'resize') {
      resizeSession(activeSession, readNumber(message.cols, 100), readNumber(message.rows, 30));
      return;
    }

    if (message.type === 'close') {
      closeSession(activeSession.id);
      ws.data.activeSession = null;
      ws.close(1000, 'Terminal closed');
      return;
    }

    if (message.type === 'ping') {
      ws.send(encodeTerminalServerMessage({ type: 'pong' }));
    }
  }

  return { closeSession, handleTerminalMessage, detachSocket };
}
