import { describe, expect, test } from 'vitest';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import {
  FakeFontFaceSet, FakeSocket, TEST_TAB_ID, createHarness, emitResume, emitServerMessage, flushMicrotasks, loadLoop,
  makeFailureSequence, pingCount, readyInputConnection, runEffect, sentMessagesOfType,
} from './test-support/component-harness';

describe('runtime socket recovery', () => {
  for (const kind of ['tabs', 'terminal'] as const) {
    test(`${kind} retries a socket stuck in CONNECTING after 10 seconds`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      harness.clock.advance(9999);
      expect(harness.sockets).toHaveLength(1);
      expect(first.closeCalls).toBe(0);

      harness.clock.advance(1);
      expect(first.closeCalls).toBe(1);
      expect(harness.sockets).toHaveLength(1);

      harness.clock.advance(500);
      expect(harness.sockets).toHaveLength(2);
      expect(harness.sockets[1].readyState).toBe(FakeSocket.CONNECTING);
      cleanup();
    });

    test(`${kind} clears the CONNECTING watchdog when the socket opens`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      first.open();
      harness.clock.advance(10000);

      expect(first.closeCalls).toBe(0);
      expect(harness.sockets).toHaveLength(1);
      cleanup();
    });

    test(`${kind} keeps the first pong deadline across repeated focus`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];
      first.open();

      emitResume(harness, 'focus');
      expect(pingCount(first)).toBe(1);
      harness.clock.advance(2000);
      emitResume(harness, 'focus');
      expect(pingCount(first)).toBe(1);
      harness.clock.advance(500);

      expect(first.closeCalls).toBe(1);
      cleanup();
    });

    test(`${kind} heartbeat detects a silently dropped socket while a pong keeps it alive`, async () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];
      first.open();

      harness.clock.advance(19999);
      expect(pingCount(first)).toBe(0);
      harness.clock.advance(1);
      expect(pingCount(first)).toBe(1);
      // High latency within the generous pong window is not a dead connection.
      harness.clock.advance(7999);
      expect(first.closeCalls).toBe(0);
      emitServerMessage(harness, first, { type: 'pong' });
      await flushMicrotasks();
      harness.clock.advance(1);
      expect(first.closeCalls).toBe(0);

      harness.clock.advance(20000 - 8000);
      expect(pingCount(first)).toBe(2);
      harness.clock.advance(8000);
      expect(first.closeCalls).toBe(1);
      cleanup();
    });

    for (const event of ['focus', 'visibilitychange', 'online'] as const) {
      test(`${kind} ${event} bypasses a long reconnect backoff`, () => {
        const harness = createHarness();
        const { cleanup } = loadLoop(kind, harness);
        makeFailureSequence(harness);
        const before = harness.sockets.length;

        emitResume(harness, event);

        expect(harness.sockets).toHaveLength(before + 1);
        expect(harness.sockets.at(-1)?.readyState).toBe(FakeSocket.CONNECTING);
        cleanup();
      });
    }

    test(`${kind} cleanup cancels recovery timers and listeners`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      expect(harness.clock.pendingCount).toBeGreaterThan(0);
      expect(harness.window.listenerCount('focus')).toBe(1);
      expect(harness.window.listenerCount('online')).toBe(1);
      expect(harness.document.listenerCount('visibilitychange')).toBe(1);

      cleanup();

      expect(harness.clock.pendingCount).toBe(0);
      expect(harness.window.listenerCount('focus')).toBe(0);
      expect(harness.window.listenerCount('online')).toBe(0);
      expect(harness.document.listenerCount('visibilitychange')).toBe(0);
      const socketCount = harness.sockets.length;
      harness.clock.advance(20000);
      first.emit('close');
      first.emit('error');
      expect(harness.sockets).toHaveLength(socketCount);
    });

    test(`${kind} ignores stale callbacks after a replacement socket is active`, () => {
      const harness = createHarness();
      const { cleanup } = loadLoop(kind, harness);
      const first = harness.sockets[0];

      // Let the first connection's watchdog create the replacement, then fire
      // late callbacks from the first socket against the live replacement.
      harness.clock.advance(10000);
      harness.clock.advance(500);
      const replacement = harness.sockets[1];
      expect(replacement).toBeDefined();
      first.emit('open');
      first.emit('error');
      first.emit('close');

      expect(replacement.closeCalls).toBe(0);
      expect(harness.sockets).toHaveLength(2);
      cleanup();
    });
  }
});

