import { describe, expect, test } from 'bun:test';

import {
  decodeTabsClientMessage,
  decodeTerminalClientMessage,
  encodeAuthServerMessage,
  encodeTabsServerMessage,
  encodeTerminalOutput,
  encodeTerminalServerMessage,
} from '../../server/wire.js';
import {
  decodeAuthServerMessage,
  decodeTabsServerMessage,
  decodeTerminalServerMessage,
  encodeTabsClientMessage,
  encodeTerminalClientMessage,
} from './wsCodec';

// The client codec (wsCodec) and the server codec (wire.js) are two ends of the same
// protobuf wire. These tests drive real bytes between them, so a schema or compression
// mismatch fails here instead of only at runtime against a live shell.

describe('terminal client -> server', () => {
  test('init carries every field through the wire', () => {
    const bytes = encodeTerminalClientMessage({
      type: 'init', sessionId: 's1', cols: 120, rows: 40, cwd: '/tmp', forceRestart: true, lastSeq: 7,
    });
    expect(decodeTerminalClientMessage(bytes)).toEqual({
      type: 'init', sessionId: 's1', cols: 120, rows: 40, cwd: '/tmp', forceRestart: true, lastSeq: 7,
    });
  });

  test('input, resize, close and ping round-trip', () => {
    expect(decodeTerminalClientMessage(encodeTerminalClientMessage({ type: 'input', data: 'ls -al\r' })))
      .toEqual({ type: 'input', data: 'ls -al\r' });
    expect(decodeTerminalClientMessage(encodeTerminalClientMessage({ type: 'resize', cols: 80, rows: 24 })))
      .toEqual({ type: 'resize', cols: 80, rows: 24 });
    expect(decodeTerminalClientMessage(encodeTerminalClientMessage({ type: 'close' })))
      .toEqual({ type: 'close' });
    expect(decodeTerminalClientMessage(encodeTerminalClientMessage({ type: 'ping' })))
      .toEqual({ type: 'ping' });
  });
});

describe('terminal server -> client', () => {
  test('ready reflects the resume fields and seq', async () => {
    const frame = encodeTerminalServerMessage({
      type: 'ready', cwd: '/root', sessionId: 's1', reset: true, gap: false, lastSeq: 3, seq: 1,
    });
    expect(await decodeTerminalServerMessage(frame)).toEqual({
      type: 'ready', cwd: '/root', sessionId: 's1', reset: true, gap: false, lastSeq: 3, seq: 1,
    });
  });

  test('a small payload travels uncompressed and decodes to text', async () => {
    expect(await decodeTerminalServerMessage(encodeTerminalOutput('hello world', 5)))
      .toEqual({ type: 'output', data: 'hello world', seq: 5 });
  });

  test('a large payload is deflated by the server and inflated by the client', async () => {
    const big = 'the quick brown fox jumps over the lazy dog. '.repeat(400);
    const frame = encodeTerminalOutput(big, 9);
    // The server must actually have compressed it, otherwise this asserts nothing.
    expect(frame.byteLength).toBeLessThan(big.length);
    expect(await decodeTerminalServerMessage(frame)).toEqual({ type: 'output', data: big, seq: 9 });
  });

  test('exit maps an empty signal back to null', async () => {
    expect(await decodeTerminalServerMessage(encodeTerminalServerMessage({ type: 'exit', exitCode: 0, signal: null, seq: 4 })))
      .toEqual({ type: 'exit', exitCode: 0, signal: null, seq: 4 });
    expect(await decodeTerminalServerMessage(encodeTerminalServerMessage({ type: 'exit', exitCode: 137, signal: 'SIGKILL', seq: 6 })))
      .toEqual({ type: 'exit', exitCode: 137, signal: 'SIGKILL', seq: 6 });
  });

  test('error and pong round-trip', async () => {
    expect(await decodeTerminalServerMessage(encodeTerminalServerMessage({ type: 'error', message: 'boom', seq: 2 })))
      .toEqual({ type: 'error', message: 'boom', seq: 2 });
    expect(await decodeTerminalServerMessage(encodeTerminalServerMessage({ type: 'pong' })))
      .toEqual({ type: 'pong', seq: 0 });
  });

  test('garbage bytes decode to null rather than throwing', async () => {
    expect(await decodeTerminalServerMessage(new Uint8Array([0xff, 0xff, 0xff, 0x01]))).toBeNull();
  });
});

describe('tabs and auth channels', () => {
  test('a tabs command reaches the server decoder intact', () => {
    const bytes = encodeTabsClientMessage({ type: 'update-title', tabId: 'terminal-1', title: 'Ruvia' });
    expect(decodeTabsClientMessage(bytes)).toEqual({ type: 'update-title', tabId: 'terminal-1', title: 'Ruvia' });
  });

  test('tabs state round-trips with per-tab status', async () => {
    const frame = encodeTabsServerMessage({
      type: 'tabs',
      state: {
        tabs: [{ id: 'terminal-1', title: 'one', status: 'connected' }],
        activeId: 'terminal-1',
        nextIndex: 2,
      },
    });
    expect(await decodeTabsServerMessage(frame)).toEqual({
      type: 'tabs',
      state: {
        tabs: [{ id: 'terminal-1', title: 'one', status: 'connected' }],
        activeId: 'terminal-1',
        nextIndex: 2,
      },
    });
  });

  test('auth session frames map onto client event types', async () => {
    expect(await decodeAuthServerMessage(encodeAuthServerMessage({ type: 'session-active' })))
      .toEqual({ type: 'session-active' });
    expect(await decodeAuthServerMessage(encodeAuthServerMessage({ type: 'session-invalidated' })))
      .toEqual({ type: 'session-invalidated' });
  });
});
