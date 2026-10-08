import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import headlessXterm from '@xterm/headless';
import { cloudcli } from '../proto/messages.js';
import { requestPtyBroker } from './pty-channel.js';
import terminalPolicy from '../shared/terminal-policy.json';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
(process.platform === 'win32' ? test.skip : test)('bun-pty service preserves shell, history and input deduplication across web restarts', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-broker-'));
  const socketPath = path.join(directory, 'pty.sock');
  const host = net.createServer();
  await new Promise<void>((resolve) => host.listen(0, '127.0.0.1', resolve));
  const port = (host.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => host.close(() => resolve()));
  const baseUrl = `http://127.0.0.1:${port}`;
  const env = { ...process.env, CLOUDCLI_PTY_SOCKET: socketPath };
  const broker = spawn(process.execPath, ['server/pty-broker.js'], { cwd: projectDir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let application: ReturnType<typeof spawn> | undefined;
  let logs = '';
  let tabId = '';
  const sockets: WebSocket[] = [];
  const terminals: headlessXterm.Terminal[] = [];
  broker.stderr?.on('data', (data) => { logs += data; });
  const waitFor = async (predicate: () => boolean | Promise<boolean>) => {
    for (let i = 0; i < 300; i++) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error(`Persistent service timeout: ${logs.slice(-2000)}`);
  };
  const inspect = () => requestPtyBroker(socketPath, { type: 'prepare', sessionId: tabId }) as Promise<any>;
  const start = async () => {
    application = spawn(process.execPath, ['server/index.js'], { cwd: projectDir,
      env: { ...env, PORT: String(port), CLOUDCLI_DB_PATH: path.join(directory, 'auth.sqlite'), CLOUDCLI_PERSIST_TERMINALS: '1' },
      stdio: ['ignore', 'pipe', 'pipe'] });
    application.stderr?.on('data', (data) => { logs += data; });
    await waitFor(async () => { try { return (await fetch(`${baseUrl}/api/health`)).ok; } catch { return false; } });
  };
  const stop = async () => {
    if (!application || application.exitCode !== null || application.signalCode !== null) return;
    const exited = new Promise((resolve) => application!.once('exit', resolve));
    application.kill('SIGTERM');
    await exited;
    application = undefined;
  };
  const connect = async (pathname: string, token: string, init?: object) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${pathname}`, ['cloudcli.v1', `auth.${token}`]);
    sockets.push(ws);
    const messages: any[] = [];
    const terminal = new headlessXterm.Terminal({ allowProposedApi: true, cols: 200, rows: 24, scrollback: terminalPolicy.scrollbackLines });
    terminals.push(terminal);
    ws.binaryType = 'arraybuffer';
    ws.addEventListener('message', (event) => {
      const bytes = new Uint8Array(event.data as ArrayBuffer);
      const message = pathname.endsWith('/tabs') ? cloudcli.TabsServerMessage.decode(bytes) : cloudcli.TerminalServerMessage.decode(bytes);
      messages.push(message);
      if ('output' in message && message.output) terminal.write(message.output.compressed
        ? inflateSync(message.output.data) : message.output.data);
      if ('ready' in message && message.ready?.reset) terminal.reset();
    });
    await new Promise<void>((resolve, reject) => { ws.addEventListener('open', () => resolve(), { once: true }); ws.addEventListener('error', reject, { once: true }); });
    if (init) ws.send(cloudcli.TerminalClientMessage.encode({ init }).finish());
    await waitFor(() => messages.some((m) => m.body === (pathname.endsWith('/tabs') ? 'tabs' : 'ready')));
    return { ws, messages, terminal };
  };
  try {
    await waitFor(async () => { try { return (await requestPtyBroker(socketPath, { type: 'ping' }) as any).ok; } catch { return false; } });
    await start();
    const registration = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'broker-test', password: 'broker-test-password' }) }).then((r) => r.json()) as { token: string };
    const tabs = await connect('/terminal/tabs', registration.token);
    tabId = tabs.messages[0].tabs.activeId;
    const streamId = randomUUID();
    const output = await connect('/terminal/output', registration.token, { sessionId: tabId, inputStreamId: streamId, cols: 200, rows: 24 });
    const generation = output.messages.find((m) => m.ready).ready.sessionGeneration;
    const input = await connect('/terminal/input', registration.token, { sessionId: tabId, inputStreamId: streamId, sessionGeneration: generation });
    const original = await inspect();
    expect(original.pid).toBeGreaterThan(0);
    // Produce more history than the cap, then restore only the newest rows.
    const command = 'export CT_COUNT=$(( ${CT_COUNT:-0} + 1 )); printf "history-%0180d\\n" {1..'
      + (terminalPolicy.scrollbackLines + 5000) + '}; printf "CT_READY_%s\\n" "$CT_COUNT"\r';
    input.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 1, data: command } }).finish());
    await waitFor(() => input.messages.some((m) => m.inputAck?.inputSeq === 1));
    await waitFor(() => output.terminal.buffer.active.baseY === terminalPolicy.scrollbackLines);
    expect(output.terminal.buffer.active.type).toBe('normal');
    await stop();
    expect((await inspect()).pid).toBe(original.pid);
    await start();
    const restoredTabs = await connect('/terminal/tabs', registration.token);
    expect(restoredTabs.messages[0].tabs.activeId).toBe(tabId);
    const restored = await connect('/terminal/output', registration.token, { sessionId: tabId, inputStreamId: streamId, sessionGeneration: generation, lastSeq: 1, cols: 200, rows: 24 });
    expect(restored.messages.find((m) => m.ready).ready.sessionGeneration).toBe(generation);
    await waitFor(() => restored.terminal.buffer.active.baseY >= terminalPolicy.scrollbackLines - 100);
    expect(restored.terminal.buffer.active.type).toBe('normal');
    const restoredInput = await connect('/terminal/input', registration.token, { sessionId: tabId, inputStreamId: streamId, sessionGeneration: generation });
    restoredInput.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 1, data: command } }).finish());
    restoredInput.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 2, data: 'printf "CT_FINAL_%s\\n" "$CT_COUNT"\r' } }).finish());
    await waitFor(async () => (await inspect()).data.includes('CT_FINAL_1'));
    expect((await inspect()).pid).toBe(original.pid);
    // Exercise incremental replay through actual module imports. Source-extraction
    // tests previously hid a missing replay-function import that crashed the web process.
    await waitFor(() => restored.messages.some((m) => m.output && Buffer.from(m.output.data).includes('CT_FINAL_1')));
    const lastSeq = Math.max(...restored.messages.map((m) => Number(m.seq ?? 0)));
    expect(lastSeq).toBeGreaterThan(0);
    restoredInput.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 3,
      data: '(sleep 0.2; printf "\\nINCREMENTAL_REPLAY_OK\\n") &\r' } }).finish());
    await waitFor(() => restoredInput.messages.some((m) => m.inputAck?.inputSeq === 3));
    restored.ws.close();
    await waitFor(() => restored.ws.readyState === WebSocket.CLOSED);
    await waitFor(async () => /\r?\nINCREMENTAL_REPLAY_OK\r?\n/.test((await inspect()).data));
    const replayed = await connect('/terminal/output', registration.token, { sessionId: tabId,
      inputStreamId: streamId, sessionGeneration: generation, lastSeq, cols: 200, rows: 24 });
    const replayReady = replayed.messages.find((m) => m.ready).ready;
    expect({ reset: replayReady.reset, gap: replayReady.gap, cursor: lastSeq, serverSeq: Number(replayReady.lastSeq) })
      .toMatchObject({ reset: false, gap: false });
    await waitFor(() => replayed.messages.some((m) => m.output && Buffer.from(m.output.data).includes('INCREMENTAL_REPLAY_OK')));
    expect((await fetch(`${baseUrl}/api/health`)).ok).toBe(true);
    const replayedInput = await connect('/terminal/input', registration.token, { sessionId: tabId,
      inputStreamId: streamId, sessionGeneration: generation });
    // Disconnect the browser and produce output while the web process is down.
    replayedInput.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 4, data: '(sleep 0.3; printf "\\nBROKER_BACKGROUND_OK\\n") &\r' } }).finish());
    await waitFor(() => replayedInput.messages.some((m) => m.inputAck?.inputSeq === 4));
    await stop();
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect((await inspect()).data).toMatch(/\r?\nBROKER_BACKGROUND_OK\r?\n/);
    expect(fs.statSync(socketPath).mode & 0o777).toBe(0o600);
  } finally {
    for (const socket of sockets) socket.close();
    await stop();
    if (tabId) await requestPtyBroker(socketPath, { type: 'close', sessionId: tabId }).catch(() => {});
    broker.kill();
    for (const terminal of terminals) terminal.dispose();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 20000);
