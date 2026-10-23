import assert from 'node:assert/strict';
import { test } from 'node:test';
import { watchTerminalCwd } from './terminal-cwd.js';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

function fixture(t, options = {}) {
  const paths = [];
  const handlers = new Map();
  let unsubscribed = false;
  const dispose = watchTerminalCwd({
    terminal: { parser: { registerOscHandler(code, callback) {
      handlers.set(code, callback);
      return { dispose() { unsubscribed = true; } };
    } } },
    initialCwd: '/home/user', platform: 'darwin',
    onChange: (cwd) => paths.push(cwd), ...options,
  });
  t.after(dispose);
  return { paths, osc: (data, code = 7) => handlers.get(code)(data), dispose, unsubscribed: () => unsubscribed };
}

test('directory reports update paths, decode Unicode and spaces, and ignore invalid URLs', (t) => {
  const { paths, osc } = fixture(t);
  osc('file://host/home/user/my%20project/%E4%B8%AD%E6%96%87');
  osc('file://host/home/user/my%20project/%E4%B8%AD%E6%96%87');
  osc('https://example.com/other');
  osc('file://host/%zz');
  osc('file://host/%00bad');
  assert.deepEqual(paths, ['/home/user', '/home/user/my project/中文']);
});

test('Windows directory reports retain drive and UNC paths', (t) => {
  const { paths, osc } = fixture(t, { platform: 'win32', initialCwd: 'C:\\Users\\user' });
  osc('file://localhost/C:\\Projects\\Cloud%20Terminal');
  osc('file://server/shared/project');
  osc('9;C:\\Projects\\Cloud% Terminal#1', 9);
  assert.deepEqual(paths, ['C:\\Users\\user', 'C:\\Projects\\Cloud Terminal', '\\\\server\\shared\\project', 'C:\\Projects\\Cloud% Terminal#1']);
});

test('Linux tracks the real shell directory and does not accept program-provided replacements', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let directory = '/srv/first';
  let reads = 0;
  const { paths, osc, dispose, unsubscribed } = fixture(t, {
    platform: 'linux', pid: 42,
    async readProcessLink(link) { assert.equal(link, '/proc/42/cwd'); reads++; return directory; },
  });
  await Promise.resolve();
  osc('file://host/incorrect-program-directory');
  directory = '/srv/second';
  t.mock.timers.tick(1000);
  await Promise.resolve();
  t.mock.timers.tick(1000);
  await Promise.resolve();
  assert.deepEqual(paths, ['/home/user', '/srv/first', '/srv/second']);
  assert.equal(reads, 3);
  dispose();
  assert.equal(unsubscribed(), true);
  t.mock.timers.tick(1000);
  assert.equal(reads, 3);
});

test('a failed process lookup retains the directory and permits an explicit shell report', async (t) => {
  const { paths, osc } = fixture(t, {
    platform: 'linux', pid: 42,
    async readProcessLink() { throw new Error('process unavailable'); },
  });
  await Promise.resolve();
  osc('file://host/srv/reported');
  assert.deepEqual(paths, ['/home/user', '/srv/reported']);
});

test('a lookup completing after disposal cannot change the title', async (t) => {
  let complete;
  const { paths, dispose } = fixture(t, {
    platform: 'linux', pid: 42,
    readProcessLink: () => new Promise((resolve) => { complete = resolve; }),
  });
  dispose();
  complete('/obsolete-directory');
  await Promise.resolve();
  assert.deepEqual(paths, ['/home/user']);
});

test('a real Linux process changing directories is tracked without terminal output', { skip: process.platform !== 'linux' }, async (t) => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), 'cloud-terminal-cwd-'));
  const directory = path.join(temporary, '项目 with spaces #%');
  await mkdir(directory);
  const child = spawn(process.execPath, ['-e', 'process.on("message", directory => process.chdir(directory));'], {
    cwd: temporary, stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
  });
  let dispose = () => {};
  t.after(async () => {
    dispose();
    child.kill();
    await rm(temporary, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('current directory did not update')), 5000);
    dispose = watchTerminalCwd({
      terminal: { parser: { registerOscHandler: () => ({ dispose() {} }) } },
      pid: child.pid, initialCwd: temporary, intervalMs: 20,
      onChange(cwd) { if (cwd === directory) { clearTimeout(timeout); resolve(); } },
    });
    child.send(directory);
  });
});
