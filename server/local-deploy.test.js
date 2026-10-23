import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
// On Windows `bash` is usually WSL, which cannot run executables from a
// Windows temp directory under the same path; these are POSIX deployment scripts.
const skip = process.platform === 'win32' && 'deployment scripts run under a POSIX bash';

const LEGACY_HEALTH = '{"ok":true,"sessions":2}';
const PERSISTENT_HEALTH = '{"ok":true,"sessions":2,"persistentSessions":true,"persistentBackend":"node-pty"}';

// A copy of the deploy script in a throwaway project with stand-in build output,
// and fake curl/sudo/npm that record what the script asked them to do.
function createFakeProject({ health, npmExit = 0 }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-deploy-'));
  const write = (relative, content, mode = 0o644) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content, { mode });
  };
  for (const relative of ['scripts/deploy-local.sh', 'deploy/render-unit.sh', 'deploy/cloud-terminal.service', 'deploy/cloud-terminal-pty.service']) {
    write(relative, fs.readFileSync(path.join(projectDir, relative)));
  }
  for (const relative of ['dist/index.html', 'dist/logo.svg', 'dist-server/server.js', 'dist-server/pty-broker.js',
    'dist-server/node_modules/node-pty/index.js', 'dist-server/node_modules/better-sqlite3/index.js', 'dist-server/package.json']) {
    write(relative, 'stand-in');
  }
  // health is the /api/health payload per call; the last one repeats.
  health.forEach((payload, index) => write(`state/health-${index + 1}`, `${payload}\n`));
  write('bin/curl', `#!/usr/bin/env bash
n=$(( $(cat "$FAKE_STATE/curl-calls" 2>/dev/null || echo 0) + 1 ))
echo "$n" > "$FAKE_STATE/curl-calls"
(( n <= ${health.length} )) || n=${health.length}
cat "$FAKE_STATE/health-$n"
`, 0o755);
  write('bin/sudo', '#!/usr/bin/env bash\nprintf \'%s\\n\' "$*" >> "$FAKE_STATE/sudo.log"\n', 0o755);
  write('bin/npm', `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "$FAKE_STATE/npm.log"\nexit ${npmExit}\n`, 0o755);

  const read = (name) => {
    const file = path.join(root, 'state', name);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  };
  return {
    run: (...args) => spawnSync('bash', [path.join(root, 'scripts', 'deploy-local.sh'), ...args], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${path.join(root, 'bin')}:${process.env.PATH}`, FAKE_STATE: path.join(root, 'state') },
    }),
    sudoLog: () => read('sudo.log'),
    npmLog: () => read('npm.log'),
    remove: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test('local deployment refuses to restart active legacy terminal sessions by default', { skip }, () => {
  const project = createFakeProject({ health: [LEGACY_HEALTH] });
  try {
    const result = project.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refusing to restart cloud-terminal\.service with 2 active terminal session/);
    assert.match(result.stderr, /explicitly use --force/);
    assert.equal(project.npmLog(), '');
    assert.equal(project.sudoLog(), '');
  } finally {
    project.remove();
  }
});

test('--force deploys over active legacy terminal sessions', { skip }, () => {
  const project = createFakeProject({ health: [LEGACY_HEALTH], npmExit: 23 });
  try {
    const result = project.run('--force');
    assert.equal(result.status, 23, result.stderr);
    assert.equal(project.npmLog(), 'run build\n');
  } finally {
    project.remove();
  }
});

test('persistent sessions are allowed through the deployment guard without a forced restart', { skip }, () => {
  const project = createFakeProject({ health: [PERSISTENT_HEALTH], npmExit: 23 });
  try {
    const result = project.run();
    assert.equal(result.status, 23, result.stderr);
    assert.equal(project.npmLog(), 'run build\n');
    assert.doesNotMatch(result.stderr, /refusing to restart/);
  } finally {
    project.remove();
  }
});

test('an older persistent broker remains running while its web runtime is migrated', { skip }, () => {
  const health = '{"ok":true,"sessions":2,"persistentSessions":true,"persistentBackend":"legacy-pty"}';
  const project = createFakeProject({ health: [health], npmExit: 23 });
  try {
    const result = project.run();
    assert.equal(result.status, 23, result.stderr);
    assert.equal(project.npmLog(), 'run build\n');
    assert.doesNotMatch(project.sudoLog(), /systemctl (?:restart|stop).*pty/);
  } finally {
    project.remove();
  }
});

test('a legacy session opened during build and test stops the deployment before /opt changes', { skip }, () => {
  const project = createFakeProject({ health: [PERSISTENT_HEALTH, LEGACY_HEALTH] });
  try {
    const result = project.run();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refusing to restart/);
    assert.equal(project.npmLog(), 'run build\nrun test\n');
    assert.equal(project.sudoLog(), '-n true\n');
  } finally {
    project.remove();
  }
});

test('local deployment installs units and replaces dist without restarting the PTY service', { skip }, () => {
  const project = createFakeProject({ health: [PERSISTENT_HEALTH] });
  try {
    // sudo is a recorder, so the run stops wherever the real host state is
    // missing (e.g. the PTY socket); only the requested commands matter here.
    project.run();
    const sudo = project.sudoLog();
    assert.match(sudo, /^-n install .* \/etc\/systemd\/system\/cloud-terminal\.service$/m);
    assert.match(sudo, /^-n install .* \/etc\/systemd\/system\/cloud-terminal-pty\.service$/m);
    assert.match(sudo, /^-n cp -R dist \/opt\/cloud-terminal\/current\/dist\.next$/m);
    assert.match(sudo, /^-n mv \/opt\/cloud-terminal\/current\/dist\.next \/opt\/cloud-terminal\/current\/dist$/m);
    assert.match(sudo, /^-n systemctl enable --now cloud-terminal-pty\.service$/m);
    assert.doesNotMatch(sudo, /systemctl (?:restart|stop|reload-or-restart|try-restart) cloud-terminal-pty/);
  } finally {
    project.remove();
  }
});

test('unit templates render every placeholder and reject unsafe values', { skip }, () => {
  const values = ['USER=svc', 'GROUP=svc', 'HOME=/home/svc', 'NODE=/usr/bin/node', 'NODE_DIR=/usr/bin',
    'BASE=/srv/ct', 'PORT=4001', 'PTY_SERVICE=ct-pty.service'];
  const render = (template, ...pairs) => spawnSync('bash', ['-c', 'source deploy/render-unit.sh && render_unit "$@"', 'render', template, ...pairs], {
    cwd: projectDir,
    encoding: 'utf8',
  });

  const web = render('deploy/cloud-terminal.service', ...values);
  assert.equal(web.status, 0, web.stderr);
  assert.doesNotMatch(web.stdout, /@[A-Z_]+@/);
  assert.match(web.stdout, /^ExecStart=\/usr\/bin\/node \/srv\/ct\/current\/server\.js$/m);
  assert.match(web.stdout, /^Wants=ct-pty\.service$/m);
  assert.match(web.stdout, /^ReadWritePaths=\/srv\/ct\/data -\/run\/cloud-terminal$/m);

  const pty = render('deploy/cloud-terminal-pty.service', ...values);
  assert.equal(pty.status, 0, pty.stderr);
  assert.match(pty.stdout, /^ExecStart=\/usr\/bin\/node \/srv\/ct\/current\/pty-broker\.js$/m);
  // The PTY unit hosts interactive shells: sudo must keep working and the web
  // service must never take it down with it.
  assert.doesNotMatch(pty.stdout, /^(?:NoNewPrivileges|ProtectSystem|PartOf|BindsTo)=/m);

  const missing = render('deploy/cloud-terminal.service', ...values.filter((pair) => !pair.startsWith('BASE=')));
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /no value for @BASE@/);

  const unsafe = render('deploy/cloud-terminal.service', ...values.map((pair) => (pair.startsWith('HOME=') ? 'HOME=/home/svc %h' : pair)));
  assert.equal(unsafe.status, 1);
  assert.match(unsafe.stderr, /unsafe systemd unit value HOME=/);
});
