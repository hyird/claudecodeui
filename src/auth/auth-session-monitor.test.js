import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('./AuthGate.tsx', import.meta.url), 'utf8');

test('authenticated sessions are monitored without a fixed polling interval', () => {
  assert.equal(source.includes('AUTH_SESSION_RECHECK_INTERVAL_MS'), false);
  assert.equal(source.includes('setInterval'), false);
  // The session is watched over a websocket rather than polled.
  assert.match(source, /openAuthenticatedSocket\('\/auth\/session'/);
  assert.match(source, /session-invalidated/);
});

test('initial authentication retries transient failures without deleting a valid token', () => {
  assert.match(source, /AUTH_BOOTSTRAP_RETRY_DELAYS_MS/);
  assert.match(
    source,
    /catch \(error\) \{\s*if \(isAuthExpiredError\(error\)\) \{\s*clearStoredTokenIfCurrent\(storedToken\);\s*\} else \{\s*throw error;/,
  );
  assert.match(source, /const retryDelay = AUTH_BOOTSTRAP_RETRY_DELAYS_MS\[attempt\]/);
  assert.match(source, /window\.setTimeout\(\(\) => \{\s*void loadAuthState\(attempt \+ 1\)/);
});
