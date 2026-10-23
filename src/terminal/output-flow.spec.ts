import { expect, test } from 'vitest';
import { createHarness, emitServerMessage, flushMicrotasks, loadLoop, readyInputConnection, sentMessagesOfType } from './test-support/component-harness';
import { decodeTerminalClientMessage } from '../../server/wire.js';
import { encodeTerminalClientMessage } from './wsCodec';

async function connected() {
  const harness = createHarness();
  const { cleanup } = loadLoop('terminal', harness);
  const output = harness.sockets[0];
  output.open();
  emitServerMessage(harness, output, { type: 'ready', sessionGeneration: 'flow' });
  const input = await readyInputConnection(harness, 'flow');
  return { harness, cleanup, output, input, terminal: harness.terminalInstances[0] };
}

test('output credit round-trips through the actual protobuf protocol, including snapshot sequence zero', () => {
  for (const seq of [0, 1234]) {
    const message = { type: 'output-ack' as const, seq };
    expect(decodeTerminalClientMessage(encodeTerminalClientMessage(message))).toEqual(message);
  }
});

test('large output is acknowledged only after xterm consumes it', async () => {
  const { harness, cleanup, output, input, terminal } = await connected();
  terminal.deferWrites = true;
  emitServerMessage(harness, output, { type: 'output', seq: 1, data: 'x'.repeat(65536) });
  await flushMicrotasks();
  harness.clock.advance(100);
  expect(sentMessagesOfType(input, 'output-ack')).toEqual([]);
  expect(terminal.writeCallbacks).toHaveLength(1);
  terminal.writeCallbacks.shift()!();
  expect(sentMessagesOfType(input, 'output-ack')).toEqual([{ type: 'output-ack', seq: 1 }]);
  cleanup();
});

test('small output batches share one cumulative acknowledgement and dispose cancels its timer', async () => {
  const { harness, cleanup, output, input } = await connected();
  for (let seq = 1; seq <= 3; seq++) {
    emitServerMessage(harness, output, { type: 'output', seq, data: '中文' });
    await flushMicrotasks();
  }
  expect(sentMessagesOfType(input, 'output-ack')).toEqual([]);
  harness.clock.advance(50);
  expect(sentMessagesOfType(input, 'output-ack')).toEqual([{ type: 'output-ack', seq: 3 }]);
  emitServerMessage(harness, output, { type: 'output', seq: 4, data: 'pending' });
  await flushMicrotasks();
  cleanup();
  harness.clock.advance(100);
  expect(sentMessagesOfType(input, 'output-ack')).toHaveLength(1);
  expect(harness.clock.pendingCount).toBe(0);
});

test('a callback from a disconnected output cannot credit its replacement connection', async () => {
  const { harness, cleanup, output, terminal } = await connected();
  terminal.deferWrites = true;
  emitServerMessage(harness, output, { type: 'output', seq: 1, data: 'x'.repeat(65536) });
  await flushMicrotasks();
  const parsed = terminal.writeCallbacks.shift()!;
  output.close();
  harness.clock.advance(1000);
  const replacement = harness.sockets.at(-1)!;
  replacement.open();
  emitServerMessage(harness, replacement, { type: 'ready', sessionGeneration: 'flow' });
  const newInput = await readyInputConnection(harness, 'flow');
  parsed();
  harness.clock.advance(100);
  expect(sentMessagesOfType(newInput, 'output-ack')).toEqual([]);
  cleanup();
});
