import { expect, test } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { cloudcli } from '../proto/messages.js';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
const available = process.platform !== 'win32' && spawnSync('tmux', ['-V']).status === 0;

(available ? test : test.skip)('web-service restart preserves the real tmux shell, tabs and input deduplication', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-restart-'));
  const socketName = `cloud-terminal-test-${randomUUID()}`;
  const tmux = (...args: string[]) => spawnSync('tmux', ['-L', socketName, '-N', ...args], { encoding: 'utf8' });
  const host = net.createServer();
  await new Promise<void>((resolve) => host.listen(0, '127.0.0.1', resolve));
  const port = (host.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => host.close(() => resolve()));
  const baseUrl = `http://127.0.0.1:${port}`;
  const daemon = spawn('tmux', ['-D', '-L', socketName, '-f', path.join(projectDir, 'deploy/tmux.conf')], { stdio: 'ignore' });
  let application: ReturnType<typeof spawn> | undefined;
  let serverLog = '';
  let diagnostic = () => '';
  const sockets: WebSocket[] = [];
  const waitFor = async (predicate: () => boolean | Promise<boolean>) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Timed out waiting for persistent restart test: ${serverLog.slice(-1500)}\n${diagnostic()}`);
  };
  const startApplication = async () => {
    application = spawn(process.execPath, ['server/index.js'], {
      cwd: projectDir,
      env: { ...process.env, PORT: String(port), CLOUDCLI_DB_PATH: path.join(directory, 'auth.sqlite'), CLOUDCLI_PERSIST_TERMINALS: '1', CLOUDCLI_TMUX_SOCKET: socketName },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    application.stdout?.on('data', (chunk) => { serverLog += chunk; });
    application.stderr?.on('data', (chunk) => { serverLog += chunk; });
    await waitFor(async () => {
      try { return (await fetch(`${baseUrl}/api/health`)).ok; } catch { return false; }
    });
  };
  const stopApplication = async () => {
    if (!application || application.exitCode !== null || application.signalCode !== null) return;
    const stopped = new Promise((resolve) => application!.once('exit', resolve));
    application.kill('SIGTERM');
    await stopped;
    application = undefined;
  };
  const connect = async (pathname: string, token: string, init?: object) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${pathname}`, ['cloudcli.v1', `auth.${token}`]);
    sockets.push(ws);
    const messages: any[] = [];
    ws.addEventListener('message', (event) => {
      const bytes = new Uint8Array(event.data as ArrayBuffer);
      messages.push(pathname.endsWith('/tabs') ? cloudcli.TabsServerMessage.decode(bytes) : cloudcli.TerminalServerMessage.decode(bytes));
    });
    ws.binaryType = 'arraybuffer';
    await new Promise<void>((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', reject, { once: true });
    });
    if (init) ws.send(cloudcli.TerminalClientMessage.encode({ init }).finish());
    await waitFor(() => messages.some((message) => message.body === (pathname.endsWith('/tabs') ? 'tabs' : 'ready')));
    return { ws, messages };
  };
  try {
    await waitFor(() => tmux('show-options', '-s', '-v', 'exit-empty').status === 0);
    await startApplication();
    const registration = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'restart-test', password: 'restart-test-password' }),
    }).then((response) => response.json()) as { token: string };
    const tabs = await connect('/terminal/tabs', registration.token);
    const tabId = tabs.messages[0].tabs.activeId;
    const streamId = randomUUID();
    const output = await connect('/terminal/output', registration.token, { sessionId: tabId, inputStreamId: streamId, cols: 80, rows: 24 });
    const generation = output.messages.find((message) => message.body === 'ready').ready.sessionGeneration;
    const input = await connect('/terminal/input', registration.token, { sessionId: tabId, inputStreamId: streamId, sessionGeneration: generation });
    const sessionName = `=cloud-terminal-${tabId}:`;
    diagnostic = () => {
      const pane = tmux('capture-pane', '-p', '-t', sessionName);
      return `test pane (status=${pane.status}):\n${pane.stdout}\n${pane.stderr}`;
    };
    const shellPid = tmux('display-message', '-p', '-t', sessionName, '#{pane_pid}').stdout.trim();
    expect(Number(shellPid)).toBeGreaterThan(0);
    const command = 'export CT_RESTART_COUNT=$(( ${CT_RESTART_COUNT:-0} + 1 )); printf "CT_READY_%s\\n" "$CT_RESTART_COUNT"\r';
    input.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 1, data: command } }).finish());
    await waitFor(() => input.messages.some((message) => message.body === 'inputAck' && message.inputAck.inputSeq === 1));
    await waitFor(() => tmux('capture-pane', '-p', '-t', sessionName).stdout.includes('CT_READY_1'));
    await stopApplication();
    expect(tmux('display-message', '-p', '-t', sessionName, '#{pane_pid}').stdout.trim()).toBe(shellPid);
    await startApplication();
    const restoredTabs = await connect('/terminal/tabs', registration.token);
    expect(restoredTabs.messages[0].tabs.activeId).toBe(tabId);
    const restoredOutput = await connect('/terminal/output', registration.token, { sessionId: tabId, inputStreamId: streamId, sessionGeneration: generation, lastSeq: 1, cols: 80, rows: 24 });
    expect(restoredOutput.messages.find((message) => message.body === 'ready').ready.sessionGeneration).toBe(generation);
    const restoredInput = await connect('/terminal/input', registration.token, { sessionId: tabId, inputStreamId: streamId, sessionGeneration: generation });
    restoredInput.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 1, data: command } }).finish());
    await waitFor(() => restoredInput.messages.some((message) => message.body === 'inputAck' && message.inputAck.inputSeq === 1));
    restoredInput.ws.send(cloudcli.TerminalClientMessage.encode({ input: { inputSeq: 2, data: 'printf "CT_FINAL_%s\\n" "$CT_RESTART_COUNT"\r' } }).finish());
    await waitFor(() => tmux('capture-pane', '-p', '-t', sessionName).stdout.includes('CT_FINAL_1'));
    expect(tmux('display-message', '-p', '-t', sessionName, '#{pane_pid}').stdout.trim()).toBe(shellPid);
  } finally {
    for (const ws of sockets) ws.close();
    await stopApplication();
    tmux('kill-server');
    daemon.kill();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}, 20000);
