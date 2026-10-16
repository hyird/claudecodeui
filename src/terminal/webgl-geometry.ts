import type { WebglAddon } from '@xterm/addon-webgl';

type WebglRenderer = {
  _canvas: { width: number; height: number };
  _setCanvasDevicePixelDimensions(width: number, height: number): void;
  _glyphRenderer: { value?: { handleResize(): void } };
  _clearModel(clearGlyphRenderer: boolean): void;
};

// addon-webgl 0.19 corrects fractional-DPI canvas rounding in a ResizeObserver,
// but leaves GL's viewport and glyph resolution at the old backing-store size.
// Updating only the canvas then draws into a stale viewport (offset/scaled text).
// Keep this version-specific adapter next to the render-debouncer adapter; a
// normal grid resize already does this work inside the addon.
export function repairWebglCanvasResize(addon: WebglAddon) {
  const renderer = (addon as unknown as { _renderer?: WebglRenderer })._renderer;
  if (!renderer || typeof renderer._setCanvasDevicePixelDimensions !== 'function'
    || !renderer._glyphRenderer || typeof renderer._clearModel !== 'function') return;

  const original = renderer._setCanvasDevicePixelDimensions;
  renderer._setCanvasDevicePixelDimensions = function (width, height) {
    const changed = this._canvas.width !== width || this._canvas.height !== height;
    original.call(this, width, height);
    if (!changed) return;
    // handleResize updates gl.viewport and the shader's resolution, and clears
    // glyph vertices. Invalidate the cell cache too so the queued full redraw
    // repopulates every vertex, including unchanged cells.
    this._glyphRenderer.value?.handleResize();
    this._clearModel(false);
  };
}
