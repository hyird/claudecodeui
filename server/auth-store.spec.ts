import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.CLOUDCLI_DB_PATH = ':memory:';
const auth = await import('./auth-store.js');

test('administrator provisions independent collaborator accounts', async () => {
  await auth.initializeAuthStore();
  const owner = await auth.registerUser('owner', 'owner-secret');
  expect(owner.user.role).toBe('admin');

  const collaborator = await auth.createCollaborator(owner.user, 'teammate', 'member-secret');
  expect(collaborator.role).toBe('member');
  await expect(auth.createCollaborator(owner.user, 'x'.repeat(81), 'member-secret'))
    .rejects.toThrow('Username or password is too long');
  await expect(auth.createCollaborator(owner.user, 'member2', 'x'.repeat(1025)))
    .rejects.toThrow('Username or password is too long');
  expect((await auth.listUsers(owner.user)).map((user: { username: string }) => user.username))
    .toEqual(['owner', 'teammate']);

  const memberLogin = await auth.loginUser('teammate', 'member-secret');
  expect(memberLogin.user.role).toBe('member');
  expect(await auth.authenticateToken(owner.token)).toEqual(owner.user);
  expect(await auth.authenticateToken(memberLogin.token)).toEqual(memberLogin.user);
  await expect(auth.createCollaborator(memberLogin.user, 'third', 'secret123'))
    .rejects.toThrow('Administrator access required');

  await auth.removeCollaborator(owner.user, collaborator.id);
  expect(await auth.authenticateToken(memberLogin.token)).toBeNull();
  await expect(auth.loginUser('teammate', 'member-secret')).rejects.toThrow('Invalid username or password');
});

test('an existing single-user database migrates its owner to administrator', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloudterminal-auth-migration-'));
  const dbPath = path.join(directory, 'auth.sqlite');
  try {
    const db = new Database(dbPath, { create: true });
    db.exec(`CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash VARCHAR(160) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL,
      last_login_at VARCHAR(32)
    );`);
    db.query("INSERT INTO users (username, password_hash, password_salt, created_at, updated_at) VALUES ('owner', 'hash', 'salt', 'now', 'now')").run();
    db.query("INSERT INTO users (username, password_hash, password_salt, created_at, updated_at) VALUES ('second', 'hash', 'salt', 'now', 'now')").run();
    db.close();

    const moduleUrl = new URL('./auth-store.js', import.meta.url).href;
    const script = `import { initializeAuthStore, listUsers } from ${JSON.stringify(moduleUrl)}; await initializeAuthStore(); console.log(JSON.stringify(await listUsers({ role: 'admin' })));`;
    const result = spawnSync(process.execPath, ['-e', script], {
      encoding: 'utf8',
      env: { ...process.env, CLOUDCLI_DB_PATH: dbPath },
    });
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      { id: 1, username: 'owner', role: 'admin' },
      { id: 2, username: 'second', role: 'member' },
    ]);
  } finally {
    for (const suffix of ['', '-wal', '-shm']) {
      const file = dbPath + suffix;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
    fs.rmdirSync(directory);
  }
});
