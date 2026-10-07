import { expect, test } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import headlessXterm from '@xterm/headless';
import { spawn as ptySpawn } from 'bun-pty';
import { createPersistentPtyBackend } from './persistent-pty.js';
import { UnicodeGraphemesAddon } from './unicode.js';

const available = process.platform !== 'win32' && spawnSync('tmux', ['-V']).status === 0;

(available ? test : test.skip)('persistent history scrolls to an absolute position and application mouse events pass through', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-scroll-'));
  const socketName = `cloud-terminal-scroll-${randomUUID()}`;
  const sessionId = randomUUID();
  const config = fileURLToPath(new URL('../deploy/tmux.conf', import.meta.url));
  const daemon = spawn('tmux', ['-D', '-L', socketName, '-f', config], { stdio: 'ignore' });
  const tmux = (...args: string[]) => spawnSync('tmux', ['-L', socketName, '-N', ...args], { encoding: 'utf8' });
  const waitFor = async (predicate: () => boolean) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('Timed out waiting for tmux scrolling');
  };
  const terminal = new headlessXterm.Terminal({ allowProposedApi: true, cols: 80, rows: 20 });
  terminal.loadAddon(new UnicodeGraphemesAddon());
  let pty: ReturnType<typeof ptySpawn> | undefined;
  try {
    await waitFor(() => tmux('show-options', '-g', '-v', 'mouse').stdout.trim() === 'on');
    const backend = createPersistentPtyBackend({ enabled: true, socketName });
    const prepared = backend.prepare(sessionId, {
      cwd: directory, cols: 80, rows: 20,
      shell: { command: '/bin/bash', args: ['--noprofile', '--norc'] }, env: { SSH_CLIENT: '127.0.0.1 0 0' },
    })!;
    pty = ptySpawn(prepared.command, prepared.args, { cols: 80, rows: 20, cwd: directory, name: 'xterm-256color', env: { ...process.env, TERM: 'xterm-256color' } });
    terminal.onData((data) => pty?.write(data));
    pty.onData((data) => terminal.write(data));
    await waitFor(() => terminal.modes.mouseTrackingMode !== 'none');
    pty.write("printf 'history-row-%s\\n' {1..120}\r");
    await waitFor(() => backend.viewport(sessionId)!.historyLines >= 100);
    const original = backend.viewport(sessionId)!;
    backend.scroll(sessionId, 40);
    await waitFor(() => backend.viewport(sessionId)!.offset === 40);
    expect(backend.viewport(sessionId)!.inMode).toBe(true);
    backend.scroll(sessionId, original.historyLines + 1000);
    expect(backend.viewport(sessionId)!.offset).toBe(original.historyLines);
    backend.scroll(sessionId, 0);
    expect(backend.viewport(sessionId)!.inMode).toBe(false);
    // An unhandled wheel in a normal application opens tmux history.
    pty.write('\x1b[<64;8;9M');
    await waitFor(() => backend.viewport(sessionId)!.inMode);
    backend.scroll(sessionId, 0);
    // A fullscreen TUI requesting mouse input gets the original SGR report.
    const capture = path.join(directory, 'mouse.txt');
    const script = "const fs=require('fs');process.stdout.write(String.fromCharCode(27)+'[?1049h'+String.fromCharCode(27)+'[?1000h'+String.fromCharCode(27)+'[?1006h');process.stdin.setRawMode(true);process.stdin.resume();process.stdin.on('data',d=>{if(d.toString().includes('[<64;'))fs.writeFileSync(process.argv[1],d.toString())})";
    pty.write(`node -e ${JSON.stringify(script)} ${JSON.stringify(capture)}\r`);
    await waitFor(() => tmux('display-message', '-p', '-t', `=cloud-terminal-${sessionId}:`, '#{mouse_any_flag}').stdout.trim() === '1');
    expect(backend.viewport(sessionId)!.historyLines).toBe(0);
    pty.write('\x1b[<64;8;9M');
    await waitFor(() => fs.existsSync(capture));
    expect(fs.readFileSync(capture, 'utf8')).toContain('\x1b[<64;8;9M');
  } finally {
    pty?.kill();
    tmux('kill-server');
    daemon.kill();
    terminal.dispose();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 15000);
