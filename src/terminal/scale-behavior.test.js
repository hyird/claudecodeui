import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./TerminalPane.tsx', import.meta.url), 'utf8');
const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

function extractCallback(name) {
  const match = source.match(new RegExp(`const ${name} = useCallback\\([\\s\\S]*?\\n  \\}, \\[[^\\]]*\\]\\);`));
  assert.ok(match, `Could not find ${name}`);
  return match[0];
}

test('terminal resize manually fits to measured whole-cell dimensions without scale transforms', () => {
  const settledResize = extractCallback('resizeAfterLayoutSettles');
  const dragResize = extractCallback('resizeDuringDrag');

  assert.match(source, /const clearScreenTransform = useCallback/);
  assert.match(source, /const readFitDimensions = useCallback/);
  assert.match(source, /const measureCellCapacity = useCallback/);
  assert.match(source, /const proposeFrameDimensions = useCallback/);
  assert.match(source, /fitAddon\.proposeDimensions\(\)/);
  assert.match(source, /screen\.offsetWidth \/ baseCols/);
  assert.match(source, /container\.clientWidth/);
  assert.match(source, /Math\.floor\(availWidth \/ cellWidth\)/);
  assert.match(source, /terminal.resize\(dims.cols, dims.rows\)/);
  assert.equal(source.includes('fitAddon.fit()'), false);
  assert.equal(source.includes('clampScaleToFrame'), false);
  assert.equal(source.includes('MAX_DRAG_UPSCALE'), false);
  assert.equal(source.includes('clearScreenScale'), false);
  assert.equal(source.includes('scale(${'), false);
  assert.match(dragResize, /fitAndResize\(\)/);
  assert.match(dragResize, /clearScreenTransform/);
  assert.match(settledResize, /clearScreenTransform\(\)/);
  assert.equal(settledResize.includes('clampScaleToFrame'), false);
});

test('terminal fit reserves the scrollbar gutter so the last column is not clipped', () => {
  const measure = extractCallback('measureCellCapacity');

  // xterm's own FitAddon subtracts the scrollbar width from the available width.
  // The custom fit must reserve the same gutter, or the rightmost column renders
  // beneath the scrollback scrollbar and is clipped once scrollback appears.
  assert.match(measure, /terminal\.options\.scrollback \? TERMINAL_SCROLLBAR_GUTTER : 0/);
  assert.match(measure, /- scrollbarGutter/);
  assert.match(source, /const TERMINAL_SCROLLBAR_GUTTER = 4;/);
  assert.match(source, /overviewRuler:\s*\{ width: TERMINAL_SCROLLBAR_GUTTER \}/);

  // A sub-pixel guard on both axes prevents integer/HiDPI cell-size rounding from
  // over-counting the last row/column past the frame edge.
  assert.match(source, /const FIT_EDGE_GUARD_PX = 1;/);
  assert.match(measure, /- scrollbarGutter - FIT_EDGE_GUARD_PX/);
  assert.match(measure, /parseFloat\(style\.paddingBottom\)\s*\n\s*- FIT_EDGE_GUARD_PX/);
});

test('terminal resize fits before the next animation frame', () => {
  const settledResize = extractCallback('resizeAfterLayoutSettles');
  const dragResize = extractCallback('resizeDuringDrag');

  assert.ok(
    settledResize.indexOf('fitAndResize();') < settledResize.indexOf('window.requestAnimationFrame'),
    'settled resize should fit synchronously before scheduling rAF',
  );
  assert.ok(
    dragResize.indexOf('fitAndResize();') < dragResize.indexOf('window.requestAnimationFrame'),
    'drag resize should fit synchronously before scheduling rAF',
  );
});

test('terminal screen does not force transform styling while idle', () => {
  const screenRule = styles.match(/\.terminal-pane \.xterm-screen \{[\s\S]*?\}/);
  const rule = screenRule?.[0] ?? '';
  assert.equal(rule.includes('will-change'), false);
  assert.equal(rule.includes('transform-origin'), false);
  assert.equal(rule.includes('transition: transform'), false);
});

