import { deflateSync } from 'node:zlib';

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

// Terminal output is the hot path, so it keeps the raw-DEFLATE compression the
// old codec used — the bytes just travel inside the protobuf output field now.
export function encodeTerminalOutput(text, seq = 0) {
  const raw = Buffer.from(String(text), 'utf8');
  let payload = raw;
  let useCompressed = false;

  if (raw.length >= TERMINAL_OUTPUT_COMPRESSION_THRESHOLD) {
    const compressed = deflateSync(raw);
    if (compressed.length < raw.length) {
      payload = compressed;
      useCompressed = true;
    }
  }

  const message = {
    output: { data: payload, compressed: useCompressed },
  };
  if (Number.isFinite(seq) && seq > 0) {
    message.seq = Math.floor(seq);
  }
  return TerminalServerMessage.encode(message).finish();
}

export function sendTerminalOutput(ws, text, seq = 0) {
  const value = String(text);
  if (!value) {
    return;
  }
  ws.send(encodeTerminalOutput(value, seq));
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
