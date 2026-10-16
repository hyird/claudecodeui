import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';
import { forEachTerminalEventAfter, recordTerminalEvent } from './terminal-stream.js';
import { encodeTerminalServerMessage, encodeTerminalSnapshot, sendTerminalOutput } from './wire.js';
import { TERMINAL_PARSE_BACKLOG_LIMIT, TERMINAL_SCROLLBACK_LINES, serializeTerminalSnapshot } from './terminal-snapshot.js';
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

function invalidateTerminalSnapshot(session) {
  session.snapshotDirty = true;
  session.terminalSnapshot = '';
}

// Feed output that was committed without parsing (see writeTerminalOutput) to the
// headless copy. Only the retained replay window is available, so a flood longer
// than that window leaves the restore snapshot approximate; sequence numbers and
// live delivery are unaffected.
function resyncTerminalParser(session) {
  const from = session.unparsedFromSeq;
  if (!from) return;
  session.unparsedFromSeq = 0;
  forEachTerminalEventAfter(session.terminalEvents, from - 1, (event) => {
    if (event.type === 'resize') {
      session.terminal.write('', () => session.terminal.resize(event.cols, event.rows));
      return;
    }
    if (event.type !== 'output') return;
    const { data, bytes } = event;
    session.parseBacklogBytes += bytes;
    session.terminal.write(data, () => {
      session.parseBacklogBytes -= bytes;
      if (session.disposed) return;
      invalidateTerminalSnapshot(session);
      settleTerminalParser(session);
    });
  });
}

function settleTerminalParser(session) {
  if (session.parseOverflow && session.parseBacklogBytes === 0 && session.bypassedWrites === 0) {
    session.parseOverflow = false;
    resyncTerminalParser(session);
  }
}

// Parse output in the headless copy, then run `commit` (which records the event and
// returns it) in output order. xterm throws away writes once its parse backlog nears
// 50 MB, so above TERMINAL_PARSE_BACKLOG_LIMIT output is still committed in order
// through empty parser writes, but parsing pauses until the backlog drains and the
// copy then catches up from the replay log.
export function writeTerminalOutput(session, data, bytes, commit) {
  const parse = !session.parseOverflow
    && session.parseBacklogBytes + bytes <= TERMINAL_PARSE_BACKLOG_LIMIT;
  if (parse) {
    session.parseBacklogBytes += bytes;
  } else {
    session.parseOverflow = true;
    session.bypassedWrites += 1;
  }
  session.terminal.write(parse ? data : '', () => {
    if (parse) session.parseBacklogBytes -= bytes;
    else session.bypassedWrites -= 1;
    if (session.disposed) return;
    const event = commit();
    if (session.disposed) return;
    if (parse) invalidateTerminalSnapshot(session);
    else if (!session.unparsedFromSeq) session.unparsedFromSeq = event.seq;
    settleTerminalParser(session);
  });
}

// Parser barrier: `callback` runs once all earlier output is reflected in the
// headless copy, including output committed unparsed during a flood.
export function whenTerminalParsed(session, callback) {
  session.terminal.write('', () => {
    if (session.disposed) return;
    if (!session.unparsedFromSeq) {
      callback();
      return;
    }
    resyncTerminalParser(session);
    session.terminal.write('', () => {
      if (!session.disposed) callback();
    });
  });
}

// Keep each decoded terminal frame small enough for xterm to parse without monopolizing
// the browser thread. Continuous output is paced independently of input and
// control traffic; an idle terminal's first output is forwarded immediately.
const TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 * 1024;
const TERMINAL_OUTPUT_BATCH_BYTES = 256 * 1024;
const TERMINAL_OUTPUT_FLUSH_INTERVAL_MS = 1000 / terminalPolicy.outputBatchesPerSecond;

export function cancelTerminalOutputFlush(session) {
  if (session.outputFlushTask?.timer) clearTimeout(session.outputFlushTask.timer);
  session.outputFlushTask = null;
}

// Forward live output immediately, without waiting for the headless parser.
// Reserve its sequence, but commit replay only after parsing so reconnect
// snapshots still advertise exactly the bytes they contain. `encoded` is the
// frame's UTF-8 bytes when the batch was already encoded for splitting.
function emitOutputFrame(session, frame, bytes, encoded, forwardedSocket) {
  session.pendingOutputEvents += 1;
  if (forwardedSocket) {
    sendTerminalEvent(forwardedSocket, {
      type: 'output', data: frame,
      seq: session.terminalEvents.lastSeq + session.pendingOutputEvents,
    }, encoded);
  }
  writeTerminalOutput(session, frame, bytes, () => {
    session.pendingOutputEvents -= 1;
    return recordAndSendTerminalEvent(session, { type: 'output', data: frame, bytes }, forwardedSocket);
  });
}