test('terminal viewport hides the legacy native scrollbar behind xterm 6 overlay', () => {
  const viewportRule = styles.match(/\.terminal-pane \.xterm \.xterm-viewport \{[\s\S]*?\}/);
  const scrollbarRule = styles.match(/\.terminal-pane \.xterm \.xterm-viewport::-webkit-scrollbar \{[\s\S]*?\}/);
  const rule = viewportRule?.[0] ?? '';
  const scrollbar = scrollbarRule?.[0] ?? '';

  assert.match(rule, /overflow-y:\s*auto\s*!important/);
  assert.match(rule, /background-color:\s*var\(--bg-terminal\)/);
  assert.match(rule, /scrollbar-width:\s*none/);
  assert.equal(rule.includes('overflow-y: scroll'), false);
  assert.match(scrollbar, /width:\s*0/);
  assert.match(scrollbar, /height:\s*0/);
  assert.equal(styles.includes('.xterm-viewport.has-scrollback::-webkit-scrollbar'), false);
  assert.match(styles, /\.scrollbar\.vertical > \.slider \{\s*border-radius:\s*999px/);
});

test('terminal viewport scroll affordance follows xterm scrollback state', () => {
  assert.match(source, /const updateScrollbackAffordance = useCallback/);
  assert.match(source, /terminal\.buffer\.active\.baseY > 0/);
  assert.match(source, /viewport\.classList\.toggle\('has-scrollback'/);
  assert.match(source, /const refreshAfterTerminalChange = \(\) => \{/);
  assert.match(source, /updateScrollbackAffordance\(\)/);
  assert.match(source, /terminal\.onScroll\(\(\) => \{/);
  assert.match(source, /terminal\.onWriteParsed\(\(\) => \{/);
});

test('terminal wheel events are not converted to arrow keys without scrollback', () => {
  assert.match(source, /terminal\.attachCustomWheelEventHandler/);
  assert.match(source, /terminal\.buffer\.active\.baseY <= 0/);
  assert.match(source, /event\.preventDefault\(\)/);
  assert.match(source, /event\.stopPropagation\(\)/);
  assert.match(source, /return false/);
  assert.match(source, /return true/);
});

test('terminal wheel events pass through when mouse tracking is enabled', () => {
  assert.match(source, /terminal\.element\?\.classList\.contains\('enable-mouse-events'\) === true/);
  assert.match(source, /if \(mouseTrackingEnabled\) \{\s+return true;\s+\}/);
  assert.ok(
    source.indexOf("classList.contains('enable-mouse-events')")
      < source.indexOf('terminal.buffer.active.baseY <= 0'),
    'mouse tracking should be checked before the no-scrollback wheel fallback',
  );
});

test('terminal output and scroll events refresh without blocking later frames', () => {
  // Ghost/dirty rows appeared because the forced full refresh was deferred to a
  // separate, deduped rAF: a partial WebGL render (a streaming write, or a baseY-trim
  // scroll while the user is scrolled up) could commit first, and the full refresh
  // landed a frame late or was dropped mid-burst. It must be synchronous so it unions
  // into xterm's current render frame, which the RenderDebouncer coalesces to one paint.
  assert.match(source, /const forceFullRefresh = useCallback/);
  assert.match(source, /terminal\.refresh\(0, Math\.max\(0, terminal\.rows - 1\)\)/);
  // No deferred/deduped rAF indirection for the render refresh anymore.
  assert.equal(source.includes('renderRefreshFrameRef'), false);
  assert.equal(source.includes('scheduleRenderRefresh'), false);
  // Forced on reconnect replay, on every output write, and on terminal change events
  // (onScroll/onWriteParsed/onResize) — the paths where xterm issues no full refresh.
  assert.match(source, /resizeAfterLayoutSettles\(\);\s+forceFullRefresh\(\);\s+return;/);
  assert.match(source, /const writeTerminalData = \(data: string\) => \{/);
  assert.match(source, /terminal\.write\(data\)/);
  assert.doesNotMatch(source, /new Promise<void>/);
  assert.match(source, /terminal\.onScroll\(\(\) => \{/);
  assert.match(source, /terminal\.onWriteParsed\(\(\) => \{/);
  assert.match(source, /terminal\.onResize\(\(\) => \{/);
  assert.match(source, /forceFullRefresh\(\)/);
});

test('terminal DOM lookups are cached instead of re-queried every frame', () => {
  // updateScrollbackAffordance runs off onWriteParsed and onScroll, so a querySelector
  // in it is a DOM tree walk per frame of terminal output. xterm creates .xterm-screen
  // and .xterm-viewport once in open() and keeps them, so they are resolved once.
  assert.match(source, /const readScreenElement = useCallback/);
  assert.match(source, /const readViewportElement = useCallback/);

  const affordance = extractCallback('updateScrollbackAffordance');
  assert.match(affordance, /readViewportElement\(\)/);
  assert.equal(affordance.includes('querySelector'), false);
  // The class is only touched when the scrollback state actually flips.
  assert.match(affordance, /hasScrollback === hasScrollbackRef\.current/);

  const measure = extractCallback('measureCellCapacity');
  assert.match(measure, /readScreenElement\(\)/);
  assert.equal(measure.includes('querySelector'), false);

  // A disposed terminal's nodes and the derived class state must not leak into the
  // next terminal, or its first affordance toggle would be skipped.
  assert.match(source, /screenElementRef\.current = null;/);
  assert.match(source, /viewportElementRef\.current = null;/);
  assert.match(source, /hasScrollbackRef\.current = false;/);
});

test('terminal uses xterm default renderer for reliable in-place TUI updates', () => {
  assert.match(styles, /\.terminal-frame \{\s+inset:\s*6px;/);
  assert.equal(styles.includes('inset: 7px;'), false);
  assert.doesNotMatch(source, /WebglAddon/);
});
