import terminalPolicy from '../shared/terminal-policy.json' with { type: 'json' };

export const TERMINAL_SCROLLBACK_LINES = terminalPolicy.scrollbackLines;

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
