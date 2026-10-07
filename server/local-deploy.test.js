import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectDir = fileURLToPath(new URL('..', import.meta.url));
const deployScript = path.join(projectDir, 'scripts', 'deploy-local.sh');
const source = fs.readFileSync(deployScript, 'utf8');

test('local deployment refuses to restart active terminal sessions by default', () => {
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-deploy-test-'));
  const fakeCurl = path.join(fakeBin, 'curl');
  fs.writeFileSync(fakeCurl, '#!/usr/bin/env bash\nprintf \'%s\\n\' \'{"ok":true,"sessions":2}\'\n');
  fs.chmodSync(fakeCurl, 0o755);

  try {
    const bashFakeBin = fakeBin.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
    const result = spawnSync('bash', ['-c', 'export PATH="$1:$PATH"; exec bash scripts/deploy-local.sh', 'deploy-test', bashFakeBin], {
      cwd: projectDir,
      encoding: 'utf8',
      env: process.env,
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /refusing to restart cloud-terminal\.service with 2 active terminal session/);
    assert.match(result.stderr, /explicitly use --force/);
    assert.equal(result.stdout.includes('bun run build'), false);
  } finally {
    fs.rmSync(fakeBin, { recursive: true, force: true });
  }
});

test('persistent sessions are allowed through the deployment guard without a forced restart', () => {
  const fakeBin = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-safe-deploy-'));
  try {
    for (const [name, body] of Object.entries({
      curl: 'printf \'%s\\n\' \'{"ok":true,"sessions":2,"persistentSessions":true}\'',
      sudo: 'exit 0', tmux: 'exit 0', bun: 'echo "BUILD_WITH_PERSISTENT_SESSIONS"; exit 23',
    })) {
      const file = path.join(fakeBin, name);
      fs.writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
      fs.chmodSync(file, 0o755);
    }
    const bashFakeBin = fakeBin.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive) => `/${drive.toLowerCase()}`);
    const result = spawnSync('bash', ['-c', 'export PATH="$1:$PATH"; exec bash scripts/deploy-local.sh', 'deploy-test', bashFakeBin], { cwd: projectDir, encoding: 'utf8' });
    assert.equal(result.status, 23, result.stderr);
    assert.match(result.stdout, /BUILD_WITH_PERSISTENT_SESSIONS/);
    assert.doesNotMatch(result.stderr, /refusing to restart/);
  } finally { fs.rmSync(fakeBin, { recursive: true, force: true }); }
});

test('local deployment rechecks sessions before installing and supports an explicit override', () => {
  const firstCheck = source.indexOf('check_active_sessions');
  const lastCheck = source.lastIndexOf('check_active_sessions');
  const firstInstall = source.indexOf('sudo -n install');

  assert.ok(firstCheck >= 0);
  assert.ok(lastCheck > firstCheck);
  assert.ok(lastCheck < firstInstall, 'session checks must finish before deployment mutates /opt');
  assert.match(source, /--force\) FORCE_RESTART=1/);
  assert.match(source, /active_sessions > 0 && FORCE_RESTART == 0/);
  assert.match(source, /persistentSessions/);
  assert.match(source, /systemctl enable --now "\$\{TMUX_SERVICE\}"/);
  assert.doesNotMatch(source, /systemctl (?:restart|stop) "\$\{TMUX_SERVICE\}"/);
});
