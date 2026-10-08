import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';
import { recordTerminalEvent } from './terminal-stream.js';
import { encodeTerminalOutput, encodeTerminalServerMessage, sendTerminalOutput } from './wire.js';
import { TERMINAL_SCROLLBACK_LINES, serializeTerminalSnapshot } from './terminal-snapshot.js';
import terminalPolicy from '../shared/terminal-policy.json' with { type: 'json' };

export const WS_OPEN = 1;
const TERMINAL_SOCKET_BUFFER_LIMIT = 1024 * 1024;
const { Terminal: HeadlessTerminal } = headlessXterm;

export function createTerminalSnapshot(cols, rows) {
  const terminal = new HeadlessTerminal({
    allowProposedApi: true,
    cols,
    rows,
    scrollback: TERMINAL_SCROLLBACK_LINES,
  });
  const serializer = new SerializeAddon();
  terminal.loadAddon(new UnicodeGraphemesAddon());
  terminal.loadAddon(serializer);

  // SerializeAddon preserves mouse tracking (1000/1002/1003), but omits the
  // encoding (1006/1016). Remember it while parsing output so a snapshot sent
  // after reconnect still produces SGR mouse reports for fullscreen TUIs.
  const mouseEncoding = { mode: '' };
  for (const [final, enabled] of [['h', true], ['l', false]]) {
    terminal.parser.registerCsiHandler({ prefix: '?', final }, (params) => {
      for (const mode of params) {
        if (mode === 1006) mouseEncoding.mode = enabled ? '\x1b[?1006h' : '';
        if (mode === 1016) mouseEncoding.mode = enabled ? '\x1b[?1016h' : '';
      }
      return false;
    });
  }
  terminal.parser.registerEscHandler({ final: 'c' }, () => {
    mouseEncoding.mode = '';
    return false;
  });

  return {
    terminal,
    serializer,
    mouseEncoding,
    terminalSnapshot: '',
  };
}

export function writeTerminalSnapshot(session, chunk, onParsed) {
  session.terminal.write(chunk, () => {
    if (session.disposed) return;
    session.snapshotDirty = true;
    session.terminalSnapshot = '';
    onParsed?.();
  });
}

// Keep each decoded terminal frame small enough for xterm to parse without monopolizing
// the browser thread. Continuous output is paced independently of input and
// control traffic; an idle terminal's first output is forwarded immediately.
const TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 * 1024;
const TERMINAL_OUTPUT_BATCH_BYTES = 256 * 1024;
const TERMINAL_OUTPUT_FLUSH_INTERVAL_MS = 1000 / terminalPolicy.outputBatchesPerSecond;

function forEachTerminalOutputFrame(chunk, callback) {
  const bytes = Buffer.from(chunk);
  let offset = 0;

  while (offset < bytes.length) {
    let end = Math.min(offset + TERMINAL_OUTPUT_MAX_FRAME_BYTES, bytes.length);
    while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }

    callback(bytes.toString('utf8', offset, end), end - offset);
    offset = end;
  }
}

export function cancelTerminalOutputFlush(session) {
  if (session.outputFlushTask?.timer) clearTimeout(session.outputFlushTask.timer);
  session.outputFlushTask = null;
}

export function flushTerminalOutput(session) {
  cancelTerminalOutputFlush(session);
  if (session.pendingOutput.length === 0) {
    return;
  }

  const chunk = session.pendingOutput.length === 1
    ? session.pendingOutput[0]
    : session.pendingOutput.join('');
  session.pendingOutput.length = 0;
  session.pendingOutputBytes = 0;
  session.nextOutputFlushAt = Date.now() + TERMINAL_OUTPUT_FLUSH_INTERVAL_MS;

  // Forward live output immediately, without waiting for the headless parser.
  // Reserve its sequence, but commit replay only after parsing so reconnect
  // snapshots still advertise exactly the bytes they contain.
  const forwardedSocket = session.socketReady ? session.socket : null;
  forEachTerminalOutputFrame(chunk, (frame) => {
    session.pendingOutputEvents += 1;
    if (forwardedSocket) {
      sendTerminalEvent(forwardedSocket, {
        type: 'output', data: frame,
        seq: session.terminalEvents.lastSeq + session.pendingOutputEvents,
      });
    }
    writeTerminalSnapshot(session, frame, () => {
      session.pendingOutputEvents -= 1;
      recordAndSendTerminalEvent(session, { type: 'output', data: frame }, forwardedSocket);
    });
  });
}