describe('terminal renderer recovery', () => {
  test('an acknowledged grid returns to live output while a pending fit preserves the old parser grid', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    harness.clock.advance(120);
    terminal.buffer.active.baseY = 200;
    terminal.buffer.active.viewportY = 50;
    harness.clock.advance(120);
    expect(terminal.buffer.active.viewportY).toBe(50);
    harness.container.clientWidth = 640;
    // The open handler runs the same fit used by ResizeObserver before init.
    harness.sockets[0].open();
    expect(terminal.buffer.active.viewportY).toBe(50);
    emitServerMessage(harness, harness.sockets[0], { type: 'resize', cols: 63, rows: 23, seq: 1 });
    await flushMicrotasks();
    expect(terminal.buffer.active.viewportY).toBe(200);
    cleanup();
  });

  test('native terminal replies use the input socket without a custom mode-report handler', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'mode-probe' });
    const input = await readyInputConnection(harness, 'mode-probe');
    const terminal = harness.terminalInstances[0];
    terminal.emitData('\x1b[?2026;2$y');
    terminal.emitData('\x1b[?2004;1$y');
    expect(sentMessagesOfType(input, 'input').map((message) => message.data)).toEqual([
      '\x1b[?2026;2$y', '\x1b[?2004;1$y',
    ]);
    cleanup();
  });

  test('alternate-screen animation parses only dirty rows instead of forcing a full refresh', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    terminal.buffer.active.type = 'alternate';
    const before = terminal.refreshCalls;
    for (let frame = 0; frame < 20; frame++) terminal.emitParsed();
    expect(terminal.refreshCalls).toBe(before);
    terminal.buffer.active.baseY = 20;
    terminal.buffer.active.viewportY = 10;
    terminal.emitParsed();
    expect(terminal.refreshCalls).toBe(before);
    cleanup();
  });

  test('mouse capture passes wheel events to the application even with zero local scrollback', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    let blocked = false;
    const event = { preventDefault() { blocked = true; }, stopPropagation() {} };
    expect(terminal.wheelHandler?.(event)).toBe(false);
    expect(blocked).toBe(true);
    terminal.modes.mouseTrackingMode = 'any';
    blocked = false;
    expect(terminal.wheelHandler?.(event)).toBe(true);
    expect(blocked).toBe(false);
    cleanup();
  });

  test('opening a terminal does not switch font families or remeasure after connecting', async () => {
    const harness = createHarness();
    let releaseFonts!: () => void;
    const fontsReady = new Promise<void>((resolve) => { releaseFonts = resolve; });
    const fonts = new FakeFontFaceSet(fontsReady);
    harness.document.fonts = fonts;
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    const terminal = harness.terminalInstances[0];
    // The entry point loads the measuring glyphs before any pane is opened.
    expect(fonts.loadCalls).toEqual([]);
    const before = terminal.refreshCalls;
    releaseFonts();
    await flushMicrotasks();
    expect(terminal.refreshCalls).toBe(before);
    expect(terminal.options.fontFamily).toContain('Maple Mono NF CN');
    expect(harness.terminalInstances).toHaveLength(1);
    expect(harness.sockets).toHaveLength(1);
    expect(socket.closeCalls).toBe(0);
    cleanup();
  });

  test('a font chunk finishing later clears the glyph atlas and repaints the viewport', () => {
    const harness = createHarness();
    const fonts = new FakeFontFaceSet(new Promise<void>(() => {}));
    harness.document.fonts = fonts;
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const before = terminal.refreshCalls;
    fonts.dispatch('loadingdone');
    expect(terminal.textureAtlasClears).toBe(1);
    expect(terminal.refreshCalls).toBeGreaterThan(before);
    cleanup();
    expect(fonts.listenerCount('loadingdone')).toBe(0);
  });

  test('font events after unmount cannot revive timers or a disposed terminal', () => {
    const harness = createHarness();
    const fonts = new FakeFontFaceSet(Promise.resolve());
    harness.document.fonts = fonts;
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    cleanup();
    const before = terminal.refreshCalls;
    fonts.dispatch('loadingdone');
    expect(terminal.disposed).toBe(true);
    expect(terminal.refreshCalls).toBe(before);
    expect(terminal.textureAtlasClears).toBe(0);
    expect(harness.clock.pendingCount).toBe(0);
  });

  test('ordinary output does not force a full viewport refresh for each frame', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation-1', reset: false });
    await readyInputConnection(harness, 'generation-1');
    const terminal = harness.terminalInstances[0];
    const before = terminal.refreshCalls;
    for (let seq = 1; seq <= 10; seq++) {
      emitServerMessage(harness, output, { type: 'output', data: `line ${seq}\r\n`, seq });
      await flushMicrotasks();
    }
    expect(terminal.writes).toHaveLength(10);
    expect(terminal.refreshCalls).toBe(before);
    expect(terminal.options.fontFamily).toContain('Maple Mono NF CN');
    expect(terminal.options.fontFamily).not.toContain('Microsoft YaHei');
    cleanup();
  });

  test('unavailable WebGL keeps the terminal connection usable', () => {
    const harness = createHarness();
    harness.rendererUnavailable = true;
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    socket.open();

    expect(sentMessagesOfType(socket, 'init')).toHaveLength(1);
    expect(harness.rendererAddons[0].disposed).toBe(true);
    expect(harness.rendererAddons[0].contextLossListener).toBeUndefined();
    expect(harness.terminalInstances[0].disposed).toBe(false);
    cleanup();
  });

  test('context loss redraws the same terminal on a fresh WebGL renderer without replacing its socket', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    socket.open();
    const terminal = harness.terminalInstances[0];
    const before = terminal.refreshCalls;
    const addon = harness.rendererAddons[0];
    addon.contextLossListener?.();

    expect(addon.disposed).toBe(true);
    expect(addon.contextLossListener).toBeUndefined();
    expect(harness.rendererAddons).toHaveLength(2);
    expect(harness.rendererAddons[1].disposed).toBe(false);
    expect(harness.rendererAddons[1].contextLossListener).toBeDefined();
    expect(terminal.refreshCalls).toBeGreaterThan(before);
    expect(terminal.disposed).toBe(false);
    expect(socket.closeCalls).toBe(0);
    expect(harness.sockets).toHaveLength(1);
    cleanup();
    expect(harness.clock.pendingCount).toBe(0);
  });

  test('contexts that keep dying young stop at the DOM renderer until one survives the stable window', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    // The initial context and three quick replacements all die within seconds.
    for (let loss = 0; loss < 4; loss++) {
      harness.clock.advance(1000);
      harness.rendererAddons.at(-1)!.contextLossListener!();
    }
    expect(harness.rendererAddons).toHaveLength(4);
    expect(harness.rendererAddons.every((addon) => addon.disposed)).toBe(true);
    cleanup();

    const stable = createHarness();
    const stableLoop = loadLoop('terminal', stable);
    for (let loss = 0; loss < 3; loss++) stable.rendererAddons.at(-1)!.contextLossListener!();
    stable.clock.advance(30_000);
    stable.rendererAddons.at(-1)!.contextLossListener!();
    expect(stable.rendererAddons).toHaveLength(5);
    expect(stable.rendererAddons.at(-1)!.disposed).toBe(false);
    stableLoop.cleanup();
  });

  test('a background pane restores its lost WebGL renderer only when shown', () => {
    const harness = createHarness();
    const { cleanup, component } = loadLoop('terminal', harness, { active: false });
    harness.rendererAddons[0].contextLossListener!();
    expect(harness.rendererAddons).toHaveLength(1);

    harness.hooks.beginRender();
    component({
      tabId: TEST_TAB_ID, active: true, focusOnMount: false, authToken: 'test-token',
      preferences: { fontSize: 14 }, onStatusChange() {}, onTitleChange() {},
    });
    runEffect(harness, 'setActive(active)');
    expect(harness.rendererAddons).toHaveLength(2);
    expect(harness.rendererAddons[1].disposed).toBe(false);
    cleanup();
  });
});

