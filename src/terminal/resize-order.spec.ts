import { expect, test } from 'vitest';
import headless from '@xterm/headless';
import type { Terminal } from '@xterm/xterm';
import { SerializeAddon } from '@xterm/addon-serialize';
import { createHarness, loadModule, flushMicrotasks } from './test-support/component-harness';
import { resizeFixture as fixture, bufferRows } from '../../server/test-support/resize-fixture.js';
import { encodeTerminalOutput, encodeTerminalServerMessage } from '../../server/wire.js';
import { encodeTerminalClientMessage, decodeTerminalServerMessage } from './wsCodec';
import type { connectTerminal } from './connection';

const write = (terminal: headless.Terminal, data: string) => new Promise<void>(resolve => terminal.write(data, resolve));
const createTerminal = () => new headless.Terminal({ allowProposedApi: true, cols: fixture.cols, rows: fixture.oldRows, scrollback: 1000 });

test('resizing before in-flight ANSI output destroys historical rows without any OMP code', async () => {
  const expected = createTerminal();
  const eager = createTerminal();
  try {
    await write(expected, fixture.initial);
    await write(eager, fixture.initial);
    await write(expected, fixture.oldPaint);
    expected.resize(fixture.cols, fixture.newRows);
    eager.resize(fixture.cols, fixture.newRows);
    await write(eager, fixture.oldPaint);
    await write(expected, fixture.newPaint);
    await write(eager, fixture.newPaint);
    const missing = bufferRows(expected).filter(row => row && !bufferRows(eager).includes(row));
    expect(missing.length).toBeGreaterThan(0);
  } finally { expected.dispose(); eager.dispose(); }
});

test('the real connection applies resize fences after old output and before new output, retaining snapshot rows', async () => {
  const harness = createHarness();
  const model = createTerminal();
  const expected = createTerminal();
  const serializer = new SerializeAddon();
  model.loadAddon(serializer);
  const module = loadModule(new URL('./connection.ts', import.meta.url), harness, {
    overrides: { './wsCodec': { encodeTerminalClientMessage, decodeTerminalServerMessage } },
  }) as { connectTerminal: typeof connectTerminal };
  const terminal = {
    get cols() { return model.cols; }, get rows() { return model.rows; },
    write: model.write.bind(model), resize: model.resize.bind(model), scrollToBottom() {}, writeln() {},
  } as unknown as Terminal;
  const connection = module.connectTerminal({ terminal, tabId: 'resize-test', authToken: 'test',
    beforeInit() {}, afterInit() {}, onReady() {}, onSessionRebuilt() {}, onStatusChange() {} });
  const output = harness.sockets[0];
  const settle = async () => {
    for (let i = 0; i < 20; i++) { await new Promise(resolve => setTimeout(resolve, 1)); await flushMicrotasks(); }
    await write(model, '');
  };
  try {
    output.open();
    output.emit('message', encodeTerminalOutput(fixture.initial, 1));
    await settle();
    connection.resize(fixture.cols, fixture.newRows);
    expect(model.rows).toBe(fixture.oldRows);
    output.emit('message', encodeTerminalOutput(fixture.oldPaint, 2));
    output.emit('message', encodeTerminalServerMessage({ type: 'resize', cols: fixture.cols, rows: fixture.newRows, seq: 3 }));
    output.emit('message', encodeTerminalOutput(fixture.newPaint, 4));
    await settle();
    await write(expected, fixture.initial);
    await write(expected, fixture.oldPaint);
    expected.resize(fixture.cols, fixture.newRows);
    await write(expected, fixture.newPaint);
    expect(bufferRows(model)).toEqual(bufferRows(expected));
    const restored = createTerminal();
    restored.resize(fixture.cols, fixture.newRows);
    try { await write(restored, serializer.serialize()); expect(bufferRows(restored)).toEqual(bufferRows(expected)); }
    finally { restored.dispose(); }
  } finally { connection.dispose(); model.dispose(); expected.dispose(); }
});
