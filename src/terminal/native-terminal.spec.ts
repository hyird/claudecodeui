import { expect, test } from 'vitest';
import { Terminal } from '@xterm/xterm';

const write = (terminal: Terminal, data: string) => new Promise<void>((resolve) => terminal.write(data, resolve));

test('the installed xterm parser reports native modes and continues parsing after probes', async () => {
  const terminal = new Terminal({ allowProposedApi: true });
  const replies: string[] = [];
  terminal.onData((data) => replies.push(data));
  try {
    await write(terminal, '\x1b[?2026$p\x1b[?2026h\x1b[?2026$p\x1b[?2026l\x1b[?2026$p');
    await write(terminal, '\x1b[?2004h\x1b[?2004$p\x1b[?25$p\x1b[4$p\x1b[?9999$pOK');
    expect(replies).toEqual([
      '\x1b[?2026;2$y', '\x1b[?2026;1$y', '\x1b[?2026;2$y',
      '\x1b[?2004;1$y', '\x1b[?25;1$y', '\x1b[4;2$y', '\x1b[?9999;0$y',
    ]);
    expect(terminal.buffer.active.getLine(0)?.translateToString(true)).toBe('OK');
  } finally { terminal.dispose(); }
});

test('repeated partial multi-line prompt redraws do not grow the buffer', async () => {
  const terminal = new Terminal({ cols: 40, rows: 6, allowProposedApi: true });
  try {
    await write(terminal, 'previous output\r\n\x1b[32mpath\x1b[0m\r\n> ');
    for (let i = 0; i < 30; i++) {
      await write(terminal, `\x1b[?2026h\r\x1b[1A\x1b[0J\x1b[32mpath ${i}\x1b[0m\r\n> command`);
      await write(terminal, '\x1b[?2026l');
    }
    const buffer = terminal.buffer.active;
    expect(buffer.baseY).toBe(0);
    expect(buffer.cursorY).toBe(2);
    expect(buffer.cursorX).toBe(9);
    expect(buffer.getLine(0)?.translateToString(true)).toBe('previous output');
    expect(buffer.getLine(1)?.translateToString(true)).toBe('path 29');
    expect(buffer.getLine(2)?.translateToString(true)).toBe('> command');
    expect(buffer.getLine(3)?.translateToString(true)).toBe('');
  } finally { terminal.dispose(); }
});
