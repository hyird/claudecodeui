import type { Terminal } from '@xterm/xterm';

const SWIPE_THRESHOLD = 8;

// xterm's overlay viewport handles wheel events, but does not translate touch
// gestures. Keep taps native so they can focus the textarea and open the keyboard.
export function attachTerminalTouchScroll(terminal: Terminal, container: HTMLElement) {
  let gesture: { id: number; x: number; y: number; lastY: number; remainder: number; axis: 'x' | 'y' | null } | null = null;

  const start = (event: TouchEvent) => {
    if (event.touches.length !== 1) {
      gesture = null;
      return;
    }
    const touch = event.touches[0];
    gesture = { id: touch.identifier, x: touch.clientX, y: touch.clientY, lastY: touch.clientY, remainder: 0, axis: null };
  };

  const move = (event: TouchEvent) => {
    if (!gesture || event.touches.length !== 1) {
      gesture = null;
      return;
    }
    const touch = Array.from(event.touches).find((point) => point.identifier === gesture?.id);
    if (!touch) return;
    if (!gesture.axis) {
      const dx = Math.abs(touch.clientX - gesture.x);
      const dy = Math.abs(touch.clientY - gesture.y);
      if (Math.max(dx, dy) < SWIPE_THRESHOLD) return;
      gesture.axis = dy > dx ? 'y' : 'x';
    }
    if (gesture.axis !== 'y') return;
    event.preventDefault();
    event.stopPropagation();

    const screen = container.querySelector<HTMLElement>('.xterm-screen');
    const cellHeight = screen ? screen.getBoundingClientRect().height / terminal.rows : 0;
    if (cellHeight <= 0) return;
    gesture.remainder += gesture.lastY - touch.clientY;
    gesture.lastY = touch.clientY;
    const lines = Math.trunc(gesture.remainder / cellHeight);
    if (!lines) return;
    gesture.remainder -= lines * cellHeight;

    if (terminal.modes.mouseTrackingMode !== 'none' || terminal.buffer.active.type === 'alternate') {
      // Let xterm encode the current mouse protocol or application cursor keys.
      // A wheel event represents one step to xterm, even with a large delta.
      for (let step = 0; step < Math.min(Math.abs(lines), terminal.rows); step += 1) {
        terminal.element?.dispatchEvent(new WheelEvent('wheel', {
          deltaY: Math.sign(lines), deltaMode: 1,
          clientX: touch.clientX, clientY: touch.clientY,
          bubbles: true, cancelable: true,
        }));
      }
    } else if (terminal.buffer.active.baseY > 0) {
      terminal.scrollLines(lines);
    }
  };

  const end = (event: TouchEvent) => {
    // Suppress the synthetic click after a swipe, so scrolling does not open
    // the soft keyboard or click a link. A stationary tap stays untouched.
    if (gesture?.axis === 'y' && event.cancelable) event.preventDefault();
    gesture = null;
  };
  container.addEventListener('touchstart', start, { passive: true });
  container.addEventListener('touchmove', move, { passive: false });
  container.addEventListener('touchend', end, { passive: false });
  container.addEventListener('touchcancel', end);
  return () => {
    gesture = null;
    container.removeEventListener('touchstart', start);
    container.removeEventListener('touchmove', move);
    container.removeEventListener('touchend', end);
    container.removeEventListener('touchcancel', end);
  };
}
