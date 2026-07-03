import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import 'reflect-metadata';
import { DataSource, EntitySchema } from 'typeorm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const DEFAULT_DB_PATH = path.join(rootDir, '.cloudcli.sqlite');
const DB_PATH = process.env.CLOUDCLI_DB_PATH || DEFAULT_DB_PATH;
const TOKEN_BYTES = 32;
const PASSWORD_KEY_LENGTH = 64;

const UserEntity = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    username: {
      type: 'varchar',
      length: 80,
      unique: true,
    },
    passwordHash: {
      name: 'password_hash',
      type: 'varchar',
      length: 160,
    },
    passwordSalt: {
      name: 'password_salt',
      type: 'varchar',
      length: 64,
    },
    createdAt: {
      name: 'created_at',
      type: 'varchar',
      length: 32,
    },
    updatedAt: {
      name: 'updated_at',
      type: 'varchar',
      length: 32,
    },
    lastLoginAt: {
      name: 'last_login_at',
      type: 'varchar',
      length: 32,
      nullable: true,
    },
  },
});

const AuthSessionEntity = new EntitySchema({
  name: 'AuthSession',
  tableName: 'auth_sessions',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    tokenHash: {
      name: 'token_hash',
      type: 'varchar',
      length: 96,
      unique: true,
    },
    userId: {
      name: 'user_id',
      type: 'int',
    },
    createdAt: {
      name: 'created_at',
      type: 'varchar',
      length: 32,
    },
    lastSeenAt: {
      name: 'last_seen_at',
      type: 'varchar',
      length: 32,
    },
  },
});

const authDataSource = new DataSource({
  type: 'better-sqlite3',
  database: DB_PATH,
  synchronize: true,
  logging: false,
  entities: [UserEntity, AuthSessionEntity],
});
const sessionInvalidationListeners = new Set();

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

function readRepositories(manager = authDataSource.manager) {
  return {
    users: manager.getRepository('User'),
    sessions: manager.getRepository('AuthSession'),
  };
}

async function createSessionForUser(user, manager = authDataSource.manager) {
  const { sessions } = readRepositories(manager);
  const token = crypto.randomBytes(TOKEN_BYTES).toString('base64url');
  const timestamp = nowIso();
  const existingSessions = await sessions.find({ where: { userId: user.id } });

  await sessions.delete({ userId: user.id });
  await sessions.save({
    tokenHash: hashToken(token),
    userId: user.id,
    createdAt: timestamp,
    lastSeenAt: timestamp,
  });
  for (const session of existingSessions) {
    notifySessionInvalidated(session.tokenHash);
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

  if (!authDataSource.isInitialized) {
    await authDataSource.initialize();
  }
}

export async function hasUsers() {
  const { users } = readRepositories();
  return (await users.count()) > 0;
}

export async function registerUser(usernameInput, password) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required');
  }

  if (username.length < 3 || password.length < 6) {
    throw createHttpError(400, 'Username must be at least 3 characters, password at least 6 characters');
  }

  return authDataSource.transaction(async (manager) => {
    const { users } = readRepositories(manager);
    if ((await users.count()) > 0) {
      throw createHttpError(403, 'User already exists. This is a single-user system.');
    }

    const timestamp = nowIso();
    const passwordParts = hashPassword(password);
    const user = await users.save({
      username,
      passwordHash: passwordParts.hash,
      passwordSalt: passwordParts.salt,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLoginAt: timestamp,
    });
    const token = await createSessionForUser(user, manager);

    return {
      success: true,
      user: toPublicUser(user),
      token,
    };
  });
}

export async function loginUser(usernameInput, password) {
  const username = normalizeUsername(usernameInput);
  if (!username || !password) {
    throw createHttpError(400, 'Username and password are required');
  }

  const { users } = readRepositories();
  const user = await users.findOneBy({ username });
  if (!user || !verifyPassword(password, user)) {
    throw createHttpError(401, 'Invalid username or password');
  }

  user.lastLoginAt = nowIso();
  user.updatedAt = user.lastLoginAt;
  await users.save(user);

  return {
    success: true,
    user: toPublicUser(user),
    token: await createSessionForUser(user),
  };
}

export async function authenticateToken(token) {
  if (!token) {
    return null;
  }

  const { users, sessions } = readRepositories();
  const session = await sessions.findOneBy({ tokenHash: hashToken(token) });
  if (!session) {
    return null;
  }

  const user = await users.findOneBy({ id: session.userId });
  if (!user) {
    await sessions.delete({ id: session.id });
    return null;
  }

  session.lastSeenAt = nowIso();
  await sessions.save(session);
  return toPublicUser(user);
}

export async function logoutToken(token) {
  if (!token) {
    return false;
  }

  const { sessions } = readRepositories();
  const tokenHash = hashToken(token);
  const result = await sessions.delete({ tokenHash });
  if (result.affected > 0) {
    notifySessionInvalidated(tokenHash);
  }
  return result.affected > 0;
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
