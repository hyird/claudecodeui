import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
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
