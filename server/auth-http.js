import {
  authenticateToken, createCollaborator, hasUsers, listUsers, loginUser, logoutToken,
  readBearerToken, registerUser, removeCollaborator, toAuthErrorResponse,
} from './auth-store.js';
import { readString } from './terminal-validation.js';

async function readJsonBody(c) {
  const contentType = c.req.header('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return {};
  }

  try {
    return await c.req.json();
  } catch {
    return {};
  }
}

function readRequestToken(c) {
  return readBearerToken(c.req.header('authorization')) || readString(c.req.query('token'));
}

async function requireAuth(c, next) {
  const token = readRequestToken(c);
  if (!token) {
    return c.json({ error: 'Access denied. No token provided.' }, 401);
  }

  const user = await authenticateToken(token);
  if (!user) {
    return c.json({ error: 'Invalid token' }, 403);
  }

  c.set('user', user);
  c.set('authToken', token);
  await next();
}

export function registerAuthRoutes(app, { closeUserWorkspace }) {
  app.get('/api/auth/status', async (c) => c.json({
    needsSetup: !(await hasUsers()),
    isAuthenticated: false,
  }));

  app.post('/api/auth/register', async (c) => {
    try {
      const body = await readJsonBody(c);
      return c.json(await registerUser(body.username, body.password));
    } catch (error) {
      const response = toAuthErrorResponse(error);
      console.error('Registration error:', error);
      return c.json(response.body, response.status);
    }
  });

  app.post('/api/auth/login', async (c) => {
    try {
      const body = await readJsonBody(c);
      return c.json(await loginUser(body.username, body.password));
    } catch (error) {
      const response = toAuthErrorResponse(error);
      if (response.status >= 500) {
        console.error('Login error:', error);
      }
      return c.json(response.body, response.status);
    }
  });

  app.get('/api/auth/user', requireAuth, (c) => c.json({
    user: c.get('user'),
  }));

  app.post('/api/auth/logout', requireAuth, async (c) => {
    await logoutToken(c.get('authToken'));
    return c.json({ success: true, message: 'Logged out successfully' });
  });

  app.get('/api/auth/users', requireAuth, async (c) => {
    try {
      return c.json({ users: await listUsers(c.get('user')) });
    } catch (error) {
      const response = toAuthErrorResponse(error);
      return c.json(response.body, response.status);
    }
  });

  app.post('/api/auth/users', requireAuth, async (c) => {
    try {
      const body = await readJsonBody(c);
      return c.json({ user: await createCollaborator(c.get('user'), body.username, body.password) }, 201);
    } catch (error) {
      const response = toAuthErrorResponse(error);
      return c.json(response.body, response.status);
    }
  });

  app.delete('/api/auth/users/:userId', requireAuth, async (c) => {
    try {
      const userId = Number(c.req.param('userId'));
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        return c.json({ error: 'Invalid user id' }, 400);
      }
      await removeCollaborator(c.get('user'), userId);
      closeUserWorkspace(userId);
      return c.json({ success: true });
    } catch (error) {
      const response = toAuthErrorResponse(error);
      return c.json(response.body, response.status);
    }
  });
}
