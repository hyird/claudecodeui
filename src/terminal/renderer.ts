import { WebglAddon } from '@xterm/addon-webgl';
import type { Terminal } from '@xterm/xterm';

export const TERMINAL_FONT_FAMILY = '"Maple Mono NF CN", "CaskaydiaMono Nerd Font", "JetBrainsMono Nerd Font", "Symbols Nerd Font Mono", Consolas, monospace';
// Width of the scrollback scrollbar to reserve so the rightmost column is never
// rendered beneath it. Match the xterm overlay's `overviewRuler.width` below.
// xterm's own FitAddon reserves the same gutter (`- scrollBarWidth`).
export const TERMINAL_SCROLLBAR_GUTTER = 8;

export function configureTerminalRenderer(terminal: Terminal, resizeAfterLayoutSettles: () => void, forceFullRefresh: () => void) {
  let disposed = false;
  if (document.fonts) {
    void Promise.all([
      document.fonts.load('14px "Maple Mono NF CN"'),
      document.fonts.load('bold 14px "Maple Mono NF CN"'),
    ]).then(() => {
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
  let webglAddon: WebglAddon | undefined;
  let webglContextLoss: { dispose(): void } | undefined;
  try {
    const addon = new WebglAddon();
    webglAddon = addon;
    webglContextLoss = addon.onContextLoss(() => {
      webglContextLoss?.dispose();
      webglContextLoss = undefined;
      addon.dispose();
      webglAddon = undefined;
      resizeAfterLayoutSettles();
      forceFullRefresh();
    });
    terminal.loadAddon(addon);
  } catch {
    // Keep the DOM renderer usable when hardware rendering is unavailable.
    webglContextLoss?.dispose();
    webglContextLoss = undefined;
    webglAddon?.dispose();
    webglAddon = undefined;
  }

  return { dispose() { disposed = true; webglContextLoss?.dispose(); } };
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
