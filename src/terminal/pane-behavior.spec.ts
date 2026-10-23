import { describe, expect, test } from 'vitest';
import {
  createHarness, emitServerMessage, findElements, flushMicrotasks, loadLoop, readyInputConnection, runEffect,
  sentMessagesOfType, TEST_TAB_ID, type FakeKeyEvent, type Harness,
} from './test-support/component-harness';
import { terminalTheme } from './themes';

function keydown(key: string, modifiers: { ctrlKey?: boolean; metaKey?: boolean } = {}) {
  let prevented = false;
  const event: FakeKeyEvent = { type: 'keydown', key, ...modifiers, preventDefault() { prevented = true; } };
  return { event, prevented: () => prevented };
}

async function connectedPane(harness: Harness, props: Record<string, unknown> = {}) {
  const loop = loadLoop('terminal', harness, props);
  const output = harness.sockets[0];
  output.open();
  emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'generation-1', reset: false });
  const input = await readyInputConnection(harness, 'generation-1');
  return { ...loop, output, input, terminal: harness.terminalInstances[0] };
}

describe('terminal pane keyboard and clipboard', () => {
  test('touch shortcut keys use the terminal input connection and application cursor mode', async () => {
    const harness = createHarness();
    const { cleanup, input, terminal, rendered } = await connectedPane(harness);
    const click = (label: string) => {
      const [button] = findElements(rendered, (node) => node.type === 'button' && node.props['aria-label'] === label);
      (button.props.onClick as () => void)();
    };
    click('Escape');
    click('Tab');
    click('中断命令');
    click('向上');
    Object.assign(terminal.modes, { applicationCursorKeysMode: true });
    click('向左');
    expect(sentMessagesOfType(input, 'input').map((message) => message.data)).toEqual(['\x1b', '\t', '\x03', '\x1b[A', '\x1bOD']);
    cleanup();
  });
  test('Ctrl/Cmd+V stays on the browser paste path that xterm handles natively', async () => {
    const harness = createHarness();
    const { cleanup, input, terminal } = await connectedPane(harness);

    for (const modifiers of [{ ctrlKey: true }, { metaKey: true }]) {
      const paste = keydown('v', modifiers);
      // false = xterm must not translate the chord; no preventDefault = the native
      // paste event still reaches xterm's textarea (bracketed paste, newline rules).
      expect(terminal.keyHandler?.(paste.event)).toBe(false);
      expect(paste.prevented()).toBe(false);
    }
    await flushMicrotasks();
    expect(sentMessagesOfType(input, 'input')).toEqual([]);
    expect(harness.clipboardWrites).toEqual([]);
    cleanup();
  });

  test('Ctrl+C copies an active selection and otherwise reaches the shell as an interrupt', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];

    const interrupt = keydown('c', { ctrlKey: true });
    expect(terminal.keyHandler?.(interrupt.event)).toBe(true);
    expect(interrupt.prevented()).toBe(false);

    terminal.selection = 'selected text';
    const copy = keydown('C', { ctrlKey: true });
    expect(terminal.keyHandler?.(copy.event)).toBe(false);
    expect(copy.prevented()).toBe(true);
    expect(harness.clipboardWrites).toEqual(['selected text']);

    expect(terminal.keyHandler?.({ ...keydown('c', { ctrlKey: true }).event, type: 'keyup' })).toBe(true);
    expect(terminal.keyHandler?.(keydown('a').event)).toBe(true);
    cleanup();
  });
});

describe('terminal pane layout', () => {
  test('the fitted grid reserves the scrollbar gutter so the last column is never clipped', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    harness.container.clientWidth = 801;
    const socket = harness.sockets[0];
    socket.open();

    // 801x600 px frame of 10x25 px cells: an unguarded fit would claim 80x24. The
    // 3 px scrollbar gutter and 1 px edge guard leave room for 79x23 whole cells.
    const [init] = sentMessagesOfType(socket, 'init');
    expect({ cols: init.cols, rows: init.rows }).toEqual({ cols: 79, rows: 23 });
    cleanup();
  });

  test('the overview-ruler border blends into the background instead of drawing a right-edge line', () => {
    expect(terminalTheme.overviewRulerBorder).toBe(terminalTheme.background);
  });

  test('the viewport scroll affordance follows xterm scrollback state', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    const terminal = harness.terminalInstances[0];
    const viewport = terminal.element.querySelector('.xterm-viewport');

    terminal.emitParsed();
    expect(viewport.classList.contains('has-scrollback')).toBe(false);
    terminal.buffer.active.baseY = 3;
    terminal.buffer.active.viewportY = 3;
    terminal.emitParsed();
    expect(viewport.classList.contains('has-scrollback')).toBe(true);
    cleanup();
  });

  test('an inactive pane hides the xterm cursor and drops keyboard focus', () => {
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness, { active: false });
    const terminal = harness.terminalInstances[0];
    expect(terminal.options).toMatchObject({ cursorBlink: false, cursorInactiveStyle: 'none' });

    runEffect(harness, 'blur()');
    expect(terminal.blurCalls).toBe(1);
    cleanup();
  });

  test('a remounted pane requests a fresh fit and waits for each replacement grid acknowledgement', async () => {
    // React StrictMode (and an auth token change) tears the terminal down and
    // builds a new one in the same pane.
    const harness = createHarness();
    const { cleanup } = loadLoop('terminal', harness);
    harness.sockets[0].open();
    emitServerMessage(harness, harness.sockets[0], { type: 'resize', cols: 79, rows: 23, seq: 1 });
    await flushMicrotasks();
    expect([harness.terminalInstances[0].cols, harness.terminalInstances[0].rows]).toEqual([79, 23]);
    cleanup();

    const cleanupRemount = runEffect(harness, 'connectTerminal');
    harness.sockets.at(-1)!.open();
    const replacementSocket = harness.sockets.at(-1)!;
    replacementSocket.open();
    emitServerMessage(harness, replacementSocket, { type: 'resize', cols: 79, rows: 23, seq: 1 });
    await flushMicrotasks();
    expect([harness.terminalInstances[1].cols, harness.terminalInstances[1].rows]).toEqual([79, 23]);
    cleanupRemount();
  });
});

