import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createTerminalEventLog, getTerminalReplayPlan } from './terminal-stream.js';
import { decodeTerminalClientMessage, encodeTerminalServerMessage } from './wire.js';
import { UUID_V4_PATTERN, readString, readNumber } from './terminal-validation.js';
import { watchTerminalCwd } from './terminal-cwd.js';
import { createPtyFlowControl, createViewerFlowControl } from './terminal-flow-control.js';
import {
  WS_OPEN, createTerminalSnapshot, writeTerminalOutput, whenTerminalParsed, cancelTerminalOutputFlush,
  flushTerminalOutput, queueTerminalOutput, sendTerminalSnapshot, websocketWritable,
  readTerminalSnapshot, resizeSession, applyTerminalResize, recordAndSendTerminalEvent,
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

function launchOptions(options) {
  return {
    cwd: resolveCwd(options.cwd),
    cols: options.cols,
    rows: options.rows,
    shell: resolveShell(),
    env: {
      ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor', FORCE_COLOR: '3',
      SSH_CLIENT: process.env.SSH_CLIENT || '127.0.0.1 0 0',
      ...(os.platform() === 'win32' && process.env.ComSpec ? {
        PROMPT: '$E]9;9;$P$E\\' + (process.env.PROMPT || '$P$G'),
      } : {}),
    },
  };
}

// `spawnPty` is node-pty's spawn in production; it is injected so this module stays
// importable (and testable) without the native PTY runtime.
export function createTerminalSessions({ sessions, persistentPty, workspaces, spawnPty }) {
  const { broadcastTabsState, persistWorkspace, updateTabTitle } = workspaces;
  // Persistent sessions whose broker preparation is in flight. Concurrent viewers
  // share one preparation; closing the tab meanwhile invalidates it.
  const preparing = new Map();

  function createSession(sessionId, launch, workspace, persistent = null) {
    const cwd = persistent?.cwd ?? launch.cwd;
    const terminalSnapshot = createTerminalSnapshot(persistent?.cols ?? launch.cols, persistent?.rows ?? launch.rows);
    const shellProcess = persistent?.pty ?? spawnPty(launch.shell.command, launch.shell.args, {
      name: 'xterm-256color',
      cols: launch.cols,
      rows: launch.rows,
      cwd,
      env: launch.env,
    });
    if (workspace.exitedTabs.delete(sessionId)) persistWorkspace(workspace);

    const session = {
      id: sessionId,
      workspace,
      generation: persistent?.generation ?? randomUUID(),
      forceSnapshot: !!persistent,
      cwd,
      pty: shellProcess,
      flowControl: createPtyFlowControl(shellProcess),
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
      // Bytes awaiting the headless parser's write callbacks.
      parseBacklogBytes: 0,
    };

    shellProcess.onData((chunk) => {
      queueTerminalOutput(session, chunk);
    });
    shellProcess.onResize?.((cols, rows) => applyTerminalResize(session, cols, rows));
    if (persistent?.data) queueTerminalOutput(session, persistent.data);
    shellProcess.onDisconnect?.(() => {
      if (session.disposed) return;
      session.disposed = true;
      session.flowControl.dispose();
      session.disposeCwdTracker?.();
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
      writeTerminalOutput(session, message, Buffer.byteLength(message), () => {
        const output = recordAndSendTerminalEvent(session, { type: 'output', data: message });
        recordAndSendTerminalEvent(session, { type: 'exit', exitCode, signal });
        session.socket = null;
        session.socketReady = false;
        if (sessions.get(sessionId) === session) {
          workspace.exitedTabs.add(sessionId);
          sessions.delete(sessionId);
          persistWorkspace(workspace);
          broadcastTabsState(workspace);
        }
        // Nothing restores from an exited session; release its scrollback now.
        session.disposed = true;
        session.flowControl.dispose();
        session.disposeCwdTracker?.();
        session.terminal.dispose();
        return output;
      });
    });

    sessions.set(sessionId, session);
    session.disposeCwdTracker = watchTerminalCwd({
      terminal: session.terminal, pid: shellProcess.pid, initialCwd: cwd,
      onChange(directory) {
        session.cwd = directory;
        updateTabTitle(workspace, sessionId, directory);
      },
    });
    return session;
  }

  // Returns the new session, or a Promise of it (null if the tab was closed while
  // the persistent service prepared it).
  function openSession(sessionId, options, workspace) {
    const launch = launchOptions(options);
    if (!persistentPty.enabled) return createSession(sessionId, launch, workspace);
    const inFlight = preparing.get(sessionId);
    if (inFlight) return inFlight.promise;

    const entry = { promise: null };
    preparing.set(sessionId, entry);
    entry.promise = persistentPty.prepare(sessionId, launch).then((prepared) => {
      if (preparing.get(sessionId) !== entry) {
        prepared.pty.kill();
        return null;
      }
      preparing.delete(sessionId);
      return createSession(sessionId, launch, workspace, prepared);
    }, (error) => {
      if (preparing.get(sessionId) === entry) preparing.delete(sessionId);
      throw error;
    });
    return entry.promise;
  }

  function attachSocket(ws, session, lastSeq = 0) {
    // Land any buffered output in the event log and snapshot before the replay plan is
    // computed, so a reconnecting client is never handed a view that is missing it.
    flushTerminalOutput(session);
    const oldSocket = session.socket;
    oldSocket?.data.outputFlow?.dispose();
    const oldInputSocket = session.inputSocket;
    session.inputSocket = null;
    oldInputSocket?.close(1000, 'Replaced by newer terminal view');
    session.socket = ws;
    ws.data.outputFlow = createViewerFlowControl(session.flowControl);
    session.socketReady = false;
    if (oldSocket && oldSocket !== ws && oldSocket.readyState === WS_OPEN) {
      oldSocket.close(1000, 'Replaced by newer terminal view');
    }

    // Snapshot, replay boundary and ready are produced in the same parser callback.
    // Writes queued after this barrier cannot overtake the snapshot on the socket.
    whenTerminalParsed(session, () => {
      if (session.socket !== ws || ws.readyState !== WS_OPEN) return;
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
        cols: session.terminal.cols,
        rows: session.terminal.rows,
      }));

      if (replayPlan.mode === 'replay') {
        for (const event of replayPlan.events) {
          sendTerminalEvent(ws, event);
        }
      } else {
        sendTerminalSnapshot(ws, terminalSnapshot, replayPlan.lastSeq);
      }
      broadcastTabsState(session.workspace);
    });
  }

  function detachSocket(session, ws) {
    if (session.inputSocket === ws) {
      session.inputSocket = null;
    }
    if (session.socket === ws) {
      ws.data.outputFlow?.dispose();
      session.socket = null;
      session.socketReady = false;
      const inputSocket = session.inputSocket;
      session.inputSocket = null;
      inputSocket?.close(1000, 'Terminal output disconnected');
      broadcastTabsState(session.workspace);
    }
  }

  function closeSession(sessionId, broadcast = true) {
    if (persistentPty.enabled) {
      // Requests share one ordered broker connection, so a following prepare for
      // this id (force restart) always runs after the close.
      preparing.delete(sessionId);
      persistentPty.close(sessionId).catch((error) => {
        console.error(`Failed to close persistent PTY ${sessionId}: ${error.message}`);
      });
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    const exitedChanged = session.workspace.exitedTabs.delete(sessionId);

    // The session is going away and its socket with it, so buffered output has nowhere
    // left to land — drop it instead of letting a queued flush revive a dead session.
    cancelTerminalOutputFlush(session);
    session.disposed = true;
    session.flowControl.dispose();
    session.disposeCwdTracker?.();
    session.pendingOutput.length = 0;
    session.pendingOutputBytes = 0;
    session.socket?.close(1000, 'Terminal closed');
    session.socket = null;
    session.socketReady = false;
    session.inputSocket?.close(1000, 'Terminal closed');
    session.inputSocket = null;
    session.pty.kill();
    sessions.delete(sessionId);
    session.terminal.dispose();
    if (exitedChanged) {
      persistWorkspace(session.workspace);
    }
    if (broadcast) {
      broadcastTabsState(session.workspace);
    }
    return true;
  }

  function sendError(ws, message) {
    ws.send(encodeTerminalServerMessage({ type: 'error', message }));
  }

  function joinSession(ws, session, workspace, { cols, rows, inputStreamId, lastSeq, knownGeneration }) {
    if (session.workspace !== workspace || session.disposed || sessions.get(session.id) !== session) {
      sendError(ws, 'Terminal is not available');
      return;
    }

    resizeSession(session, cols, rows);
    if (!session.inputStreams.has(inputStreamId)) {
      // A new browser input stream replaces the previous one for this PTY. Keep
      // sequence history only for the stream that can currently send input.
      session.inputStreams.clear();
      session.inputStreams.set(inputStreamId, 0);
    }
    ws.data.inputStreamId = inputStreamId;
    ws.data.activeSession = session;
    attachSocket(ws, session, knownGeneration && knownGeneration !== session.generation ? 0 : lastSeq);
  }

  function handleInit(ws, message) {
    const workspace = ws.data.workspace;
    const sessionId = readString(message.sessionId);
    if (!sessionId || !UUID_V4_PATTERN.test(sessionId)) {
      sendError(ws, 'Invalid session id');
      return;
    }
    if (!workspace.tabsState.tabs.some((tab) => tab.id === sessionId)) {
      sendError(ws, 'Terminal is not available');
      return;
    }
    const inputStreamId = readString(message.inputStreamId);
    if (!inputStreamId || !UUID_V4_PATTERN.test(inputStreamId)) {
      sendError(ws, 'Invalid input stream id');
      return;
    }

    const cols = readNumber(message.cols, 100);
    const rows = readNumber(message.rows, 30);
    const forceRestart = message.forceRestart === true;
    const lastSeq = readNumber(message.lastSeq, 0);
    const knownGeneration = readString(message.sessionGeneration);

    const existingSession = sessions.get(sessionId);
    if (existingSession && existingSession.workspace !== workspace) {
      sendError(ws, 'Terminal is not available');
      return;
    }
    if (ws.data.kind === 'terminal-input') {
      // The output connection owns session creation and replay. An input connection
      // can only join its exact stream and generation; it never starts another PTY.
      if (!existingSession || existingSession.closed || existingSession.disposed
        || !existingSession.socketReady
        || existingSession.socket?.readyState !== WS_OPEN
        || existingSession.socket?.data.kind !== 'terminal-output'
        || existingSession.socket.data.inputStreamId !== inputStreamId
        || existingSession.generation !== knownGeneration) {
        sendError(ws, 'Terminal output connection is not ready');
        ws.close(1008, 'Invalid terminal input attachment');
        return;
      }
      const oldInputSocket = existingSession.inputSocket;
      // Receipt and parsing of the complete snapshot precede input attachment.
      existingSession.socket.data.snapshotBufferAllowance = 0;
      existingSession.inputSocket = ws;
      ws.data.inputStreamId = inputStreamId;
      ws.data.activeSession = existingSession;
      oldInputSocket?.close(1000, 'Replaced by newer terminal input');
      ws.send(encodeTerminalServerMessage({
        type: 'ready', sessionId, cwd: existingSession.cwd,
        sessionGeneration: existingSession.generation,
      }));
      return;
    }
    if (forceRestart || existingSession?.closed) {
      closeSession(sessionId, false);
    }

    const join = { cols, rows, inputStreamId, lastSeq, knownGeneration };
    const session = sessions.get(sessionId) ?? openSession(sessionId, { cwd: message.cwd, cols, rows }, workspace);
    if (!(session instanceof Promise)) {
      joinSession(ws, session, workspace, join);
      return;
    }

    // The persistent service is preparing the shell; other connections keep running.
    ws.data.initializing = true;
    session.then((opened) => {
      ws.data.initializing = false;
      if (ws.readyState !== WS_OPEN) return;
      if (!opened) {
        sendError(ws, 'Terminal is not available');
        return;
      }
      joinSession(ws, opened, workspace, join);
    }, (error) => {
      ws.data.initializing = false;
      console.error(`Persistent PTY prepare failed for ${sessionId}: ${error.message}`);
      if (ws.readyState !== WS_OPEN) return;
      sendError(ws, 'Terminal service unavailable');
      ws.close(1011, 'PTY service unavailable');
    });
  }

  function handleTerminalMessage(ws, raw) {
    const message = decodeTerminalClientMessage(raw);
    if (!message || typeof message.type !== 'string') {
      sendError(ws, 'Invalid message');
      return;
    }

    if (message.type === 'init') {
      if (ws.data.activeSession || ws.data.initializing) {
        ws.close(1008, 'Terminal is already initialized');
        return;
      }
      handleInit(ws, message);
      return;
    }

    const activeSession = ws.data.activeSession;
    if (!activeSession) {
      if (ws.data.initializing) {
        if (message.type === 'ping') ws.send(encodeTerminalServerMessage({ type: 'pong' }));
        return;
      }
      sendError(ws, 'Terminal is not initialized');
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
      sendError(ws, 'Use the terminal input connection');
      return;
    }

    if (message.type === 'output-ack') {
      if (!activeSession.socket?.data.outputFlow?.acknowledge(message.seq)) {
        sendError(ws, 'Invalid terminal output acknowledgement');
      }
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
          if (websocketWritable(ws)) ws.send(encodeTerminalServerMessage({ type: 'input-ack', inputSeq: ack }));
        }).catch(() => ws.close(1011, 'PTY input disconnected'));
        return;
      }
      const lastInputSeq = activeSession.inputStreams.get(inputStreamId);
      if (!inputStreamId || lastInputSeq === undefined || inputSeq <= 0) {
        sendError(ws, 'Invalid terminal input');
        return;
      }

      if (inputSeq <= lastInputSeq) {
        ws.send(encodeTerminalServerMessage({ type: 'input-ack', inputSeq: lastInputSeq }));
        return;
      }

      if (inputSeq !== lastInputSeq + 1) {
        sendError(ws, 'Terminal input sequence gap');
        ws.close(1011, 'Terminal input sequence gap');
        return;
      }

      activeSession.pty.write(readString(message.data));
      activeSession.inputStreams.set(inputStreamId, inputSeq);
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
