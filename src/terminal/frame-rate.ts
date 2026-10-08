import type { Terminal } from '@xterm/xterm';

type RenderDebouncer = {
  _innerRefresh: () => void;
  _animationFrame?: number;
};
type FrameClock = {
  now: () => number;
  requestAnimationFrame: (callback: FrameRequestCallback) => number;
};

// xterm 6 has no public FPS setting. Isolate the adapter to its render debouncer:
// parsing, mode replies, dirty-row accumulation and refresh callbacks stay intact.
// Renderer replacement on WebGL context loss uses this same debouncer.
export function limitTerminalFrameRate(terminal: Terminal, fps: number, clock: FrameClock = {
  now: () => performance.now(),
  requestAnimationFrame: (callback) => window.requestAnimationFrame(callback),
}) {
  const core = terminal as unknown as {
    _core?: { _renderService?: { _renderDebouncer?: RenderDebouncer } };
  };
  const debouncer = core._core?._renderService?._renderDebouncer;
  if (!debouncer || typeof debouncer._innerRefresh !== 'function') return { dispose() {} };
  const original = debouncer._innerRefresh;
  const interval = 1000 / fps;
  let nextFrameAt = 0;
  let disposed = false;
  const render = () => {
    if (disposed) { original.call(debouncer); return; }
    const now = clock.now();
    if (now < nextFrameAt) {
      debouncer._animationFrame = clock.requestAnimationFrame(render);
      return;
    }
    // Keep phase across monitor refreshes, rather than rounding 40 ms up to
    // three 60 Hz frames (which would accidentally cap the terminal at 20 FPS).
    nextFrameAt = nextFrameAt > 0 && now - nextFrameAt < interval
      ? nextFrameAt + interval : now + interval;
    original.call(debouncer);
  };
  debouncer._innerRefresh = render;
  return { dispose() {
    disposed = true;
    if (debouncer._innerRefresh === render) debouncer._innerRefresh = original;
  } };
}