describe('background terminal panes', () => {
  const paneProps = (active: boolean) => ({
    tabId: TEST_TAB_ID, active, focusOnMount: false, authToken: 'test-token',
    preferences: { fontSize: 14 }, onStatusChange() {}, onTitleChange() {},
  });

  test('a hidden pane keeps its output connection and repaints the whole viewport when shown', async () => {
    const harness = createHarness();
    const { cleanup, component, output, terminal } = await connectedPane(harness, { active: false });
    for (let seq = 1; seq <= 5; seq++) {
      emitServerMessage(harness, output, { type: 'output', data: `line ${seq}\r\n`, seq });
      await flushMicrotasks();
    }
    harness.clock.advance(1000);
    expect(terminal.writes).toHaveLength(5);
    const beforeShowing = terminal.paints.length;

    harness.hooks.beginRender();
    component(paneProps(true));
    runEffect(harness, 'setActive(active)');
    harness.clock.advance(100);
    expect(terminal.paints.slice(beforeShowing)).toEqual([[0, terminal.rows - 1]]);

    // Hiding the pane again keeps parsing on the same connection. The browser's
    // IntersectionObserver controls painting; the component does not patch it.
    harness.hooks.beginRender();
    component(paneProps(false));
    runEffect(harness, 'setActive(active)');
    emitServerMessage(harness, output, { type: 'output', data: 'line 6\r\n', seq: 6 });
    await flushMicrotasks();
    harness.clock.advance(1000);
    expect(terminal.writes).toHaveLength(6);
    expect(harness.terminalInstances).toHaveLength(1);
    cleanup();
  });

  test('a visible pane uses xterm animation frames without an extra render-rate cap', async () => {
    const harness = createHarness();
    const { cleanup, output, terminal } = await connectedPane(harness);
    harness.clock.advance(1000);
    const before = terminal.paints.length;
    for (let seq = 1; seq <= 50; seq++) {
      emitServerMessage(harness, output, { type: 'output', data: `line ${seq}\r\n`, seq });
      await flushMicrotasks();
      harness.clock.advance(10);
    }
    // Fifty writes over 500 ms are coalesced by the native 16 ms frame scheduler.
    const painted = terminal.paints.length - before;
    expect(painted).toBeGreaterThanOrEqual(24);
    expect(painted).toBeLessThanOrEqual(26);
    cleanup();
  });
});

describe('terminal pane output ordering', () => {
  test('out-of-order output frames are applied in sequence and duplicates are dropped', async () => {
    const harness = createHarness();
    const { cleanup, output, terminal } = await connectedPane(harness);

    emitServerMessage(harness, output, { type: 'output', data: 'second', seq: 2 });
    await flushMicrotasks();
    expect(terminal.writes).toEqual([]);
    emitServerMessage(harness, output, { type: 'output', data: 'first', seq: 1 });
    emitServerMessage(harness, output, { type: 'output', data: 'first', seq: 1 });
    emitServerMessage(harness, output, { type: 'output', data: 'third', seq: 3 });
    await flushMicrotasks();

    expect(terminal.writes).toEqual(['first', 'second', 'third']);
    expect(output.closeCalls).toBe(0);
    cleanup();
  });

  test('a sequence gap that never fills closes the socket to resync from a snapshot', async () => {
    const harness = createHarness();
    const { cleanup, output, terminal } = await connectedPane(harness);

    emitServerMessage(harness, output, { type: 'output', data: 'later', seq: 2 });
    await flushMicrotasks();
    harness.clock.advance(250);

    expect(terminal.writes).toEqual([]);
    expect(output.closeCalls).toBe(1);
    cleanup();
  });

  test('reconnect announces the last applied output sequence', async () => {
    const harness = createHarness();
    const { cleanup, output } = await connectedPane(harness);

    emitServerMessage(harness, output, { type: 'output', data: 'a', seq: 1 });
    emitServerMessage(harness, output, { type: 'output', data: 'b', seq: 2 });
    await flushMicrotasks();
    output.close();
    harness.clock.advance(500);
    const replacement = harness.sockets.find((socket) => socket !== output && socket.url === '/terminal/output')!;
    replacement.open();

    expect(sentMessagesOfType(replacement, 'init')[0].lastSeq).toBe(2);
    cleanup();
  });
});
