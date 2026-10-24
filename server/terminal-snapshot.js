import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { UnicodeGraphemesAddon } from './unicode.js';
import terminalPolicy from '../shared/terminal-policy.json' with { type: 'json' };

export const TERMINAL_SCROLLBACK_LINES = terminalPolicy.scrollbackLines;

// Both the PTY owner and the web mirror must use the same parser and saved modes.
export function createTerminalSnapshot(cols, rows) {
  const terminal = new headlessXterm.Terminal({
    allowProposedApi: true, cols, rows, scrollback: TERMINAL_SCROLLBACK_LINES,
  });
  const serializer = new SerializeAddon();
  terminal.loadAddon(new UnicodeGraphemesAddon());
  terminal.loadAddon(serializer);

  // SerializeAddon saves tracking modes, but not the SGR mouse encoding.
  const mouseEncoding = { mode: '' };
  for (const [final, enabled] of [['h', true], ['l', false]]) {
    terminal.parser.registerCsiHandler({ prefix: '?', final }, (params) => {
      for (const mode of params) {
        if (mode === 1006 || mode === 1016) mouseEncoding.mode = enabled ? `\x1b[?${mode}h` : '';
      }
      return false;
    });
  }
  terminal.parser.registerEscHandler({ final: 'c' }, () => {
    mouseEncoding.mode = '';
    return false;
  });
  return { terminal, serializer, mouseEncoding };
}

export function serializeTerminalSnapshot(terminal, serializer, mouseMode = '') {
  const budget = terminalPolicy.snapshotMaxBytes;
  let history = Math.min(TERMINAL_SCROLLBACK_LINES, terminal.buffer.normal.baseY);
  const serialize = () => serializer.serialize({ scrollback: history }) + mouseMode;
  let snapshot = serialize();
  let bytes = Buffer.byteLength(snapshot);
  if (bytes <= budget) return snapshot;

  const screenBytes = Buffer.byteLength(serializer.serialize({ scrollback: 0 }) + mouseMode);
  const available = Math.max(0, budget - screenBytes);
  // Drop complete old rows rather than truncating UTF-8 or terminal escape state.
  // Preserve the current screen even if an unusually complex viewport alone
  // exceeds the historical byte budget. Each pass sizes the history from the
  // measured bytes per retained row with headroom for denser recent rows, so the
  // first trim normally fits and a second one covers skewed row sizes.
  while (history > 0 && bytes > budget) {
    const bytesPerRow = Math.max(1, bytes - screenBytes) / history;
    history = Math.max(0, Math.min(history - 1, Math.floor((available / bytesPerRow) * 0.9)));
    snapshot = serialize();
    bytes = Buffer.byteLength(snapshot);
  }
  return snapshot;
}
