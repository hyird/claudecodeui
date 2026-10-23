import { expect, test } from 'vitest';
import { build } from 'vite';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Terminal } from '@xterm/xterm';

// Exercise the production bundler, not Vitest's unminified dependency import.
// A broken minifier can strand xterm's write queue on the first DECRQM query.
test('production xterm builds answer mode queries and keep both terminal parsers running', async () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const result = await build({
    root,
    logLevel: 'silent',
    build: {
      write: false,
      lib: {
        entry: `${root}/node_modules/@xterm/xterm/lib/xterm.mjs`,
        formats: ['es'],
        fileName: 'terminal',
      },
    },
  });
  const bundle = (Array.isArray(result) ? result[0] : result) as { output: Array<{ type: string; code?: string }> };
  const code = bundle.output.find((entry) => entry.type === 'chunk')!.code!;
  const directory = mkdtempSync(join(tmpdir(), 'cloud-terminal-production-'));
  const entry = join(directory, 'terminal.mjs');
  const terminals: Terminal[] = [];
  try {
    writeFileSync(entry, code);
    const { Terminal: BuiltTerminal } = await import(/* @vite-ignore */ pathToFileURL(entry).href) as { Terminal: typeof Terminal };
    terminals.push(new BuiltTerminal({ allowProposedApi: true }), new BuiltTerminal({ allowProposedApi: true }));
    for (const terminal of terminals) {
      const replies: string[] = [];
      terminal.onData((data) => replies.push(data));
      // parse synchronously so an exception fails immediately instead of leaving
      // an asynchronous write promise hung until the test timeout.
      const core = (terminal as unknown as { _core: { _inputHandler: { parse(data: string): void } } })._core;
      core._inputHandler.parse('\x1b[?2026$p\x1b[?2004h\x1b[?2004$p\x1b[4$p\x1b[?9999$p');
      expect(replies).toEqual(['\x1b[?2026;2$y', '\x1b[?2004;1$y', '\x1b[4;2$y', '\x1b[?9999;0$y']);
      await new Promise<void>((resolve) => terminal.write('still running', resolve));
      expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('still running');
    }
  } finally {
    for (const terminal of terminals) terminal.dispose();
    rmSync(directory, { recursive: true, force: true });
  }
});
