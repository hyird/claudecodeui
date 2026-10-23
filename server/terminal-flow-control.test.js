import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPtyFlowControl, createViewerFlowControl, OUTPUT_HIGH_WATER, OUTPUT_LOW_WATER } from './terminal-flow-control.js';

test('a PTY resumes only after every consumer releases its pressure', () => {
  const events = [];
  const flow = createPtyFlowControl({ pause: () => events.push('pause'), resume: () => events.push('resume') });
  flow.setPaused('parser', true);
  flow.setPaused('viewer', true);
  flow.setPaused('viewer', true);
  flow.setPaused('parser', false);
  assert.deepEqual(events, ['pause']);
  flow.setPaused('viewer', false);
  assert.deepEqual(events, ['pause', 'resume']);
  flow.setPaused('viewer', true);
  flow.dispose();
  flow.setPaused('parser', true);
  assert.deepEqual(events, ['pause', 'resume', 'pause', 'resume']);
});

test('viewer credit uses consumed sequence numbers, hysteresis, and independent snapshot credit', () => {
  const events = [];
  const producer = createPtyFlowControl({ pause: () => events.push('pause'), resume: () => events.push('resume') });
  const viewer = createViewerFlowControl(producer);
  viewer.record(0, OUTPUT_HIGH_WATER);
  assert.deepEqual(events, ['pause']);
  viewer.acknowledge(0);
  assert.deepEqual(events, ['pause', 'resume']);
  viewer.record(1, OUTPUT_HIGH_WATER - OUTPUT_LOW_WATER - 1);
  viewer.record(3, OUTPUT_LOW_WATER + 1);
  assert.deepEqual(events, ['pause', 'resume', 'pause']);
  assert.equal(viewer.acknowledge(4), false);
  assert.equal(viewer.acknowledge(-1), false);
  assert.equal(viewer.acknowledge(NaN), false);
  viewer.acknowledge(1);
  assert.equal(viewer.pendingBytes, OUTPUT_LOW_WATER + 1);
  assert.equal(events.at(-1), 'pause');
  viewer.acknowledge(3);
  assert.equal(viewer.pendingBytes, 0);
  assert.equal(events.at(-1), 'resume');
  viewer.record(4, OUTPUT_HIGH_WATER);
  viewer.acknowledge(3);
  assert.equal(events.at(-1), 'pause');
  viewer.dispose();
  assert.equal(events.at(-1), 'resume');
});
