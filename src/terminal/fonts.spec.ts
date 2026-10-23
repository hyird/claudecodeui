import { expect, test } from 'vitest';
import { loadTerminalFonts } from './fonts';

test('font initialization waits for regular and bold metrics before opening the app', async () => {
  const pending: Array<() => void> = [];
  const requested: string[][] = [];
  const fonts = { load(...args: string[]) {
    requested.push(args);
    return new Promise<void>((resolve) => pending.push(resolve));
  } } as unknown as FontFaceSet;
  let ready = false;
  const loading = loadTerminalFonts(fonts).then(() => { ready = true; });
  expect(requested).toEqual([['14px "Maple Mono NF CN"', 'W'], ['bold 14px "Maple Mono NF CN"', 'W']]);
  pending[0]();
  await Promise.resolve();
  expect(ready).toBe(false);
  pending[1]();
  await loading;
  expect(ready).toBe(true);
});

test('an unavailable web font does not prevent the app from opening', async () => {
  await expect(loadTerminalFonts(undefined)).resolves.toBeUndefined();
  await expect(loadTerminalFonts({ load: () => Promise.reject(new Error('offline')) } as unknown as FontFaceSet))
    .resolves.toBeUndefined();
});
