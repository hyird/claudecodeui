import { afterEach, expect, test, vi } from 'vitest';
import { followVisualViewport } from './viewport';

afterEach(() => vi.unstubAllGlobals());

test('tracks keyboard and viewport offsets without resizing during pinch zoom; cleans up', () => {
  const viewport = Object.assign(new EventTarget(), { height: 800, offsetTop: 0, scale: 1 });
  vi.stubGlobal('window', { visualViewport: viewport });
  const properties = new Map<string, string>();
  const element = { style: {
    setProperty: (name: string, value: string) => properties.set(name, value),
    removeProperty: (name: string) => properties.delete(name),
  } } as unknown as HTMLElement;
  const dispose = followVisualViewport(element);
  expect(properties.get('--app-viewport-height')).toBe('800px');
  viewport.height = 420;
  viewport.offsetTop = 30;
  viewport.dispatchEvent(new Event('resize'));
  expect(properties.get('--app-viewport-height')).toBe('420px');
  expect(properties.get('--app-viewport-top')).toBe('30px');
  viewport.scale = 2;
  viewport.height = 210;
  viewport.dispatchEvent(new Event('scroll'));
  expect(properties.get('--app-viewport-height')).toBe('420px');
  viewport.scale = 1;
  viewport.height = 800;
  viewport.offsetTop = 0;
  viewport.dispatchEvent(new Event('resize'));
  expect(properties.get('--app-viewport-height')).toBe('800px');
  dispose();
  viewport.dispatchEvent(new Event('resize'));
  expect(properties.size).toBe(0);
});
