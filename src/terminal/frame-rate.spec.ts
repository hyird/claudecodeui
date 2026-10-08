import { expect, test } from 'bun:test';
import type { Terminal } from '@xterm/xterm';
import { limitTerminalFrameRate } from './frame-rate';

test('terminal rendering averages 25 FPS on a 60 Hz monitor without consuming pending work early', () => {
  let now = 0;
  let callback: FrameRequestCallback | undefined;
  let frames = 0;
  let pending = 0;
  let applied = 0;
  const debouncer = { _animationFrame: undefined as number | undefined,
    _innerRefresh() { frames++; applied += pending; pending = 0; this._animationFrame = undefined; } };
  const terminal = { _core: { _renderService: { _renderDebouncer: debouncer } } } as unknown as Terminal;
  const limiter = limitTerminalFrameRate(terminal, 25, {
    now: () => now,
    requestAnimationFrame: (next) => { callback = next; return 1; },
  });
  for (let i = 0; i < 300; i++) {
    now = i * 1000 / 60;
    pending++;
    if (!debouncer._animationFrame) { callback = () => debouncer._innerRefresh(); debouncer._animationFrame = 1; }
    const next = callback; callback = undefined; next?.(now);
  }
  expect(frames).toBeGreaterThanOrEqual(124);
  expect(frames).toBeLessThanOrEqual(126);
  expect(applied + pending).toBe(300);
  now = 6000;
  callback?.(now);
  expect(applied).toBe(300);
  limiter.dispose();
});

test('an idle terminal renders promptly and disposal restores its original scheduler', () => {
  let now = 0;
  let frames = 0;
  const original = () => { frames++; };
  const debouncer = { _innerRefresh: original };
  const terminal = { _core: { _renderService: { _renderDebouncer: debouncer } } } as unknown as Terminal;
  const limiter = limitTerminalFrameRate(terminal, 25, { now: () => now, requestAnimationFrame: () => 1 });
  debouncer._innerRefresh();
  now = 1000;
  debouncer._innerRefresh();
  expect(frames).toBe(2);
  limiter.dispose();
  expect(debouncer._innerRefresh).toBe(original);
});
