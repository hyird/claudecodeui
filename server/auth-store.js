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

const sessionInvalidationListeners = new Set();

/** @type {import('bun:sqlite').Database | null} */
let db = null;

function requireDb() {
  if (!db) {
    throw new Error('Auth store has not been initialized');
  }
  return db;
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

function mapSession(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    tokenHash: row.token_hash,
    userId: row.user_id,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

function countUsers() {
  return requireDb().query('SELECT COUNT(*) AS total FROM users').get().total;
}

function insertUser(username, passwordHash, passwordSalt, timestamp) {
  return requireDb()
    .query(
      `INSERT INTO users (username, password_hash, password_salt, created_at, updated_at, last_login_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(username, passwordHash, passwordSalt, timestamp, timestamp, timestamp);
}

function findUserByUsername(username) {
  return mapUser(requireDb().query('SELECT * FROM users WHERE username = ?').get(username));
}

function findUserById(id) {
  return mapUser(requireDb().query('SELECT * FROM users WHERE id = ?').get(id));
}

function touchUserLogin(id, timestamp) {
  requireDb()
    .query('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .run(timestamp, timestamp, id);
}

function findSessionsByUserId(userId) {
  return requireDb()
    .query('SELECT * FROM auth_sessions WHERE user_id = ?')
    .all(userId)
    .map(mapSession);
}

function deleteSessionsByUserId(userId) {
  requireDb().query('DELETE FROM auth_sessions WHERE user_id = ?').run(userId);
}

function insertSession(tokenHash, userId, timestamp) {
  requireDb()
    .query(
      `INSERT INTO auth_sessions (token_hash, user_id, created_at, last_seen_at)
       VALUES (?, ?, ?, ?)`,
    )
    .run(tokenHash, userId, timestamp, timestamp);
}

function findSessionByTokenHash(tokenHash) {
  return mapSession(
    requireDb().query('SELECT * FROM auth_sessions WHERE token_hash = ?').get(tokenHash),
  );
}

function touchSessionLastSeen(id, timestamp) {
  requireDb().query('UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?').run(timestamp, id);
}

function deleteSessionByTokenHash(tokenHash) {
  return requireDb().query('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash).changes;
}

function deleteSessionById(id) {
  requireDb().query('DELETE FROM auth_sessions WHERE id = ?').run(id);
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeUsername(username) {
  return typeof username === 'string' ? username.trim() : '';
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

// Rotates the single active session for a user: records the tokens that are
// being replaced so callers can notify listeners once the write has committed.
function createSessionForUser(userId, invalidated) {
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const timestamp = nowIso();
  const existingSessions = findSessionsByUserId(userId);

  deleteSessionsByUserId(userId);
  insertSession(hashToken(token), userId, timestamp);
  for (const session of existingSessions) {
    invalidated.push(session.tokenHash);
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

  if (db) {
    return;
  }

  db = new Database(DB_PATH, { create: true });
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username VARCHAR(80) NOT NULL UNIQUE,
      password_hash VARCHAR(160) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      updated_at VARCHAR(32) NOT NULL,
      last_login_at VARCHAR(32)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash VARCHAR(96) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL,
      created_at VARCHAR(32) NOT NULL,
      last_seen_at VARCHAR(32) NOT NULL
    )
  `);
}

export async function hasUsers() {
  return countUsers() > 0;
}

export async function registerUser(usernameInput, password) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required');
  }

  if (username.length < 3 || password.length < 6) {
    throw createHttpError(400, 'Username must be at least 3 characters, password at least 6 characters');
  }

  const invalidated = [];
  const register = requireDb().transaction(() => {
    if (countUsers() > 0) {
      throw createHttpError(403, 'User already exists. This is a single-user system.');
    }

    const timestamp = nowIso();
    const passwordParts = hashPassword(password);
    const inserted = insertUser(username, passwordParts.hash, passwordParts.salt, timestamp);
    const userId = Number(inserted.lastInsertRowid);
    const token = createSessionForUser(userId, invalidated);

    return {
      success: true,
      user: { id: userId, username },
      token,
    };
  });

  const result = register();
  for (const tokenHash of invalidated) {
    notifySessionInvalidated(tokenHash);
  }
  return result;
}

export async function loginUser(usernameInput, password) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required');
  }

  const user = findUserByUsername(username);
  if (!user || !verifyPassword(password, user)) {
    throw createHttpError(401, 'Invalid username or password');
  }

  touchUserLogin(user.id, nowIso());

  const invalidated = [];
  const token = createSessionForUser(user.id, invalidated);
  for (const tokenHash of invalidated) {
    notifySessionInvalidated(tokenHash);
  }

  return {
    success: true,
    user: toPublicUser(user),
    token,
  };
}

export async function authenticateToken(token) {
  if (!token) {
    return null;
  }

  const session = findSessionByTokenHash(hashToken(token));
  if (!session) {
    return null;
  }

  const user = findUserById(session.userId);
  if (!user) {
    deleteSessionById(session.id);
    return null;
  }

  touchSessionLastSeen(session.id, nowIso());
  return toPublicUser(user);
}

export async function logoutToken(token) {
  if (!token) {
    return false;
  }

  const tokenHash = hashToken(token);
  const removed = deleteSessionByTokenHash(tokenHash);
  if (removed > 0) {
    notifySessionInvalidated(tokenHash);
  }
  return removed > 0;
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