function queueTerminalOutputPiece(session, chunk, chunkBytes) {
  if (
    session.pendingOutputBytes > 0
    && session.pendingOutputBytes + chunkBytes > TERMINAL_OUTPUT_BATCH_BYTES
  ) {
    flushTerminalOutput(session);
  }

  session.pendingOutput.push(chunk);
  session.pendingOutputBytes += chunkBytes;

  if (session.pendingOutputBytes >= TERMINAL_OUTPUT_BATCH_BYTES) {
    flushTerminalOutput(session);
    return;
  }

  if (session.outputFlushTask === null) {
    const task = { timer: null };
    session.outputFlushTask = task;
    const send = () => {
      if (session.outputFlushTask !== task || session.disposed) return;
      flushTerminalOutput(session);
    };
    const delay = Math.max(0, session.nextOutputFlushAt - Date.now());
    if (delay > 0) task.timer = setTimeout(send, delay);
    else setImmediate(send);
  }
}

export function queueTerminalOutput(session, chunk) {
  if (session.disposed || session.closed) return;
  forEachTerminalOutputFrame(chunk, (frame, frameBytes) => {
    queueTerminalOutputPiece(session, frame, frameBytes);
  });
}

export function sendTerminalSnapshot(ws, snapshot) {
  if (!websocketWritable(ws)) return;
  // A restore is one compressed message, unlike latency-sensitive live output.
  // Empty screens still need a frame so the client can finish its restore.
  const data = snapshot || '\x1b[0m';
  const payload = encodeTerminalOutput(data, undefined, true);
  ws.data.snapshotBufferAllowance = payload.byteLength ?? Buffer.byteLength(data) + 64;
  if (ws.send(payload) === 0) ws.close(1013, 'Terminal snapshot dropped');
  if (ws.getBufferedAmount?.() === 0) ws.data.snapshotBufferAllowance = 0;
}

export function websocketWritable(ws) {
  if (ws?.readyState !== WS_OPEN) return false;
  if (typeof ws.getBufferedAmount === 'function'
    && ws.getBufferedAmount() > TERMINAL_SOCKET_BUFFER_LIMIT + (ws.data?.snapshotBufferAllowance ?? 0)) {
    ws.close(1013, 'Terminal viewer is too slow');
    return false;
  }
  return true;
}

export function readTerminalSnapshot(session) {
  if (session.snapshotDirty || !session.terminalSnapshot) {
    session.terminalSnapshot = serializeTerminalSnapshot(session.terminal, session.serializer, session.mouseEncoding.mode);
    session.snapshotDirty = false;
  }

  return session.terminalSnapshot;
}

export function resizeSession(session, cols, rows) {
  // Reflow the buffered bytes at the old width before resizing, so they are not
  // re-wrapped to a geometry they were never written for.
  flushTerminalOutput(session);
  // An empty write is a parser barrier, not a separate timer or Promise per
  // output frame. Earlier output uses the old geometry; later output the new one.
  session.terminal.write('', () => {
    if (session.disposed) return;
    if (session.terminal.cols === cols && session.terminal.rows === rows) return;
    session.terminal.resize(cols, rows);
    if (!session.closed) session.pty.resize(cols, rows);
    session.snapshotDirty = true;
    session.terminalSnapshot = '';
  });
}

export function sendTerminalEvent(ws, event) {
  if (!websocketWritable(ws)) {
    return;
  }

  if (event.type === 'output') {
    if (sendTerminalOutput(ws, event.data, event.seq, ws.data.kind !== 'terminal-output') === 0) {
      ws.close(1013, 'Terminal output dropped');
    }
    return;
  }

  ws.send(encodeTerminalServerMessage(event));
}

export function recordAndSendTerminalEvent(session, event, forwardedSocket = null) {
  const sequencedEvent = recordTerminalEvent(session.terminalEvents, event);
  if (session.socketReady && session.socket !== forwardedSocket) {
    sendTerminalEvent(session.socket, sequencedEvent);
  }
  return sequencedEvent;
}
