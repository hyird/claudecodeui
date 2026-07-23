import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Database } from 'bun:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const DEFAULT_DB_PATH = path.join(rootDir, '.cloudcli.sqlite');
const DB_PATH = process.env.CLOUDCLI_DB_PATH || DEFAULT_DB_PATH;
const TOKEN_BYTES = 32;
const PASSWORD_KEY_LENGTH = 64;

// Column names below match the schema TypeORM previously synchronized, so an existing
// auth.sqlite created by the old better-sqlite3/TypeORM stack is read/written unchanged.
let db = null;
const sessionInvalidationListeners = new Set();

function ensureSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash VARCHAR(160) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL,
      last_login_at VARCHAR(32)
    );
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash VARCHAR(96) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      last_seen_at VARCHAR(32) NOT NULL
    );
  `);
}

function requireDb() {
  if (!db) {
    throw new Error('Auth store is not initialized. Call initializeAuthStore() first.');
  }
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim() : '';
}

function mapUser(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
  };
}

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, user) {
  const candidate = crypto.scryptSync(password, user.passwordSalt, PASSWORD_KEY_LENGTH);
  const stored = Buffer.from(user.passwordHash, 'hex');
  return stored.length === candidate.length && crypto.timingSafeEqual(stored, candidate);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function notifySessionInvalidated(tokenHash) {
  for (const listener of sessionInvalidationListeners) {
    listener(tokenHash);
  }
}

function createSessionForUser(user) {
  const database = requireDb();
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const timestamp = nowIso();
  const existingSessions = database
    .query('SELECT token_hash FROM auth_sessions WHERE user_id = ?')
    .all(user.id);

  database.query('DELETE FROM auth_sessions WHERE user_id = ?').run(user.id);
  database
    .query(
      'INSERT INTO auth_sessions (token_hash, user_id, created_at, last_seen_at) VALUES (?, ?, ?, ?)',
    )
    .run(hashToken(token), user.id, timestamp, timestamp);

  for (const session of existingSessions) {
    notifySessionInvalidated(session.token_hash);
  }

  return token;
}

export function getDatabasePath() {
  return DB_PATH;
}

export function hashSessionToken(token) {
  return hashToken(token);
}

export function onSessionInvalidated(listener) {
  sessionInvalidationListeners.add(listener);
  return () => {
    sessionInvalidationListeners.delete(listener);
  };
}

export async function initializeAuthStore() {
  const directory = path.dirname(DB_PATH);
  fs.mkdirSync(directory, { recursive: true });

  if (!db) {
    db = new Database(DB_PATH, { create: true });
    db.exec('PRAGMA journal_mode = WAL;');
    ensureSchema(db);
  }
}

export async function hasUsers() {
  const row = requireDb().query('SELECT COUNT(*) AS count FROM users').get();
  return (row?.count ?? 0) > 0;
}

export async function registerUser(usernameInput, password) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required');
  }

  if (username.length < 3 || password.length < 6) {
    throw createHttpError(400, 'Username must be at least 3 characters, password at least 6 characters');
  }

  const database = requireDb();
  const register = database.transaction(() => {
    const { count } = database.query('SELECT COUNT(*) AS count FROM users').get();
    if (count > 0) {
      throw createHttpError(403, 'User already exists. This is a single-user system.');
    }

    const timestamp = nowIso();
    const passwordParts = hashPassword(password);
    const inserted = database
      .query(
        `INSERT INTO users (username, password_hash, password_salt, created_at, updated_at, last_login_at)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
      )
      .get(username, passwordParts.hash, passwordParts.salt, timestamp, timestamp, timestamp);

    const user = { id: inserted.id, username };
    const token = createSessionForUser(user);

    return {
      success: true,
      user: toPublicUser(user),
      token,
    };
  });

  return register();
}

export async function loginUser(usernameInput, password) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required');
  }

  const database = requireDb();
  const user = mapUser(database.query('SELECT * FROM users WHERE username = ?').get(username));
  if (!user || !verifyPassword(password, user)) {
    throw createHttpError(401, 'Invalid username or password');
  }

  const timestamp = nowIso();
  database.query('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, user.id);

  return {
    success: true,
    user: toPublicUser(user),
    token: createSessionForUser(user),
  };
}

export async function authenticateToken(token) {
  if (!token) {
    return null;
  }

  const database = requireDb();
  const session = database.query('SELECT * FROM auth_sessions WHERE token_hash = ?').get(hashToken(token));
  if (!session) {
    return null;
  }

  const user = mapUser(database.query('SELECT * FROM users WHERE id = ?').get(session.user_id));
  if (!user) {
    database.query('DELETE FROM auth_sessions WHERE id = ?').run(session.id);
    return null;
  }

  database.query('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?').run(nowIso(), session.id);
  return toPublicUser(user);
}

export async function logoutToken(token) {
  if (!token) {
    return false;
  }

  const tokenHash = hashToken(token);
  const result = requireDb().query('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash);
  if (result.changes > 0) {
    notifySessionInvalidated(tokenHash);
  }
  return result.changes > 0;
}

export function readBearerToken(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? '';
}

export function toAuthErrorResponse(error) {
  const status = Number.isInteger(error?.status) ? error.status : 500;
  const message = typeof error?.message === 'string' && error.message
    ? error.message
    : 'Internal server error';
  return { status, body: { error: message } };
}
