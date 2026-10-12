import { WebglAddon } from '@xterm/addon-webgl';
import type { Terminal } from '@xterm/xterm';
import terminalPolicy from '../../shared/terminal-policy.json';
import { limitTerminalFrameRate } from './frame-rate';

export const TERMINAL_FONT_FAMILY = '"Maple Mono NF CN", "CaskaydiaMono Nerd Font", "JetBrainsMono Nerd Font", "Symbols Nerd Font Mono", Consolas, monospace';
// Width of the scrollback scrollbar to reserve so the rightmost column is never
// rendered beneath it. Match the xterm overlay's `overviewRuler.width` below.
// xterm's own FitAddon reserves the same gutter (`- scrollBarWidth`).
export const TERMINAL_SCROLLBAR_GUTTER = 3;
// At most this many WebGL restores in a row for contexts that die within the
// stable window; a context that survives the window resets the budget.
const WEBGL_MAX_QUICK_RESTORES = 3;
const WEBGL_STABLE_CONTEXT_MS = 30_000;

// The regular base chunk (ASCII, punctuation, box drawing, powerline and the
// common Nerd icons) contains the cell-measuring glyphs. Bold, CJK and the other
// icon chunks download through `unicode-range` when text first needs them.
const TERMINAL_FONT_BASE = '14px "Maple Mono NF CN"';

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
  // Background panes keep parsing output and keep their measured grid, but do
  // not paint. Showing a pane repaints the whole viewport once.
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
    void fonts.load(TERMINAL_FONT_BASE, 'W').then(() => {
      if (disposed) return;
      // xterm measured the fallback before the web font arrived. Changing the
      // option invalidates both the measured cell size and the glyph atlas.
      terminal.options.fontFamily = 'Consolas, monospace';
      terminal.options.fontFamily = TERMINAL_FONT_FAMILY;
      resizeAfterLayoutSettles();
      forceFullRefresh();
    }).catch(() => {
      // The remaining font stack is monospaced if a font download fails.
    });
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

  const frameRate = limitTerminalFrameRate(terminal, terminalPolicy.renderFramesPerSecond);
  return {
    setActive(next: boolean) {
      if (active === next) return;
      active = next;
      frameRate.setPaused(!next);
      if (!next) return;
      restoreWebgl();
      forceFullRefresh();
    },
    dispose() { disposed = true; disposeFontRedraw(); frameRate.dispose(); webglContextLoss?.dispose(); },
  };
}

export function registerTerminalModeReports(terminal: Terminal) {
  // xterm 6.0.0's bundled DECRPM handler throws while Vim probes terminal
  // modes. Handle the probes first so xterm's write queue stays alive.
  const registerModeReportGuard = (ansi: boolean) => terminal.parser.registerCsiHandler({
    prefix: ansi ? undefined : '?',
    intermediates: '$',
    final: 'p',
  }, (params) => {
    const value = params[0];
    const mode = typeof value === 'number' ? value : (value?.[0] ?? 0);
    // OMP trusts this probe: reporting 0 disables its atomic repaint wrappers.
    // Keep the Vim workaround while advertising xterm's real DEC 2026 state.
    const status = !ansi && mode === 2026
      ? (terminal.modes.synchronizedOutputMode ? 1 : 2)
      : 0;
    terminal.input(`\x1b[${ansi ? '' : '?'}${mode};${status}$y`, false);
    return true;
  });
  const ansiModeReportGuard = registerModeReportGuard(true);
  const privateModeReportGuard = registerModeReportGuard(false);


  return { dispose() { ansiModeReportGuard.dispose(); privateModeReportGuard.dispose(); } };
}
