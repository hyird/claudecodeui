import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  TERMINAL_EVENT_REPLAY_BYTE_LIMIT,
  createTerminalEventLog,
  getTerminalReplayPlan,
  recordTerminalEvent,
} from './terminal-stream.js';

test('terminal event log assigns monotonic seq and trims old replay entries', () => {
  const log = createTerminalEventLog(2);

  const first = recordTerminalEvent(log, { type: 'output', data: 'a' });
  const second = recordTerminalEvent(log, { type: 'output', data: 'b' });
  const third = recordTerminalEvent(log, { type: 'exit', exitCode: 0, signal: null });

  assert.equal(first.seq, 1);
  assert.equal(second.seq, 2);
  assert.equal(third.seq, 3);
  assert.equal(log.lastSeq, 3);
  assert.deepEqual(log.events.map((event) => event.seq), [2, 3]);
});

test('terminal replay plan returns ordered missed events when buffer covers lastSeq', () => {
  const log = createTerminalEventLog(5);
  recordTerminalEvent(log, { type: 'output', data: 'a' });
  recordTerminalEvent(log, { type: 'output', data: 'b' });
  recordTerminalEvent(log, { type: 'output', data: 'c' });

  const plan = getTerminalReplayPlan(log, 1);

  assert.equal(plan.mode, 'replay');
  assert.equal(plan.gap, false);
  assert.equal(plan.lastSeq, 3);
  assert.deepEqual(plan.events.map((event) => event.data), ['b', 'c']);
});

test('terminal replay plan requests reset when lastSeq is outside the buffer', () => {
  const log = createTerminalEventLog(1);
  recordTerminalEvent(log, { type: 'output', data: 'a' });
  recordTerminalEvent(log, { type: 'output', data: 'b' });
  recordTerminalEvent(log, { type: 'output', data: 'c' });

  const plan = getTerminalReplayPlan(log, 0);
  const gapPlan = getTerminalReplayPlan(log, 1);

  assert.equal(plan.mode, 'reset');
  assert.equal(plan.gap, false);
  assert.equal(plan.lastSeq, 3);
  assert.deepEqual(plan.events, []);

  assert.equal(gapPlan.mode, 'reset');
  assert.equal(gapPlan.gap, true);
  assert.equal(gapPlan.lastSeq, 3);
  assert.deepEqual(gapPlan.events, []);
});

test('terminal event log drops oldest payloads once the byte budget is exceeded', () => {
  // The entry count alone does not bound memory: 5000 x 64 KB chunks is ~320 MB per
  // session. The byte budget must evict old entries well before the count limit.
  const log = createTerminalEventLog(1000, 4096);
  const chunk = 'x'.repeat(1024);

  for (let index = 0; index < 100; index += 1) {
    recordTerminalEvent(log, { type: 'output', data: chunk });
  }

  assert.ok(log.events.length < 100, 'byte budget should evict before the count limit');
  assert.ok(log.bytes <= 4096, `retained bytes ${log.bytes} should stay within the budget`);
  // Eviction never discards the newest event, so a live tail is always replayable.
  assert.equal(log.events.at(-1).seq, 100);
  assert.equal(log.lastSeq, 100);
});

test('terminal event log keeps replay coherent after byte-budget eviction', () => {
  const log = createTerminalEventLog(1000, 4096);
  const chunk = 'y'.repeat(1024);
  for (let index = 0; index < 100; index += 1) {
    recordTerminalEvent(log, { type: 'output', data: chunk });
  }

  const firstBufferedSeq = log.events[0].seq;
  // A client whose lastSeq predates the retained window must be told to reset rather
  // than handed a replay with a hole in it.
  const stalePlan = getTerminalReplayPlan(log, firstBufferedSeq - 2);
  assert.equal(stalePlan.mode, 'reset');
  assert.equal(stalePlan.gap, true);

  // A client still inside the window replays exactly the events it missed, in order.
  const freshPlan = getTerminalReplayPlan(log, 99);
  assert.equal(freshPlan.mode, 'replay');
  assert.deepEqual(freshPlan.events.map((event) => event.seq), [100]);
});

test('terminal event log trimming stays amortized O(1) under sustained output', () => {
  // Trimming used to splice(0, 1) per event, memmoving the whole retained window on
  // every PTY chunk. The backing array must not grow without bound either.
  const log = createTerminalEventLog(500, TERMINAL_EVENT_REPLAY_BYTE_LIMIT);
  for (let index = 0; index < 20000; index += 1) {
    recordTerminalEvent(log, { type: 'output', data: 'z' });
  }

  assert.equal(log.events.length, 500);
  assert.equal(log.lastSeq, 20000);
  assert.deepEqual(log.events.map((event) => event.seq).slice(0, 2), [19501, 19502]);
  assert.ok(
    log.buffer.length <= 500 + 2 * 1024,
    `backing array ${log.buffer.length} should be compacted, not grow with total events`,
  );
});
