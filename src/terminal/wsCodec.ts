import { cloudcli } from '../../proto/messages.js';

import type { TerminalServerMessage, TerminalTabsServerMessage } from './types';

const {
  TerminalClientMessage,
  TerminalServerMessage: TerminalServerMessageProto,
  TabsClientMessage,
  TabsServerMessage,
  AuthServerMessage,
} = cloudcli;

type DecompressionStreamConstructor = new (
  format: 'deflate'
) => TransformStream<Uint8Array, Uint8Array>;

const textDecoder = new TextDecoder();

export type TerminalClientMessage =
  | { type: 'init'; sessionId: string; cols: number; rows: number; cwd?: string; forceRestart?: boolean; lastSeq?: number }
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'close' }
  | { type: 'ping' };

export type TabsClientMessage =
  | { type: 'ping' }
  | { type: 'add-tab' }
  | { type: 'set-active'; activeId: string }
  | { type: 'update-title'; tabId: string; title: string }
  | { type: 'close-tab'; tabId: string };

async function toBytes(raw: MessageEvent['data']): Promise<Uint8Array | null> {
  if (raw instanceof Uint8Array) {
    return raw;
  }
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }
  if (raw instanceof Blob) {
    return new Uint8Array(await raw.arrayBuffer());
  }
  return null;
}

async function inflateDeflate(payload: Uint8Array) {
  const DecompressionStreamCtor = (
    globalThis as typeof globalThis & {
      DecompressionStream?: DecompressionStreamConstructor;
    }
  ).DecompressionStream;

  if (!DecompressionStreamCtor) {
    throw new Error('Compressed terminal output requires DecompressionStream support');
  }

  const payloadCopy = new Uint8Array(payload.byteLength);
  payloadCopy.set(payload);
  const stream = new Blob([payloadCopy.buffer]).stream().pipeThrough(new DecompressionStreamCtor('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// ---- /terminal ----------------------------------------------------------
export function encodeTerminalClientMessage(message: TerminalClientMessage): Uint8Array {
  switch (message.type) {
    case 'init':
      return TerminalClientMessage.encode({
        init: {
          sessionId: message.sessionId,
          cols: message.cols,
          rows: message.rows,
          cwd: message.cwd ?? '',
          forceRestart: message.forceRestart ?? false,
          lastSeq: message.lastSeq ?? 0,
        },
      }).finish();
    case 'input':
      return TerminalClientMessage.encode({ input: { data: message.data } }).finish();
    case 'resize':
      return TerminalClientMessage.encode({ resize: { cols: message.cols, rows: message.rows } }).finish();
    case 'close':
      return TerminalClientMessage.encode({ close: {} }).finish();
    case 'ping':
      return TerminalClientMessage.encode({ ping: {} }).finish();
  }
}

export async function decodeTerminalServerMessage(
  raw: MessageEvent['data']
): Promise<TerminalServerMessage | null> {
  const bytes = await toBytes(raw);
  if (!bytes) {
    return null;
  }

  let message: cloudcli.TerminalServerMessage;
  try {
    message = TerminalServerMessageProto.decode(bytes);
  } catch {
    return null;
  }

  switch (message.body) {
    case 'ready':
      return {
        type: 'ready',
        cwd: message.ready!.cwd,
        sessionId: message.ready!.sessionId,
        reset: message.ready!.reset,
        gap: message.ready!.gap,
        lastSeq: message.ready!.lastSeq,
        seq: message.seq,
      };
    case 'output': {
      const output = message.output!;
      const payload = output.data ?? new Uint8Array(0);
      try {
        const data = output.compressed ? await inflateDeflate(payload) : payload;
        return { type: 'output', data: textDecoder.decode(data), seq: message.seq };
      } catch {
        return { type: 'error', message: 'Unable to decode compressed terminal output', seq: message.seq };
      }
    }
    case 'exit':
      return { type: 'exit', exitCode: message.exit!.exitCode, signal: message.exit!.signal || null, seq: message.seq };
    case 'error':
      return { type: 'error', message: message.error!.message, seq: message.seq };
    case 'pong':
      return { type: 'pong', seq: message.seq };
    default:
      return null;
  }
}

// ---- /terminal/tabs -----------------------------------------------------
export function encodeTabsClientMessage(message: TabsClientMessage): Uint8Array {
  switch (message.type) {
    case 'ping':
      return TabsClientMessage.encode({ ping: {} }).finish();
    case 'add-tab':
      return TabsClientMessage.encode({ addTab: {} }).finish();
    case 'set-active':
      return TabsClientMessage.encode({ setActive: { activeId: message.activeId } }).finish();
    case 'update-title':
      return TabsClientMessage.encode({ updateTitle: { tabId: message.tabId, title: message.title } }).finish();
    case 'close-tab':
      return TabsClientMessage.encode({ closeTab: { tabId: message.tabId } }).finish();
  }
}

export async function decodeTabsServerMessage(
  raw: MessageEvent['data']
): Promise<TerminalTabsServerMessage | null> {
  const bytes = await toBytes(raw);
  if (!bytes) {
    return null;
  }

  let message: cloudcli.TabsServerMessage;
  try {
    message = TabsServerMessage.decode(bytes);
  } catch {
    return null;
  }

  switch (message.body) {
    case 'tabs': {
      const state = message.tabs!;
      // The caller re-validates via normalizeTabsState, so a structural cast
      // here mirrors the old JSON.parse path.
      return {
        type: 'tabs',
        state: {
          tabs: (state.tabs ?? []).map((tab) => ({
            id: tab.id,
            title: tab.title,
            status: tab.status,
          })),
          activeId: state.activeId,
        },
      } as TerminalTabsServerMessage;
    }
    case 'error':
      return { type: 'error', message: message.error!.message };
    case 'pong':
      return { type: 'pong' };
    default:
      return null;
  }
}

// ---- /auth/session ------------------------------------------------------
export async function decodeAuthServerMessage(
  raw: MessageEvent['data']
): Promise<{ type: string } | null> {
  const bytes = await toBytes(raw);
  if (!bytes) {
    return null;
  }

  let message: cloudcli.AuthServerMessage;
  try {
    message = AuthServerMessage.decode(bytes);
  } catch {
    return null;
  }

  switch (message.body) {
    case 'sessionActive':
      return { type: 'session-active' };
    case 'sessionInvalidated':
      return { type: 'session-invalidated' };
    case 'pong':
      return { type: 'pong' };
    default:
      return null;
  }
}
