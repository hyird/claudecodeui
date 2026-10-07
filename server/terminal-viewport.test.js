import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { createTerminalViewportController } from './terminal-viewport.js';

test('a slow scroll keeps only the latest destination and polls cannot replace it', async () => {
  const calls = [];
  const replies = [];
  let finish;
  const request = createTerminalViewportController({
    sessionId: 'session', isAttached: () => true, send: (value) => replies.push(value),
    backend: {
      scroll: async (_id, offset) => {
        calls.push(offset);
        await new Promise((resolve) => { finish = resolve; });
        return { historyLines: 1000, offset, rows: 30 };
      },
      viewport: () => { throw new Error('poll must not replace a drag'); },
    },
  });
  request({ type: 'scroll', offset: 100, requestId: 1 });
  for (let id = 2; id <= 100; id++) request({ type: 'scroll', offset: id * 5, requestId: id });
  request({ type: 'viewport', requestId: 101 });
  assert.deepEqual(calls, [100]);
  finish();
  await nextTurn();
  assert.deepEqual(calls, [100, 500]);
  finish();
  await nextTurn();
  assert.deepEqual(replies.map(({ offset, requestId }) => [offset, requestId]), [[100, 1], [500, 100]]);
});

test('detaching a terminal discards pending scroll work and replies', async () => {
  let attached = true;
  let finish;
  let calls = 0;
  const request = createTerminalViewportController({
    sessionId: 'session', isAttached: () => attached,
    send: () => assert.fail('detached socket received a reply'),
    backend: { scroll: () => { calls++; return new Promise((resolve) => { finish = resolve; }); } },
  });
  request({ type: 'scroll', offset: 20 });
  request({ type: 'scroll', offset: 80 });
  attached = false;
  finish(null);
  await nextTurn();
  assert.equal(calls, 1);
});
