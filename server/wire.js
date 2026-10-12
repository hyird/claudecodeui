import { deflate, deflateSync } from 'node:zlib';
import { promisify } from 'node:util';

import { cloudcli } from '../proto/messages.js';

const {
  TerminalClientMessage,
  TerminalServerMessage,
  TabsClientMessage,
  TabsServerMessage,
  AuthClientMessage,
  AuthServerMessage,
} = cloudcli;

const TERMINAL_OUTPUT_COMPRESSION_THRESHOLD = 512;

function toUint8(raw) {
  if (raw instanceof Uint8Array) {
    return raw;
  }
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }
  return new Uint8Array(0);
}

// ---- /terminal : client -> server ---------------------------------------
export function decodeTerminalClientMessage(raw) {
  let message;
  try {
    message = TerminalClientMessage.decode(toUint8(raw));
  } catch {
    return null;
  }

  switch (message.body) {
    case 'init': {
      const init = message.init;
      return {
        type: 'init',
        sessionId: init.sessionId,
        cols: init.cols,
        rows: init.rows,
        cwd: init.cwd,
        forceRestart: init.forceRestart,
        lastSeq: init.lastSeq,
        inputStreamId: init.inputStreamId,
        sessionGeneration: init.sessionGeneration,
      };
    }
    case 'input':
      return {
        type: 'input',
        data: message.input.data,
        inputSeq: message.input.inputSeq,
      };
    case 'resize':
      return { type: 'resize', cols: message.resize.cols, rows: message.resize.rows };
    case 'close':
      return { type: 'close' };
    case 'ping':
      return { type: 'ping' };
    default:
      return null;
  }
}

// ---- /terminal : server -> client ---------------------------------------
export function encodeTerminalServerMessage(message) {
  let payload;
  switch (message.type) {
    case 'ready':
      payload = {
        ready: {
          cwd: message.cwd ?? '',
          sessionId: message.sessionId ?? '',
          reset: message.reset === true,
          gap: message.gap === true,
          lastSeq: message.lastSeq ?? 0,
          sessionGeneration: message.sessionGeneration ?? '',
        },
      };
      break;
    case 'exit':
      payload = {
        exit: {
          exitCode: message.exitCode ?? 0,
          signal: message.signal == null ? '' : String(message.signal),
        },
      };
      break;
    case 'error':
      payload = { error: { message: message.message ?? '' } };
      break;
    case 'pong':
      payload = { pong: {} };
      break;
    case 'input-ack':
      payload = { inputAck: { inputSeq: message.inputSeq ?? 0 } };
      break;
    default:
      throw new Error(`Unknown terminal server message: ${message.type}`);
  }
  if (Number.isFinite(message.seq) && message.seq > 0) {
    payload.seq = Math.floor(message.seq);
  }
  return TerminalServerMessage.encode(payload).finish();
}

const deflateAsync = promisify(deflate);

function encodeOutputMessage(data, compressed, seq) {
  const message = { output: { data, compressed } };
  if (Number.isFinite(seq) && seq > 0) {
    message.seq = Math.floor(seq);
  }
  return TerminalServerMessage.encode(message).finish();
}

// The split downlink sends raw bytes to avoid compression/decompression latency
// on fast networks. Legacy clients retain optional DEFLATE compatibility.
// `data` is text or its already encoded UTF-8 bytes, which are framed without a copy.
export function encodeTerminalOutput(data, seq = 0, compress = true) {
  const raw = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  if (compress && raw.length >= TERMINAL_OUTPUT_COMPRESSION_THRESHOLD) {
    const compressed = deflateSync(raw, { level: 1 });
    if (compressed.length < raw.length) {
      return encodeOutputMessage(compressed, true, seq);
    }
  }
  return encodeOutputMessage(raw, false, seq);
}

// A restore can be a 16 MiB history; compress it on the zlib thread pool so the
// event loop keeps serving every other terminal meanwhile.
export async function encodeTerminalSnapshot(text) {
  const raw = Buffer.from(text, 'utf8');
  if (raw.length >= TERMINAL_OUTPUT_COMPRESSION_THRESHOLD) {
    const compressed = await deflateAsync(raw, { level: 1 });
    if (compressed.length < raw.length) {
      return encodeOutputMessage(compressed, true, 0);
    }
  }
  return encodeOutputMessage(raw, false, 0);
}

export function sendTerminalOutput(ws, data, seq = 0, compress = true) {
  if (!data || data.length === 0) {
    return;
  }
  return ws.send(encodeTerminalOutput(data, seq, compress));
}

// ---- /terminal/tabs : client -> server ----------------------------------
export function decodeTabsClientMessage(raw) {
  let message;
  try {
    message = TabsClientMessage.decode(toUint8(raw));
  } catch {
    return null;
  }

  switch (message.body) {
    case 'ping':
      return { type: 'ping' };
    case 'addTab':
      return { type: 'add-tab' };
    case 'setActive':
      return { type: 'set-active', activeId: message.setActive.activeId };
    case 'updateTitle':
      return { type: 'update-title', tabId: message.updateTitle.tabId, title: message.updateTitle.title };
    case 'closeTab':
      return { type: 'close-tab', tabId: message.closeTab.tabId };
    case 'moveTab':
      return { type: 'move-tab', tabId: message.moveTab.tabId, targetId: message.moveTab.targetId, after: message.moveTab.after };
    default:
      return null;
  }
}

// ---- /terminal/tabs : server -> client ----------------------------------
export function encodeTabsServerMessage(message) {
  let payload;
  switch (message.type) {
    case 'tabs':
      payload = { tabs: toTabsStatePayload(message.state) };
      break;
    case 'error':
      payload = { error: { message: message.message ?? '' } };
      break;
    case 'pong':
      payload = { pong: {} };
      break;
    default:
      throw new Error(`Unknown tabs server message: ${message.type}`);
  }
  return TabsServerMessage.encode(payload).finish();
}

function toTabsStatePayload(state) {
  return {
    tabs: (state?.tabs ?? []).map((tab) => ({
      id: tab.id,
      title: tab.title,
      status: tab.status,
    })),
    activeId: state?.activeId ?? '',
  };
}

// ---- /auth/session ------------------------------------------------------
export function decodeAuthClientMessage(raw) {
  let message;
  try {
    message = AuthClientMessage.decode(toUint8(raw));
  } catch {
    return null;
  }

  if (message.body === 'ping') {
    return { type: 'ping' };
  }
  return null;
}

export function encodeAuthServerMessage(message) {
  let payload;
  switch (message.type) {
    case 'session-active':
      payload = { sessionActive: {} };
      break;
    case 'session-invalidated':
      payload = { sessionInvalidated: {} };
      break;
    case 'pong':
      payload = { pong: {} };
      break;
    default:
      throw new Error(`Unknown auth server message: ${message.type}`);
  }
  return AuthServerMessage.encode(payload).finish();
}
