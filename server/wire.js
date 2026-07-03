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
      };
    }
    case 'input':
      return { type: 'input', data: message.input.data };
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
      payload = { ready: { cwd: message.cwd ?? '', sessionId: message.sessionId ?? '' } };
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
    default:
      throw new Error(`Unknown terminal server message: ${message.type}`);
  }
  return TerminalServerMessage.encode(payload).finish();
}

// Terminal output is the hot path, so it keeps the raw-DEFLATE compression the
// old codec used — the bytes just travel inside the protobuf output field now.
export function encodeTerminalOutput(text) {
  const raw = Buffer.from(String(text), 'utf8');
  const compressed = deflateSync(raw);
  const useCompressed = compressed.length < raw.length;
  return TerminalServerMessage.encode({
    output: { data: useCompressed ? compressed : raw, compressed: useCompressed },
  }).finish();
}

export function sendTerminalOutput(ws, text) {
  const value = String(text);
  if (!value) {
    return;
  }
  ws.send(encodeTerminalOutput(value));
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
    case 'restartTab':
      return { type: 'restart-tab', tabId: message.restartTab.tabId };
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
    nextIndex: state?.nextIndex ?? 0,
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
