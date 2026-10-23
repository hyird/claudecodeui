import { WebglAddon } from '@xterm/addon-webgl';
import type { Terminal } from '@xterm/xterm';
export { TERMINAL_FONT_FAMILY } from './fonts';
// Width of the scrollback scrollbar to reserve so the rightmost column is never
// rendered beneath it. Match the xterm overlay's `overviewRuler.width` below.
// xterm's own FitAddon reserves the same gutter (`- scrollBarWidth`).
export const TERMINAL_SCROLLBAR_GUTTER = 3;
// At most this many WebGL restores in a row for contexts that die within the
// stable window; a context that survives the window resets the budget.
const WEBGL_MAX_QUICK_RESTORES = 3;
const WEBGL_STABLE_CONTEXT_MS = 30_000;

function redrawWhenFontsLoad(fonts: FontFaceSet, terminal: Terminal, forceFullRefresh: () => void) {
  // While a chunk downloads, the WebGL atlas caches the fallback glyph. Re-rasterize
  // once any web font finishes loading so the real glyphs replace it.
  const redraw = () => {
    terminal.clearTextureAtlas();
    forceFullRefresh();
  };
  fonts.addEventListener('loadingdone', redraw);
  return () => fonts.removeEventListener('loadingdone', redraw);
}

export type TerminalRenderer = {
  // xterm pauses painting hidden panes through its own IntersectionObserver.
  // Showing a pane repaints the whole viewport once.
  setActive(active: boolean): void;
  dispose(): void;
};

export function configureTerminalRenderer(
  terminal: Terminal, resizeAfterLayoutSettles: () => void, forceFullRefresh: () => void,
): TerminalRenderer {
  let disposed = false;
  let disposeFontRedraw = () => {};
  const fonts = document.fonts;
  if (fonts) {
    disposeFontRedraw = redrawWhenFontsLoad(fonts, terminal, forceFullRefresh);
  }
  // DOM text runs accumulate fractional glyph widths, making Pi's character
  // scrollbar stagger across rows. WebGL places every glyph on the cell grid.
  // A lost context (GPU reset, or the browser's per-page context cap evicting
  // this pane's) is replaced with a fresh WebGL renderer. A background pane waits
  // until it is shown, so restoring it cannot evict a visible pane's context.
  // Contexts that keep dying young stop at the DOM renderer instead of looping.
  let active = true;
  let webglContextLoss: { dispose(): void } | undefined;
  let webglCreatedAt = 0;
  let quickRestores = 0;
  let restorePending = false;
  const loadWebgl = () => {
    let addon: WebglAddon | undefined;
    try {
      addon = new WebglAddon();
      const loaded = addon;
      webglContextLoss = addon.onContextLoss(() => handleContextLoss(loaded));
      terminal.loadAddon(addon);
      webglCreatedAt = performance.now();
    } catch {
      // Keep the DOM renderer usable when hardware rendering is unavailable.
      webglContextLoss?.dispose();
      webglContextLoss = undefined;
      addon?.dispose();
    }
  };
  const restoreWebgl = () => {
    if (!restorePending || disposed) return;
    restorePending = false;
    quickRestores += 1;
    loadWebgl();
  };
  const handleContextLoss = (addon: WebglAddon) => {
    webglContextLoss?.dispose();
    webglContextLoss = undefined;
    addon.dispose();
    if (performance.now() - webglCreatedAt >= WEBGL_STABLE_CONTEXT_MS) quickRestores = 0;
    restorePending = quickRestores < WEBGL_MAX_QUICK_RESTORES;
    if (active) restoreWebgl();
    resizeAfterLayoutSettles();
    forceFullRefresh();
  };
  loadWebgl();
  // Like ttyd and VS Code, fit after selecting the renderer: its cell metrics
  // can differ from those measured by the initial DOM renderer.
  resizeAfterLayoutSettles();

  return {
    setActive(next: boolean) {
      if (active === next) return;
      active = next;
      if (!next) return;
      restoreWebgl();
      forceFullRefresh();
    },
    dispose() { disposed = true; disposeFontRedraw(); webglContextLoss?.dispose(); },
  };
}
