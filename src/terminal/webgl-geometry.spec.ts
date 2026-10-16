import { expect, test } from 'bun:test';
import type { WebglAddon } from '@xterm/addon-webgl';
import { repairWebglCanvasResize } from './webgl-geometry';

test('a backing-store correction updates the GL viewport and repopulates cached glyphs', () => {
  const canvas = { width: 1000, height: 600 };
  let viewport = [1000, 600];
  let glyphVertices = ['old'];
  let cachedCells = ['old'];
  let redrawPending = false;
  let resets = 0;
  const renderer = {
    _canvas: canvas,
    // The addon's observer path resizes the backing store and queues a redraw,
    // without the GL/glyph updates done by its normal grid-resize path.
    _setCanvasDevicePixelDimensions(width: number, height: number) {
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      redrawPending = true;
    },
    _glyphRenderer: { value: { handleResize() {
      viewport = [canvas.width, canvas.height];
      glyphVertices = [];
      resets++;
    } } },
    _clearModel(clearGlyphRenderer: boolean) {
      expect(clearGlyphRenderer).toBe(false);
      cachedCells = [];
    },
  };
  repairWebglCanvasResize({ _renderer: renderer } as unknown as WebglAddon);

  for (const [width, height] of [[1001, 599], [1500, 900], [1000, 600]]) {
    renderer._setCanvasDevicePixelDimensions(width, height);
    expect(viewport).toEqual([width, height]);
    expect(redrawPending).toBe(true);
    expect(glyphVertices).toEqual([]);
    expect(cachedCells).toEqual([]);
    // A redraw uploads unchanged terminal cells only after cache invalidation.
    if (cachedCells.length === 0) {
      cachedCells = ['unchanged terminal text'];
      glyphVertices = [...cachedCells];
    }
    redrawPending = false;
  }
  expect(glyphVertices).toEqual(['unchanged terminal text']);
  expect(resets).toBe(3);

  renderer._setCanvasDevicePixelDimensions(1000, 600);
  expect(resets).toBe(3);
  expect(redrawPending).toBe(false);
  expect(glyphVertices).toEqual(['unchanged terminal text']);
});

test('an unavailable WebGL renderer leaves the DOM fallback usable', () => {
  expect(() => repairWebglCanvasResize({} as WebglAddon)).not.toThrow();
});
