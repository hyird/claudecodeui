import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';

test('menu icons, variation selectors and joined emoji consume two terminal columns', async () => {
  const terminal = new headlessXterm.Terminal({ allowProposedApi: true, cols: 40, rows: 10 });
  terminal.loadAddon(new UnicodeGraphemesAddon());
  try {
    assert.equal(terminal.unicode.activeVersion, '15-graphemes');
    for (const icon of ['🕒', '🔁', '📁', '🎛️', '⚙️', '🛡️', '👨‍👩‍👧', '👩🏽‍💻', '🇨🇳', '中']) {
      await new Promise((resolve) => terminal.write('\r\x1b[2K' + icon + ' label', resolve));
      const line = terminal.buffer.active.getLine(terminal.buffer.active.cursorY);
      assert.equal(line.getCell(3).getChars(), 'l', `text must start at the same column after ${icon}`);
      assert.equal(terminal.buffer.active.cursorX, 8, icon);
    }
    const serializer = new SerializeAddon();
    terminal.loadAddon(serializer);
    const restored = new headlessXterm.Terminal({ allowProposedApi: true, cols: 40, rows: 10 });
    restored.loadAddon(new UnicodeGraphemesAddon());
    try {
      await new Promise((resolve) => restored.write(serializer.serialize(), resolve));
      assert.equal(restored.buffer.active.cursorX, terminal.buffer.active.cursorX);
    } finally { restored.dispose(); }
  } finally { terminal.dispose(); }
});

test('unicode initialization tolerates prior pooled Buffer allocations', () => {
  const moduleUrl = new URL('./unicode.js', import.meta.url).href;
  const script = `Buffer.from('previous allocation'); const { UnicodeGraphemesAddon } = await import(${JSON.stringify(moduleUrl)});
    const { default: xterm } = await import('@xterm/headless');
    const terminal = new xterm.Terminal({ allowProposedApi: true });
    terminal.loadAddon(new UnicodeGraphemesAddon());
    terminal.write('👨‍👩‍👧X', () => { console.log(terminal.buffer.active.cursorX); terminal.dispose(); });`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), '3');
});