export function flushTerminalOutput(session) {
  cancelTerminalOutputFlush(session);
  if (session.pendingOutput.length === 0) {
    return;
  }

  const text = session.pendingOutput.length === 1
    ? session.pendingOutput[0]
    : session.pendingOutput.join('');
  const textBytes = session.pendingOutputBytes;
  session.pendingOutput.length = 0;
  session.pendingOutputBytes = 0;
  session.nextOutputFlushAt = Date.now() + TERMINAL_OUTPUT_FLUSH_INTERVAL_MS;

  const forwardedSocket = session.socketReady ? session.socket : null;
  if (textBytes <= TERMINAL_OUTPUT_MAX_FRAME_BYTES) {
    emitOutputFrame(session, text, textBytes, null, forwardedSocket);
    return;
  }

  // Encode once: the wire takes byte slices, the parser and replay log the decoded frame.
  const bytes = Buffer.from(text, 'utf8');
  let offset = 0;
  while (offset < bytes.length) {
    let end = Math.min(offset + TERMINAL_OUTPUT_MAX_FRAME_BYTES, bytes.length);
    while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    const encoded = bytes.subarray(offset, end);
    emitOutputFrame(session, encoded.toString('utf8'), end - offset, encoded, forwardedSocket);
    offset = end;
  }
}

export function queueTerminalOutput(session, chunk) {
  if (session.disposed || session.closed || chunk.length === 0) return;
  const chunkBytes = Buffer.byteLength(chunk, 'utf8');
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

// A restore is one compressed message, unlike latency-sensitive live output. It is
// compressed off the event loop; events for this viewer wait behind it so the
// stream order on the socket is unchanged. Resolves once the restore was handed
// to the socket (or abandoned).
export function sendTerminalSnapshot(ws, snapshot) {
  if (!websocketWritable(ws)) return Promise.resolve();
  const queue = [];
  ws.data.snapshotQueue = queue;
  // Empty screens still need a frame so the client can finish its restore.
  return encodeTerminalSnapshot(snapshot || '\x1b[0m').then((payload) => {
    if (ws.data.snapshotQueue !== queue) return;
    ws.data.snapshotQueue = null;
    if (ws.readyState !== WS_OPEN) return;
    ws.data.snapshotBufferAllowance = payload.byteLength;
    if (ws.send(payload) === 0) {
      ws.close(1013, 'Terminal snapshot dropped');
      return;
    }
    if (ws.getBufferedAmount?.() === 0) ws.data.snapshotBufferAllowance = 0;
    for (const [event, encoded] of queue) sendTerminalEvent(ws, event, encoded);
  }, () => {
    ws.data.snapshotQueue = null;
    ws.close(1011, 'Terminal snapshot failed');
  });
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
  cols = Number.isInteger(cols) && cols > 0 ? Math.min(cols, 500) : 100;
  rows = Number.isInteger(rows) && rows > 0 ? Math.min(rows, 300) : 30;
  const requested = session.requestedSize ?? { cols: session.terminal.cols, rows: session.terminal.rows };
  if (requested.cols === cols && requested.rows === rows) return;
  session.requestedSize = { cols, rows };
  // The persistent owner acknowledges the geometry on its output connection.
  // Until that fence arrives, both mirrors must keep parsing at the old size.
  if (session.pty.onResize) {
    if (!session.closed) session.pty.resize(cols, rows);
    return;
  }
  applyTerminalResize(session, cols, rows, () => {
    if (!session.closed) session.pty.resize(cols, rows);
  });
}

export function applyTerminalResize(session, cols, rows, resizePty = () => {}) {
  if (session.disposed) return;
  flushTerminalOutput(session);
  // Reserve and forward the fence in exactly the same order as live output.
  // The browser waits for its earlier writes before applying the geometry, and
  // the headless mirror commits the same fence only after its parser catches up.
  session.pendingOutputEvents += 1;
  const forwardedSocket = session.socketReady ? session.socket : null;
  const event = { type: 'resize', cols, rows };
  if (forwardedSocket) sendTerminalEvent(forwardedSocket, {
    ...event, seq: session.terminalEvents.lastSeq + session.pendingOutputEvents,
  });
  session.terminal.write('', () => {
    if (session.disposed) return;
    if (session.terminal.cols !== cols || session.terminal.rows !== rows) {
      session.terminal.resize(cols, rows);
      resizePty();
    }
    invalidateTerminalSnapshot(session);
    session.pendingOutputEvents -= 1;
    recordAndSendTerminalEvent(session, event, forwardedSocket);
  });
}

export function sendTerminalEvent(ws, event, encoded = null) {
  if (ws.data?.snapshotQueue) {
    ws.data.snapshotQueue.push([event, encoded]);
    return;
  }
  if (!websocketWritable(ws)) {
    return;
  }

  if (event.type === 'output') {
    if (sendTerminalOutput(ws, encoded ?? event.data, event.seq, ws.data.kind !== 'terminal-output') === 0) {
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
