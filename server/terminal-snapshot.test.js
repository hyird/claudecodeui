import assert from 'node:assert/strict';
import { test } from 'node:test';
import headless from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import terminalPolicy from '../shared/terminal-policy.json' with { type: 'json' };
import { serializeTerminalSnapshot } from './terminal-snapshot.js';

const write = (terminal, data) => new Promise((resolve) => terminal.write(data, resolve));

test('snapshot serialization drops old rows while retaining the newest screen', async (t) => {
  const terminal = new headless.Terminal({ allowProposedApi: true, cols: 80, rows: 24, scrollback: 10000 });
  const serializer = new SerializeAddon();
  terminal.loadAddon(serializer);
  t.after(() => terminal.dispose());
  await write(terminal, Array.from({ length: 5000 }, (_, i) => `row_${String(i).padStart(4, '0')}\r\n`).join(''));
  const snapshot = serializeTerminalSnapshot(terminal, serializer);
  assert.equal(snapshot.includes('row_0000'), false);
  assert.equal(snapshot.includes('row_4999'), true);
  const restored = new headless.Terminal({ allowProposedApi: true, cols: 80, rows: 24, scrollback: 10000 });
  t.after(() => restored.dispose());
  await write(restored, snapshot);
  assert.ok(restored.buffer.normal.baseY <= terminalPolicy.scrollbackLines);
});

test('the byte budget trims complete historical rows and retains valid UTF-8, colors and mouse encoding', async (t) => {
  const terminal = new headless.Terminal({ allowProposedApi: true, cols: 220, rows: 24, scrollback: 2000 });
  const serializer = new SerializeAddon();
  terminal.loadAddon(serializer);
  t.after(() => terminal.dispose());
  const colored = Array.from({ length: 100 }, (_, i) => `\x1b[${i % 2 ? 31 : 32}m中`).join('');
  await write(terminal, Array.from({ length: 3000 }, (_, i) => `\x1b[0mrow_${String(i).padStart(4, '0')} ${colored}\x1b[0m\r\n`).join(''));
  assert.ok(Buffer.byteLength(serializer.serialize()) > terminalPolicy.snapshotMaxBytes);
  const snapshot = serializeTerminalSnapshot(terminal, serializer, '\x1b[?1006h');
  assert.ok(Buffer.byteLength(snapshot) <= terminalPolicy.snapshotMaxBytes);
  assert.equal(snapshot.includes('row_2999'), true);
  assert.equal(snapshot.includes('row_1000'), false);
  assert.equal(snapshot.includes('\uFFFD'), false);
  assert.ok(snapshot.endsWith('\x1b[?1006h'));
  const restored = new headless.Terminal({ allowProposedApi: true, cols: 220, rows: 24, scrollback: 2000 });
  t.after(() => restored.dispose());
  await write(restored, snapshot);
  const line = restored.buffer.active.getLine(restored.buffer.active.baseY + restored.buffer.active.cursorY - 1);
  assert.ok(line.translateToString().includes('row_2999'));
});