describe('terminal client snapshot recovery', () => {
  test('a reset parses the snapshot at its saved grid while retaining a pending fit for the input handshake', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    const terminal = harness.terminalInstances[0];
    const initialGrid = [terminal.cols, terminal.rows];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', reset: true, lastSeq: 12,
      sessionGeneration: 'snapshot-size', cols: 40, rows: 10 });
    await flushMicrotasks();
    expect([terminal.cols, terminal.rows]).toEqual(initialGrid);
    terminal.deferWrites = true;
    emitServerMessage(harness, output, { type: 'output', data: 'saved screen' });
    await flushMicrotasks();
    expect([terminal.cols, terminal.rows]).toEqual(initialGrid);
    expect(terminal.writeCallbacks).toHaveLength(1);
    terminal.deferWrites = false;
    terminal.writeCallbacks.shift()!();
    const input = await readyInputConnection(harness, 'snapshot-size');
    expect([terminal.cols, terminal.rows]).toEqual([40, 10]);
    expect(sentMessagesOfType(input, 'resize')).toEqual([{ type: 'resize', cols: 79, rows: 23 }]);
    emitServerMessage(harness, output, { type: 'resize', cols: 79, rows: 23, seq: 13 });
    await flushMicrotasks();
    expect([terminal.cols, terminal.rows]).toEqual([79, 23]);
    cleanup();
  });
  test('a full restore is one synchronized update and input waits for the parser to finish', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    terminal.deferWrites = true;
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', reset: true, sessionGeneration: 'restore' });
    await flushMicrotasks();
    expect(harness.sockets).toHaveLength(1);
    expect(terminal.writes).toEqual([]);
    terminal.emitData('queued\r');
    emitServerMessage(harness, output, { type: 'output', data: 'complete history' });
    await flushMicrotasks();
    expect(harness.sockets).toHaveLength(1);
    // RIS and DEC 2026 around the snapshot bytes; only the closing write reports
    // completion, after xterm has parsed everything queued before it.
    expect(terminal.writes).toEqual(['\x1bc\x1b[?2026h', 'complete history', '\x1b[?2026l']);
    expect(terminal.writeCallbacks).toHaveLength(1);
    terminal.writeCallbacks.shift()!();
    const input = await readyInputConnection(harness, 'restore');
    expect(sentMessagesOfType(input, 'input')).toEqual([{ type: 'input', data: 'queued\r', inputSeq: 1 }]);
    cleanup();
  });

  test('a stale restore callback cannot attach input to a closed output socket', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    terminal.deferWrites = true;
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', reset: true, sessionGeneration: 'restore' });
    emitServerMessage(harness, output, { type: 'output', data: 'history' });
    await flushMicrotasks();
    output.close();
    terminal.writeCallbacks.shift()!();
    await flushMicrotasks();
    expect(harness.sockets).toHaveLength(1);
    cleanup();
  });

  test('a replaced-output handshake retries without printing an error or losing queued input', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation' });
    const input = await readyInputConnection(harness, 'generation');
    harness.terminalInstances[0].emitData('pending\r');
    emitServerMessage(harness, input, { type: 'error', message: 'Terminal output connection is not ready' });
    await flushMicrotasks();
    expect(output.closeCalls).toBe(1);
    expect(harness.terminalInstances[0].writes).toEqual([]);
    harness.clock.advance(500);
    const replacement = harness.sockets.at(-1)!;
    replacement.open();
    emitServerMessage(harness, replacement, { type: 'ready', sessionGeneration: 'generation' });
    const restoredInput = await readyInputConnection(harness, 'generation');
    expect(sentMessagesOfType(restoredInput, 'input')).toEqual([{ type: 'input', data: 'pending\r', inputSeq: 1 }]);
    cleanup();
  });

  test('an input timeout closes a stale pair even before the output close event arrives', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation' });
    await flushMicrotasks();
    const input = harness.sockets.at(-1)!;
    output.readyState = FakeSocket.CLOSED;
    expect(() => harness.clock.advance(10000)).not.toThrow();
    expect(input.closeCalls).toBe(1);
    cleanup();
  });

  test('uplink failure reconnects the pair and keeps pending input for deduplicated retry', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const output = harness.sockets[0];
    output.open();
    emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation-1' });
    const input = await readyInputConnection(harness, 'generation-1');
    harness.terminalInstances[0].emitData('pending\r');
    input.close();
    expect(output.closeCalls).toBe(1);
    harness.clock.advance(500);
    const replacement = harness.sockets.at(-1)!;
    expect(replacement.url).toBe('/terminal/output');
    replacement.open();
    emitServerMessage(harness, replacement, { type: 'ready', sessionGeneration: 'generation-1' });
    const replacementInput = await readyInputConnection(harness, 'generation-1');
    expect(sentMessagesOfType(replacementInput, 'input')).toEqual([{ type: 'input', data: 'pending\r', inputSeq: 1 }]);
    cleanup();
    expect(harness.clock.pendingCount).toBe(0);
  });

  test('retains input queued before a first ready with an unknown generation', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const socket = harness.sockets[0];

    terminal.emitData('queued before ready\r');
    socket.open();

    const init = sentMessagesOfType(socket, 'init')[0];
    expect(init.sessionGeneration).toBe('');
    emitServerMessage(harness, socket, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const input = await readyInputConnection(harness, 'generation-1');

    expect(sentMessagesOfType(socket, 'input')).toEqual([]);
    expect(sentMessagesOfType(input, 'input')).toEqual([
      { type: 'input', data: 'queued before ready\r', inputSeq: 1 },
    ]);
    cleanup();
  });

  test('retries the same pending input sequence across a same-generation reconnect until ack', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const first = harness.sockets[0];

    first.open();
    emitServerMessage(harness, first, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const firstInput = await readyInputConnection(harness, 'generation-1');
    terminal.emitData('pending command\r');
    expect(sentMessagesOfType(firstInput, 'input')).toEqual([
      { type: 'input', data: 'pending command\r', inputSeq: 1 },
    ]);

    first.close();
    harness.clock.advance(500);
    const second = harness.sockets.at(-1)!;
    second.open();
    const secondInit = sentMessagesOfType(second, 'init')[0];
    expect(secondInit.sessionGeneration).toBe('generation-1');
    emitServerMessage(harness, second, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const secondInput = await readyInputConnection(harness, 'generation-1');
    expect(sentMessagesOfType(secondInput, 'input')).toEqual([
      { type: 'input', data: 'pending command\r', inputSeq: 1 },
    ]);

    emitServerMessage(harness, secondInput, { type: 'input-ack', inputSeq: 1 });
    await flushMicrotasks();
    second.close();
    harness.clock.advance(500);
    const third = harness.sockets.at(-1)!;
    third.open();
    emitServerMessage(harness, third, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const thirdInput = await readyInputConnection(harness, 'generation-1');

    expect(sentMessagesOfType(thirdInput, 'input')).toEqual([]);
    cleanup();
  });

  test('discards pending input on a new generation, resets numbering, and keeps the stream id', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const first = harness.sockets[0];

    first.open();
    emitServerMessage(harness, first, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: false,
      gap: false,
      lastSeq: 0,
    });
    const firstInput = await readyInputConnection(harness, 'generation-1');
    terminal.emitData('old pending command\r');
    expect(sentMessagesOfType(firstInput, 'input')).toHaveLength(1);

    const firstInit = sentMessagesOfType(first, 'init')[0];
    first.close();
    harness.clock.advance(500);
    const second = harness.sockets.at(-1)!;
    second.open();
    const secondInit = sentMessagesOfType(second, 'init')[0];
    expect(secondInit.sessionGeneration).toBe('generation-1');
    expect(secondInit.inputStreamId).toBe(firstInit.inputStreamId);
    emitServerMessage(harness, second, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-2',
      sessionGeneration: 'generation-2',
      reset: true,
      gap: true,
      lastSeq: 0,
    });
    emitServerMessage(harness, second, { type: 'output', data: '\x1b[0m' });
    const secondInput = await readyInputConnection(harness, 'generation-2');

    expect(sentMessagesOfType(secondInput, 'input')).toEqual([]);
    expect(harness.stateUpdates).toContain(true);

    terminal.emitData('new command\r');
    expect(sentMessagesOfType(secondInput, 'input')).toEqual([
      { type: 'input', data: 'new command\r', inputSeq: 1 },
    ]);

    second.close();
    harness.clock.advance(500);
    const third = harness.sockets.at(-1)!;
    third.open();
    const thirdInit = sentMessagesOfType(third, 'init')[0];
    expect(thirdInit.sessionGeneration).toBe('generation-2');
    expect(thirdInit.inputStreamId).toBe(firstInit.inputStreamId);
    cleanup();
  });

  test('writes RIS before applying a reset snapshot frame', async () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const socket = harness.sockets[0];

    socket.open();
    emitServerMessage(harness, socket, {
      type: 'ready',
      cwd: '/root',
      sessionId: 'session-1',
      sessionGeneration: 'generation-1',
      reset: true,
      gap: false,
      lastSeq: 0,
    });
    emitServerMessage(harness, socket, {
      type: 'output',
      data: 'authoritative snapshot',
      seq: 1,
    });
    await flushMicrotasks();

    expect(terminal.writes.join('')).toBe('\x1bc\x1b[?2026hauthoritative snapshot\x1b[?2026l');
    cleanup();
  });

  test('the client reset frame restores dirty normal and alternate screens to a serialized snapshot', async () => {
    const reference = new headlessXterm.Terminal({ allowProposedApi: true, cols: 20, rows: 4, scrollback: 1000 });
    const referenceSerializer = new SerializeAddon();
    reference.loadAddon(referenceSerializer);
    await new Promise<void>((resolve) => reference.write('normal snapshot\r\n', resolve));
    await new Promise<void>((resolve) => reference.write('\x1b[?1049h\x1b[Halternate snapshot', resolve));
    const snapshot = referenceSerializer.serialize();

    // Drive the real client so the frame it writes (RIS + synchronized snapshot)
    // is what gets replayed onto a dirty xterm, not a copy of its escape sequence.
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const socket = harness.sockets[0];
    socket.open();
    emitServerMessage(harness, socket, { type: 'ready', sessionGeneration: 'generation-1', reset: true, lastSeq: 0 });
    emitServerMessage(harness, socket, { type: 'output', data: snapshot, seq: 1 });
    await flushMicrotasks();
    const resetWrites = [...harness.terminalInstances[0].writes];
    cleanup();
    expect(resetWrites.length).toBeGreaterThan(0);

    const dirty = new headlessXterm.Terminal({ allowProposedApi: true, cols: 20, rows: 4, scrollback: 1000 });
    const dirtySerializer = new SerializeAddon();
    dirty.loadAddon(dirtySerializer);
    await new Promise<void>((resolve) => dirty.write('dirty normal\r\n', resolve));
    await new Promise<void>((resolve) => dirty.write('\x1b[?1049h\x1b[Hdirty alternate', resolve));
    for (const data of resetWrites) await new Promise<void>((resolve) => dirty.write(data, resolve));

    expect(dirty.buffer.active.type).toBe('alternate');
    expect(dirtySerializer.serialize()).toBe(snapshot);
    reference.dispose();
    dirty.dispose();
  });
});
