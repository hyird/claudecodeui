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

test('terminal title updates use leading and trailing websocket sync', () => {
  assert.match(source, /TITLE_SYNC_DELAY_MS/);
  assert.match(source, /titleSyncTimersRef/);
  assert.match(source, /if \(existingTimer\) \{[\s\S]*?return;/);
  assert.match(source, /sendTabsCommand\(\{ type: 'update-title', tabId, title \}\);/);
  assert.match(source, /window\.setTimeout/);
  assert.match(source, /title: pendingTitle/);
  assert.equal(source.includes("method: 'PATCH'"), false);
});

test('pending titles survive stale broadcasts and flush before page teardown', () => {
  assert.match(source, /if \(pendingTitle === tab\.title\)/);
  assert.match(source, /return \{ \.\.\.tab, title: pendingTitle \}/);
  assert.match(source, /window\.addEventListener\('pagehide', flushPendingTitles\)/);
  assert.match(source, /Object\.entries\(pendingTitlesRef\.current\)/);
  assert.match(source, /window\.removeEventListener\('pagehide', flushPendingTitles\)/);
});
