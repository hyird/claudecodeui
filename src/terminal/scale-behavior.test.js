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

test('terminal screen fits whole cells without scale transforms', () => {
  const settledResize = extractCallback('resizeAfterLayoutSettles');
  const dragResize = extractCallback('resizeDuringDrag');

  assert.match(source, /const clearScreenTransform = useCallback/);
  assert.match(source, /const measureCellCapacity = useCallback/);
  assert.match(source, /Math\.floor\(availWidth \/ cellWidth\)/);
  assert.match(source, /Math\.floor\(availHeight \/ cellHeight\)/);
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

test('terminal output and scroll events schedule a full renderer refresh', () => {
  assert.match(source, /renderRefreshFrameRef/);
  assert.match(source, /const scheduleRenderRefresh = useCallback/);
  assert.match(source, /terminal\.refresh\(0, Math\.max\(0, terminal\.rows - 1\)\)/);
  assert.match(source, /resizeAfterLayoutSettles\(\);\s+scheduleRenderRefresh\(\);\s+return;/);
  assert.match(source, /terminal\.write\(message\.data, \(\) => \{\s+scheduleRenderRefresh\(\);\s+\}\)/);
  assert.match(source, /terminal\.onScroll\(\(\) => \{/);
  assert.match(source, /terminal\.onWriteParsed\(\(\) => \{/);
  assert.match(source, /terminal\.onResize\(\(\) => \{/);
  assert.match(source, /scheduleRenderRefresh\(\)/);
});
