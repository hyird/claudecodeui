function copyWithSelection(text: string): boolean {
  const previousFocus = document.activeElement as HTMLElement | null;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.readOnly = true;
  textarea.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
  document.body.appendChild(textarea);

  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
    if (previousFocus?.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
  }
}

export function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (globalThis.isSecureContext !== false && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text)
        .then(() => true, () => copyWithSelection(text));
    }
  } catch {
    // Some browsers expose the API but reject access on an insecure origin.
  }
  // Run synchronously while a click or keypress still has user activation.
  return Promise.resolve(copyWithSelection(text));
}

export async function readClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard?.readText() ?? '';
  } catch {
    return '';
  }
}
