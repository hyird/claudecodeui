import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const source = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');

test('terminal title sync strips volatile spinner prefixes', () => {
  assert.match(source, /SPINNER_TITLE_PREFIX/);
  assert.match(source, /\\u2800-\\u28ff/);
  assert.match(source, /\.replace\(SPINNER_TITLE_PREFIX,\s*''\)/);
});

test('server-sent tab titles are normalized with the terminal title cleaner', () => {
  assert.match(source, /title:\s*cleanTerminalTitle\(tab\.title\)/);
});

test('terminal title patches are debounced before hitting the API', () => {
  assert.match(source, /TITLE_SYNC_DELAY_MS/);
  assert.match(source, /titleSyncTimersRef/);
  assert.match(source, /window\.clearTimeout\(existingTimer\)/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /sendTabsMutation\(`\/api\/terminal\/tabs\/\$\{encodeURIComponent\(tabId\)\}`/);
});
