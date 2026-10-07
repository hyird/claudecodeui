import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';
import { recordTerminalEvent } from './terminal-stream.js';
import { encodeTerminalServerMessage, sendTerminalOutput } from './wire.js';

export const WS_OPEN = 1;
const SERVER_SNAPSHOT_SCROLLBACK = 10000;
const TERMINAL_SOCKET_BUFFER_LIMIT = 1024 * 1024;
const { Terminal: HeadlessTerminal } = headlessXterm;

export function createTerminalSnapshot(cols, rows) {
  const terminal = new HeadlessTerminal({
    allowProposedApi: true,
    cols,
    rows,
    scrollback: SERVER_SNAPSHOT_SCROLLBACK,
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
// the browser thread. A busy PTY reaches the byte cap and sends immediately; light output
// such as an echoed key is forced out within 2 ms.
const TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 * 1024;
const TERMINAL_OUTPUT_FLUSH_INTERVAL_MS = 2;

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

export function clearTerminalOutputFlushTimer(session) {
  if (session.outputFlushTimer !== null) {
    clearTimeout(session.outputFlushTimer);
    session.outputFlushTimer = null;
  }
}

export function flushTerminalOutput(session) {
  clearTerminalOutputFlushTimer(session);
  if (session.pendingOutput.length === 0) {
    return;
  }

  const chunk = session.pendingOutput.length === 1
    ? session.pendingOutput[0]
    : session.pendingOutput.join('');
  session.pendingOutput.length = 0;
  session.pendingOutputBytes = 0;

  // Forward live output immediately, without waiting for the headless parser.
  // Reserve its sequence, but commit replay only after parsing so reconnect
  // snapshots still advertise exactly the bytes they contain.
  const forwardedSocket = session.socketReady ? session.socket : null;
  session.pendingOutputEvents += 1;
  if (forwardedSocket) {
    sendTerminalEvent(forwardedSocket, {
      type: 'output', data: chunk,
      seq: session.terminalEvents.lastSeq + session.pendingOutputEvents,
    });
  }
  writeTerminalSnapshot(session, chunk, () => {
    session.pendingOutputEvents -= 1;
    recordAndSendTerminalEvent(session, { type: 'output', data: chunk }, forwardedSocket);
  });
}

function queueTerminalOutputPiece(session, chunk, chunkBytes) {
  if (
    session.pendingOutputBytes > 0
    && session.pendingOutputBytes + chunkBytes > TERMINAL_OUTPUT_MAX_FRAME_BYTES
  ) {
    flushTerminalOutput(session);
  }

  session.pendingOutput.push(chunk);
  session.pendingOutputBytes += chunkBytes;

  if (session.pendingOutputBytes >= TERMINAL_OUTPUT_MAX_FRAME_BYTES) {
    flushTerminalOutput(session);
    return;
  }

  if (session.outputFlushTimer === null) {
    session.outputFlushTimer = setTimeout(
      () => flushTerminalOutput(session),
      TERMINAL_OUTPUT_FLUSH_INTERVAL_MS,
    );
  }
}

export function queueTerminalOutput(session, chunk) {
  if (session.disposed || session.closed) return;
  forEachTerminalOutputFrame(chunk, (frame, frameBytes) => {
    queueTerminalOutputPiece(session, frame, frameBytes);
  });
}

export function sendTerminalSnapshot(ws, snapshot) {
  forEachTerminalOutputFrame(snapshot, (frame) => {
    if (websocketWritable(ws)) {
      if (sendTerminalOutput(ws, frame, undefined, ws.data.kind !== 'terminal-output') === 0) {
        ws.close(1013, 'Terminal output dropped');
      }
    }
  });
}

export function websocketWritable(ws) {
  if (ws?.readyState !== WS_OPEN) return false;
  if (typeof ws.getBufferedAmount === 'function'
    && ws.getBufferedAmount() > TERMINAL_SOCKET_BUFFER_LIMIT) {
    ws.close(1013, 'Terminal viewer is too slow');
    return false;
  }
  return true;
}

export function readTerminalSnapshot(session) {
  if (session.snapshotDirty || !session.terminalSnapshot) {
    session.terminalSnapshot = session.serializer.serialize() + session.mouseEncoding.mode;
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

function sendTerminalEvent(ws, event) {
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
