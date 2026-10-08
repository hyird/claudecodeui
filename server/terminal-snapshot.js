import terminalPolicy from '../shared/terminal-policy.json' with { type: 'json' };

export const TERMINAL_SCROLLBACK_LINES = terminalPolicy.scrollbackLines;

export function serializeTerminalSnapshot(terminal, serializer, mouseMode = '') {
  let history = Math.min(TERMINAL_SCROLLBACK_LINES, terminal.buffer.normal.baseY);
  const serialize = () => serializer.serialize({ scrollback: history }) + mouseMode;
  let snapshot = serialize();
  if (Buffer.byteLength(snapshot) <= terminalPolicy.snapshotMaxBytes) return snapshot;

  const screenBytes = Buffer.byteLength(serializer.serialize({ scrollback: 0 }) + mouseMode);
  // Drop complete old rows rather than truncating UTF-8 or terminal escape state.
  // Preserve the current screen even if an unusually complex viewport alone
  // exceeds the historical byte budget.
  while (history > 0 && Buffer.byteLength(snapshot) > terminalPolicy.snapshotMaxBytes) {
    const available = Math.max(0, terminalPolicy.snapshotMaxBytes - screenBytes);
    const historical = Math.max(1, Buffer.byteLength(snapshot) - screenBytes);
    history = Math.floor(history * Math.min(0.8, available / historical));
    snapshot = serialize();
  }
  return snapshot;
}
