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
