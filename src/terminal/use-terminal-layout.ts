import { useCallback, useRef } from 'react';
import type { MutableRefObject } from 'react';
import type { Terminal } from '@xterm/xterm';
import type { FitAddon } from '@xterm/addon-fit';
import { TERMINAL_SCROLLBAR_GUTTER } from './renderer';

type TerminalDimensions = {
  cols: number;
  rows: number;
};

const MIN_TERMINAL_COLS = 2;
const MIN_TERMINAL_ROWS = 1;

const FIT_EDGE_GUARD_PX = 1;

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
  const screenElementRef = useRef<HTMLElement | null>(null);
  const viewportElementRef = useRef<HTMLElement | null>(null);
  const hasScrollbackRef = useRef(false);


  // xterm builds .xterm-screen and .xterm-viewport once in terminal.open() and keeps
  // them for the terminal's lifetime, but the scrollback affordance runs off every
  // parsed write and every scroll — re-querying the DOM there costs a tree walk per
  // frame of output. Resolve each once and reuse it; isConnected re-resolves if xterm
  // ever rebuilds its DOM.
  const readScreenElement = useCallback(() => {
    if (!screenElementRef.current?.isConnected) {
      screenElementRef.current = terminalRef.current?.element
        ?.querySelector<HTMLElement>('.xterm-screen') ?? null;
    }
    return screenElementRef.current;
  }, []);

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

  const readFitDimensions = useCallback((): TerminalDimensions | undefined => {
    const fitAddon = fitAddonRef.current;
    if (!fitAddon) {
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

  // Whole cells that fit the frame, measured from xterm's rendered screen.
  // Undefined until the screen has a measurable size.
  const measureCellCapacity = useCallback((): TerminalDimensions | undefined => {
    const terminal = terminalRef.current;
    const container = containerRef.current;
    const screen = readScreenElement();
    if (!terminal || !container || !screen) {
      return undefined;
    }

    const baseCols = terminal.cols || lastSizeRef.current.cols;
    const baseRows = terminal.rows || lastSizeRef.current.rows;
    if (baseCols <= 0 || baseRows <= 0 || screen.offsetWidth <= 0 || screen.offsetHeight <= 0) {
      return undefined;
    }

    const cellWidth = screen.offsetWidth / baseCols;
    const cellHeight = screen.offsetHeight / baseRows;
    if (!Number.isFinite(cellWidth) || !Number.isFinite(cellHeight) || cellWidth <= 0 || cellHeight <= 0) {
      return undefined;
    }

    const style = window.getComputedStyle(container);
    // Reserve the scrollbar's gutter (as xterm's FitAddon does) so the rightmost
    // column is never clipped beneath the scrollback scrollbar once it appears.
    const scrollbarGutter = terminal.options.scrollback ? TERMINAL_SCROLLBAR_GUTTER : 0;
    const availWidth = container.clientWidth
      - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
      - scrollbarGutter - FIT_EDGE_GUARD_PX;
    const availHeight = container.clientHeight
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
      - FIT_EDGE_GUARD_PX;

    return {
      cols: Math.max(MIN_TERMINAL_COLS, Math.floor(availWidth / cellWidth)),
      rows: Math.max(MIN_TERMINAL_ROWS, Math.floor(availHeight / cellHeight)),
    };
  }, [readScreenElement]);

  // FitAddon's proposal forces its own style reads, so ask it only when the
  // rendered screen cannot be measured yet.
  const proposeFrameDimensions = useCallback(() => (
    measureCellCapacity() ?? readFitDimensions()
  ), [measureCellCapacity, readFitDimensions]);

  // Fit to the largest whole-cell grid the current frame can contain. Any
  // leftover pixels stay blank instead of clipping the right edge/bottom row.
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

  const clearScreenTransform = useCallback(() => {
    const screen = readScreenElement();
    if (!screen) {
      return;
    }

    screen.style.transform = '';
    screen.style.transformOrigin = '';
    screen.style.willChange = '';
  }, [readScreenElement]);

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

  // A scroll or an in-place TUI repaint changes what each viewport row should
  // show. Full-screen TUIs hit paths where xterm may not issue a full viewport
  // refresh on its own: alt-screen mouse scrolling, in-place updates, and streaming
  // while the buffer moves under a fixed viewport. Force a full-range
  // refresh synchronously so it unions into xterm's current render frame.
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
    clearScreenTransform();

    // Coalesce a burst of ResizeObserver ticks into at most one fit per frame
    // so a live drag stays responsive without thrashing layout.
    if (resizeFrameRef.current) {
      window.cancelAnimationFrame(resizeFrameRef.current);
    }
    resizeFrameRef.current = window.requestAnimationFrame(() => {
      resizeFrameRef.current = 0;
      fitAndResize();
      clearScreenTransform();
    });

    // One trailing pass after the layout settles (drag end, tab switch,
    // settings panel toggle) to lock onto the final whole-cell grid.
    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [window.setTimeout(() => {
      fitAndResize();
      clearScreenTransform();
    }, 120)];
  }, [clearScreenTransform, fitAndResize]);

  // During a window drag, keep fitting to whole cells. Any sub-cell remainder
  // stays as blank space instead of scaling or clipping the character grid.
  // ResizeObserver already delivers at most once per frame, after layout and
  // before paint, so this synchronous fit lands in the same frame; an extra
  // animation-frame pass would only re-measure the same layout a frame late.
  const resizeDuringDrag = useCallback(() => {
    fitAndResize();
    clearScreenTransform();

    resizeTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    resizeTimersRef.current = [
      window.setTimeout(() => {
        fitAndResize();
        clearScreenTransform();
      }, 180),
      window.setTimeout(clearScreenTransform, 320),
    ];
  }, [clearScreenTransform, fitAndResize]);


  const resetLayout = useCallback(() => {
    screenElementRef.current = null;
    viewportElementRef.current = null;
    hasScrollbackRef.current = false;
    followResizeRef.current = false;
    // A replacement terminal starts at xterm's default grid, so the next fit
    // must not short-circuit against the disposed terminal's size.
    lastSizeRef.current = { cols: 0, rows: 0 };
  }, []);

  return {
    clearResizeTimers, clearScreenTransform, fitAndResize, proposeFrameDimensions,
    resizeAfterLayoutSettles, resizeDuringDrag, forceFullRefresh, updateScrollbackAffordance,
    reset: resetLayout,
  };
}
