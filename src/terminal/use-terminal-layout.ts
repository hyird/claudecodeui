import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';

type TerminalDimensions = {
  cols: number;
  rows: number;
};

type LayoutOptions = {
  terminalRef: MutableRefObject<Terminal | null>;
  fitAddonRef: MutableRefObject<FitAddon | null>;
  containerRef: MutableRefObject<HTMLDivElement | null>;
  onResize: (cols: number, rows: number) => boolean | undefined;
};

export function useTerminalLayout({ terminalRef, fitAddonRef, containerRef, onResize }: LayoutOptions) {
  const resizeTimersRef = useRef<number[]>([]);
  const resizeFrameRef = useRef(0);
  const lastSizeRef = useRef({ cols: 0, rows: 0 });
  const followResizeRef = useRef(false);
  const viewportElementRef = useRef<HTMLElement | null>(null);
  const hasScrollbackRef = useRef(false);
  // Cache the viewport used by the scrollback affordance on every parsed write.
  const readViewportElement = useCallback(() => {
    if (!viewportElementRef.current?.isConnected) {
      viewportElementRef.current = terminalRef.current?.element
        ?.querySelector<HTMLElement>('.xterm-viewport') ?? null;
    }
    return viewportElementRef.current;
  }, []);

  const clearResizeTimers = useCallback(() => {
    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [];
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
      resizeFrameRef.current = 0;
    }
  }, []);

  const proposeFrameDimensions = useCallback((): TerminalDimensions | undefined => {
    const fitAddon = fitAddonRef.current;
    const container = containerRef.current;
    if (!fitAddon || !container || container.clientWidth <= 0 || container.clientHeight <= 0) {
      return undefined;
    }

    try {
      const dims = fitAddon.proposeDimensions();
      if (dims && Number.isFinite(dims.cols) && Number.isFinite(dims.rows)) {
        return dims;
      }
    } catch {
      return undefined;
    }

    return undefined;
  }, []);

  // Use the renderer's cell metrics through FitAddon, like ttyd. Inferring cell
  // height from screen.offsetHeight / rows loses precision at fractional DPI.
  const fitAndResize = useCallback(() => {
    const terminal = terminalRef.current;
    const dims = proposeFrameDimensions();
    if (!terminal || !dims) {
      return;
    }

    const followResizedViewport = () => {
      if (!followResizeRef.current) return;
      terminal.scrollToBottom();
      // xterm's scrollbar may still clamp to its previous scroll height until
      // the next render. Retry on the existing layout passes until it catches up.
      followResizeRef.current = terminal.buffer.active.viewportY !== terminal.buffer.active.baseY;
    };

    const last = lastSizeRef.current;
    if (dims.cols === last.cols && dims.rows === last.rows) {
      followResizedViewport();
      return;
    }
    lastSizeRef.current = { cols: dims.cols, rows: dims.rows };

    // Once a connection owns this terminal, fit requests a size. The ordered
    // output stream applies it after all old-size bytes have been parsed.
    if (onResize(dims.cols, dims.rows)) return;

    if (terminal.cols !== dims.cols || terminal.rows !== dims.rows) {
      terminal.resize(dims.cols, dims.rows);
      // Reflow can keep a historical viewport anchor. A changed grid should
      // show the live prompt and continue following subsequent output.
      followResizeRef.current = true;
    }

    followResizedViewport();
  }, [proposeFrameDimensions, onResize]);

  const updateScrollbackAffordance = useCallback(() => {
    const terminal = terminalRef.current;
    const viewport = readViewportElement();
    if (!terminal || !viewport) {
      return;
    }

    // Runs on every parsed write, so skip the class mutation unless the state flipped.
    const hasScrollback = terminal.buffer.active.baseY > 0;
    if (hasScrollback === hasScrollbackRef.current) {
      return;
    }
    hasScrollbackRef.current = hasScrollback;
    viewport.classList.toggle('has-scrollback', hasScrollback);
  }, [readViewportElement]);

  // Explicit invalidations (font arrival, renderer replacement, showing a tab)
  // need one full refresh. Normal output and scrolling use xterm's dirty rows.
  const forceFullRefresh = useCallback(() => {
    const terminal = terminalRef.current;
    if (!terminal) {
      return;
    }

    terminal.refresh(0, Math.max(0, terminal.rows - 1));
  }, []);

  // Resize only on whole-cell boundaries. Any sub-cell remainder stays blank.
  const resizeAfterLayoutSettles = useCallback(() => {
    fitAndResize();

    // Coalesce a burst of ResizeObserver ticks into at most one fit per frame
    // so a live drag stays responsive without thrashing layout.
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      fitAndResize();
    });

    // One trailing pass after the layout settles (drag end, tab switch,
    // settings panel toggle) to lock onto the final whole-cell grid.
    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [window.setTimeout(() => {
      fitAndResize();
    }, 120)];
  }, [fitAndResize]);

  // During a window drag, keep fitting to whole cells. Any sub-cell remainder
  // stays as blank space instead of scaling or clipping the character grid.
  // ResizeObserver already delivers at most once per frame, after layout and
  // before paint, so this synchronous fit lands in the same frame; an extra
  // animation-frame pass would only re-measure the same layout a frame late.
  const resizeDuringDrag = useCallback(() => {
    fitAndResize();

    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [
      window.setTimeout(() => {
        fitAndResize();
      }, 180),
    ];
  }, [fitAndResize]);


  const resetLayout = useCallback(() => {
    viewportElementRef.current = null;
    hasScrollbackRef.current = false;
    followResizeRef.current = false;
    // A replacement terminal starts at xterm's default grid, so the next fit
    // must not short-circuit against the disposed terminal's size.
    lastSizeRef.current = { cols: 0, rows: 0 };
  }, []);

  return {
    clearResizeTimers, fitAndResize,
    resizeAfterLayoutSettles, resizeDuringDrag, forceFullRefresh, updateScrollbackAffordance,
    reset: resetLayout,
  };
}
