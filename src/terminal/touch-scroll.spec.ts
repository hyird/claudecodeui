import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import { attachTerminalTouchScroll } from './touch-scroll';

function fixture(type = 'normal', baseY = 100, mouseTrackingMode = 'none') {
  const container = Object.assign(new EventTarget(), {
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 240 }) }),
  });
  const element = new EventTarget();
  const wheelEvents: Array<{ deltaY: number; clientX: number }> = [];
  element.addEventListener('wheel', (event) => wheelEvents.push(event as unknown as typeof wheelEvents[number]));
  const scrollLines = vi.fn();
  const terminal = { element, rows: 24, buffer: { active: { type, baseY } }, modes: { mouseTrackingMode }, scrollLines };
  const dispose = attachTerminalTouchScroll(terminal as unknown as Terminal, container as unknown as HTMLElement);
  const touch = (name: string, x: number, y: number, count = 1) => {
    const event = Object.assign(new Event(name, { cancelable: true }), {
      touches: Array.from({ length: count }, (_, identifier) => ({ identifier, clientX: x, clientY: y })),
    });
    container.dispatchEvent(event);
    return event;
  };
  return { touch, scrollLines, wheelEvents, dispose };
}

afterEach(() => vi.unstubAllGlobals());

describe('terminal touch scrolling', () => {
  test('scrolls history in both directions and accumulates partial rows', () => {
    const { touch, scrollLines } = fixture();
    touch('touchstart', 20, 100);
    expect(touch('touchmove', 20, 87).defaultPrevented).toBe(true);
    touch('touchmove', 20, 80);
    touch('touchmove', 20, 110);
    expect(scrollLines.mock.calls).toEqual([[1], [1], [-3]]);
    expect(touch('touchend', 20, 110, 0).defaultPrevented).toBe(true);
  });

  test('leaves taps, horizontal gestures and pinch zoom to the browser', () => {
    const { touch, scrollLines } = fixture();
    touch('touchstart', 20, 100);
    expect(touch('touchmove', 22, 98).defaultPrevented).toBe(false);
    expect(touch('touchend', 22, 98, 0).defaultPrevented).toBe(false);
    touch('touchstart', 20, 100);
    expect(touch('touchmove', 60, 95).defaultPrevented).toBe(false);
    touch('touchstart', 20, 100);
    expect(touch('touchmove', 20, 60, 2).defaultPrevented).toBe(false);
    touch('touchmove', 20, 40);
    expect(scrollLines).not.toHaveBeenCalled();
  });

  test('a shell without scrollback consumes a swipe without sending arrow keys', () => {
    const { touch, scrollLines, wheelEvents } = fixture('normal', 0);
    touch('touchstart', 20, 100);
    expect(touch('touchmove', 20, 50).defaultPrevented).toBe(true);
    expect(scrollLines).not.toHaveBeenCalled();
    expect(wheelEvents).toEqual([]);
  });

  test.each([['alternate', 'none'], ['normal', 'sgr']])('delegates %s/%s scrolling to xterm wheel handling', (type, mode) => {
    vi.stubGlobal('WheelEvent', class extends Event {
      constructor(name: string, init: WheelEventInit) {
        super(name, init);
        Object.assign(this, { deltaY: init.deltaY, deltaMode: init.deltaMode, clientX: init.clientX, clientY: init.clientY });
      }
    });
    const { touch, scrollLines, wheelEvents } = fixture(type, 0, mode);
    touch('touchstart', 20, 100);
    touch('touchmove', 20, 70);
    expect(scrollLines).not.toHaveBeenCalled();
    expect(wheelEvents.map(({ deltaY, clientX }) => [deltaY, clientX])).toEqual([[1, 20], [1, 20], [1, 20]]);
  });

  test('cancels a gesture and removes its listeners on disposal', () => {
    const { touch, scrollLines, dispose } = fixture();
    touch('touchstart', 20, 100);
    touch('touchcancel', 20, 100, 0);
    touch('touchmove', 20, 40);
    dispose();
    touch('touchstart', 20, 100);
    touch('touchmove', 20, 40);
    expect(scrollLines).not.toHaveBeenCalled();
  });
});
