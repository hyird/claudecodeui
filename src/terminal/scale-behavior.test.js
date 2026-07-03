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

test('terminal viewport hides fractional scrollbars until scrollback exists', () => {
  const viewportRule = styles.match(/\.terminal-pane \.xterm \.xterm-viewport \{[\s\S]*?\}/);
  const scrollbackRule = styles.match(/\.terminal-pane \.xterm \.xterm-viewport\.has-scrollback \{[\s\S]*?\}/);
  const scrollbarRule = styles.match(/\.terminal-pane \.xterm \.xterm-viewport::-webkit-scrollbar \{[\s\S]*?\}/);
  const activeScrollbarRule = styles.match(/\.terminal-pane \.xterm \.xterm-viewport\.has-scrollback::-webkit-scrollbar \{[\s\S]*?\}/);
  const rule = viewportRule?.[0] ?? '';
  const activeRule = scrollbackRule?.[0] ?? '';
  const scrollbar = scrollbarRule?.[0] ?? '';
  const activeScrollbar = activeScrollbarRule?.[0] ?? '';

  assert.match(rule, /overflow-y:\s*auto\s*!important/);
  assert.match(rule, /scrollbar-width:\s*none/);
  assert.equal(rule.includes('overflow-y: scroll'), false);
  assert.match(activeRule, /scrollbar-width:\s*thin/);
  assert.match(scrollbar, /width:\s*0/);
  assert.match(scrollbar, /height:\s*0/);
  assert.match(activeScrollbar, /width:\s*6px/);
  assert.match(activeScrollbar, /height:\s*6px/);
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

test('terminal output and scroll events force a synchronous full-range renderer refresh', () => {
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
  assert.match(source, /terminal\.write\(message\.data, \(\) => \{\s+forceFullRefresh\(\);\s+\}\)/);
  assert.match(source, /terminal\.onScroll\(\(\) => \{/);
  assert.match(source, /terminal\.onWriteParsed\(\(\) => \{/);
  assert.match(source, /terminal\.onResize\(\(\) => \{/);
  assert.match(source, /forceFullRefresh\(\)/);
});

test('terminal uses only the WebGL renderer', () => {
  assert.match(source, /WebglAddon/);
  assert.match(source, /terminal\.loadAddon\(new WebglAddon\(\)\)/);
  assert.equal(source.includes('using default renderer fallback'), false);
});
