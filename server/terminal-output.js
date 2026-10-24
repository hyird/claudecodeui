import { encodeTerminalServerMessage, encodeTerminalSnapshot, sendTerminalOutput } from './wire.js';
import { serializeTerminalSnapshot } from './terminal-snapshot.js';
import { OUTPUT_HIGH_WATER, OUTPUT_LOW_WATER } from './terminal-flow-control.js';

export const WS_OPEN = 1;
const TERMINAL_SOCKET_BUFFER_LIMIT = 1024 * 1024;

function invalidateTerminalSnapshot(session) {
  session.snapshotDirty = true;
  session.terminalSnapshot = '';
}

// Like xterm's flow-control guide, pause the producer above a high-water mark
// and resume below a low-water mark. Every byte is still parsed and committed.
export function writeTerminalOutput(session, data, bytes, commit = () => {}) {
  session.parseBacklogBytes += bytes;
  if (session.parseBacklogBytes >= OUTPUT_HIGH_WATER) session.flowControl.setPaused('parser', true);
  session.terminal.write(data, () => {
    session.parseBacklogBytes -= bytes;
    if (session.disposed) return;
    commit();
    if (session.disposed) return;
    invalidateTerminalSnapshot(session);
    if (session.parseBacklogBytes <= OUTPUT_LOW_WATER) session.flowControl.setPaused('parser', false);
  });
}

// A parser barrier includes all earlier output, without a lossy replay fallback.
export function whenTerminalParsed(session, callback) {
  session.terminal.write('', () => {
    if (!session.disposed) callback();
  });
}

// Keep each decoded terminal frame small enough for xterm to parse without monopolizing
// the browser thread. Coalesce only within the current event-loop turn; consumer
// acknowledgements provide pacing without imposing latency on prompt redraws.
const TERMINAL_OUTPUT_MAX_FRAME_BYTES = 16 * 1024;
const TERMINAL_OUTPUT_BATCH_BYTES = 256 * 1024;

export function cancelTerminalOutputFlush(session) {
  if (session.outputFlushTask?.immediate) clearImmediate(session.outputFlushTask.immediate);
  session.outputFlushTask = null;
}

// Forward live output immediately, without waiting for the headless parser.
// Sequence numbers only account for consumed output; stream order comes from
// WebSocket. The headless parser maintains the single reconnect snapshot.
function emitOutputFrame(session, frame, bytes, encoded) {
  const viewer = session.socketReady ? session.socket : null;
  sendSessionEvent(session, { type: 'output', data: frame, bytes }, encoded);
  writeTerminalOutput(session, frame, bytes, () => {
    // A viewer attached between forwarding and parsing receives these bytes
    // after its snapshot barrier, rather than losing or replaying them twice.
    if (session.socket !== viewer) sendSessionEvent(session, { type: 'output', data: frame, bytes }, encoded);
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

  if (textBytes <= TERMINAL_OUTPUT_MAX_FRAME_BYTES) {
    emitOutputFrame(session, text, textBytes, null);
    return;
  }

  // Encode once: the wire takes byte slices and the parser takes the decoded frame.
  const bytes = Buffer.from(text, 'utf8');
  let offset = 0;
  while (offset < bytes.length) {
    let end = Math.min(offset + TERMINAL_OUTPUT_MAX_FRAME_BYTES, bytes.length);
    while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    const encoded = bytes.subarray(offset, end);
    emitOutputFrame(session, encoded.toString('utf8'), end - offset, encoded);
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
    const task = { immediate: null };
    session.outputFlushTask = task;
    const send = () => {
      if (session.outputFlushTask !== task || session.disposed) return;
      flushTerminalOutput(session);
    };
    task.immediate = setImmediate(send);
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
  // Prevent an unbounded queue of live events while zlib prepares the restore.
  const producer = ws.data.activeSession?.flowControl;
  producer?.setPaused(queue, true);
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
    ws.data.outputFlow?.record(0, Buffer.byteLength(snapshot || '\x1b[0m'));
    if (ws.getBufferedAmount?.() === 0) ws.data.snapshotBufferAllowance = 0;
    for (const [event, encoded] of queue) sendTerminalEvent(ws, event, encoded);
  }, () => {
    ws.data.snapshotQueue = null;
    ws.close(1011, 'Terminal snapshot failed');
  }).finally(() => producer?.setPaused(queue, false));
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
  // Forward the resize in exactly the same order as live output.
  // The browser waits for its earlier writes before applying the geometry, and
  // the headless mirror commits the same fence only after its parser catches up.
  const viewer = session.socketReady ? session.socket : null;
  sendSessionEvent(session, { type: 'resize', cols, rows });
  session.terminal.write('', () => {
    if (session.disposed) return;
    if (session.terminal.cols !== cols || session.terminal.rows !== rows) {
      session.terminal.resize(cols, rows);
      resizePty();
    }
    invalidateTerminalSnapshot(session);
    if (session.socket !== viewer) sendSessionEvent(session, { type: 'resize', cols, rows });
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
    if (sendTerminalOutput(ws, encoded ?? event.data, event.seq) === 0) {
      ws.close(1013, 'Terminal output dropped');
    } else {
      ws.data.outputFlow?.record(event.seq ?? 0, event.bytes ?? (encoded?.byteLength ?? Buffer.byteLength(event.data)));
    }
    return;
  }

  ws.send(encodeTerminalServerMessage(event));
}

export function sendSessionEvent(session, event, encoded = null) {
  if (!session.socketReady) return;
  if (event.type === 'output') event = { ...event, seq: ++session.outputSeq };
  sendTerminalEvent(session.socket, event, encoded);
}
