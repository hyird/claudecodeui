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

test('terminal screen scale is transient during resize and cleared once settled', () => {
  const settledResize = extractCallback('resizeAfterLayoutSettles');
  const dragResize = extractCallback('resizeDuringDrag');

  assert.match(source, /const clearScreenScale = useCallback/);
  assert.match(dragResize, /clampScaleToFrame\(true\)/);
  assert.match(dragResize, /clearScreenScale/);
  assert.match(settledResize, /clearScreenScale\(\)/);
  assert.equal(settledResize.includes('clampScaleToFrame'), false);
});

test('terminal screen does not force a transform compositing layer while idle', () => {
  const screenRule = styles.match(/\.terminal-pane \.xterm-screen \{[\s\S]*?\}/);
  assert.ok(screenRule, 'Could not find terminal screen CSS rule');
  assert.equal(screenRule[0].includes('will-change'), false);
});
