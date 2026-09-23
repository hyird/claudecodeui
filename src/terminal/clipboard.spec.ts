import { afterEach, expect, test } from 'bun:test';

import { copyToClipboard, readClipboardText } from './clipboard';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const originalSecureContext = Object.getOwnPropertyDescriptor(globalThis, 'isSecureContext');

afterEach(() => {
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator);
  else Reflect.deleteProperty(globalThis, 'navigator');
  if (originalSecureContext) Object.defineProperty(globalThis, 'isSecureContext', originalSecureContext);
  else Reflect.deleteProperty(globalThis, 'isSecureContext');
});

function mockDocument(copyResult: boolean) {
  const events: string[] = [];
  const textarea = {
    value: '', readOnly: false, style: { cssText: '' },
    focus: () => events.push('focus-copy'),
    select: () => events.push('select'),
    remove: () => events.push('remove'),
  };
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      activeElement: { isConnected: true, focus: () => events.push('restore-focus') },
      body: { appendChild: () => events.push('append') },
      createElement: () => textarea,
      execCommand: (command: string) => {
        events.push(command);
        return copyResult;
      },
    },
  });
  return { events, textarea };
}

test('HTTP copy uses the selected textarea synchronously during the user action', async () => {
  let asyncWriteCalled = false;
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: false });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: () => { asyncWriteCalled = true; return Promise.resolve(); } } },
  });
  const { events, textarea } = mockDocument(true);
  const copied = copyToClipboard('来自终端的内容');

  expect(asyncWriteCalled).toBe(false);
  expect(events).toEqual(['append', 'focus-copy', 'select', 'copy', 'remove', 'restore-focus']);
  expect(textarea.value).toBe('来自终端的内容');
  expect(await copied).toBe(true);
});

test('a denied async clipboard write reports failure when the fallback is blocked', async () => {
  Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: { clipboard: { writeText: () => Promise.reject(new Error('denied')) } },
  });
  const { events } = mockDocument(false);
  expect(await copyToClipboard('retry me')).toBe(false);
  expect(events).toContain('copy');
});

test('clipboard reads return empty text on an insecure origin', async () => {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
  expect(await readClipboardText()).toBe('');
});
