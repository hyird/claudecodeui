import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

const styles = fs.readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('auth inputs override Chromium autofill paint so filled fields keep the auth theme', () => {
  assert.match(styles, /\.auth-input-wrap input:-webkit-autofill/);
  assert.match(styles, /-webkit-text-fill-color:\s*hsl\(var\(--auth-foreground\)\)/);
  assert.match(styles, /caret-color:\s*hsl\(var\(--auth-foreground\)\)/);
  assert.match(styles, /0 0 0 1000px hsl\(var\(--auth-card\) \/ 0\.94\) inset/);
});
