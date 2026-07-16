import type { Terminal } from '@xterm/xterm';

type SelectionTerminal = Pick<Terminal, 'getSelection' | 'hasSelection'>;
type PasteTerminal = Pick<Terminal, 'focus' | 'paste'>;

function isModifiedKeyShortcut(event: KeyboardEvent, key: string) {
  return event.type === 'keydown'
    && event.key.toLowerCase() === key
    && (event.ctrlKey || event.metaKey)
    && !event.altKey;
}

export function isPasteShortcut(event: KeyboardEvent) {
  return isModifiedKeyShortcut(event, 'v');
}

export function isCopyShortcut(event: KeyboardEvent) {
  return isModifiedKeyShortcut(event, 'c');
}

export function pasteTerminalText(terminal: PasteTerminal, text: string) {
  if (!text) {
    return false;
  }

  terminal.focus();
  terminal.paste(text);
  return true;
}

export function pasteTerminalClipboard(terminal: PasteTerminal, event: KeyboardEvent) {
  if (!isPasteShortcut(event) || !navigator.clipboard?.readText) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  void navigator.clipboard.readText()
    .then((text) => pasteTerminalText(terminal, text))
    .catch(() => undefined);
  return true;
}

export function copyTerminalSelection(
  terminal: SelectionTerminal,
  event: ClipboardEvent | KeyboardEvent,
) {
  if (!terminal.hasSelection()) {
    return false;
  }

  const selection = terminal.getSelection();
  if (!selection) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();

  if ('clipboardData' in event && event.clipboardData) {
    event.clipboardData.setData('text/plain', selection);
    return true;
  }

  if (navigator.clipboard) {
    void navigator.clipboard.writeText(selection).catch(() => undefined);
  }
  return true;
}
