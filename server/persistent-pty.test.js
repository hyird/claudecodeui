import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPersistentPtyBackend } from './persistent-pty.js';

function fakeTmux() {
  const sessions = new Map();
  const calls = [];
  let nextId = 0;
  const run = (_command, args) => {
    calls.push(args);
    assert.equal(args[0], '-L');
    assert.ok(args.includes('-N'), 'the web process must never start a tmux server');
    const command = args[3];
    const name = args[args.indexOf('-t') + 1]?.replace(/^=/, '').replace(/:$/, '');
    const session = sessions.get(name);
    if (command === 'show-options') return { status: 0, stdout: 'off\n' };
    if (command === 'has-session') return { status: session ? 0 : 1, stdout: '' };
    if (command === 'new-session') {
      sessions.set(args[args.indexOf('-s') + 1], { generation: `123:$${nextId++}:100`, cwd: '/work' });
      return { status: 0, stdout: '' };
    }
    if (command === 'display-message') return { status: 0, stdout: args.at(-1).includes('pane_current_path') ? session.cwd : session.generation };
    if (command === 'kill-session') { sessions.delete(name); return { status: 0, stdout: '' }; }
    if (command === 'list-sessions') return { status: 0, stdout: [...sessions.keys()].join('\n') };
    throw new Error(`Unexpected command ${command}`);
  };
  return { run, calls, sessions };
}

const options = { cwd: '/work', cols: 100, rows: 30, shell: { command: '/bin/bash', args: [] }, env: { SSH_CLIENT: '127.0.0.1 0 0' } };

test('application replacement reattaches the same persistent shell and generation', () => {
  const tmux = fakeTmux();
  const first = createPersistentPtyBackend({ enabled: true, platform: 'linux', run: tmux.run });
  const original = first.prepare('session-1', options);
  const replacement = createPersistentPtyBackend({ enabled: true, platform: 'linux', run: tmux.run });
  const restored = replacement.prepare('session-1', options);
  assert.deepEqual(restored, original);
  assert.equal(tmux.calls.filter((args) => args[3] === 'new-session').length, 1);
  assert.equal(replacement.count(), 1);
  replacement.close('session-1');
  assert.equal(replacement.count(), 0);
  const rebuilt = replacement.prepare('session-1', options);
  assert.notEqual(rebuilt.generation, original.generation);
});

test('a missing persistent service fails without spawning shells in the application cgroup', () => {
  assert.throws(() => createPersistentPtyBackend({ enabled: true, platform: 'linux', run: () => ({ status: 1, stdout: '' }) }), /Start the separate tmux service/);
});

test('ordinary Windows development does not invoke tmux', () => {
  const backend = createPersistentPtyBackend({ enabled: false, platform: 'win32', run: () => { throw new Error('must not run'); } });
  assert.equal(backend.prepare('session-1', options), null);
  backend.close('session-1');
});
