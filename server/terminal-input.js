import { UUID_V4_PATTERN } from './terminal-validation.js';

// Native and persistent PTYs share the same input receipt semantics. Record a
// sequence only after the write succeeds so retrying it cannot lose a command.
export function writeTerminalInput(pty, streams, { data, streamId, inputSeq }) {
  if (typeof data !== 'string' || !UUID_V4_PATTERN.test(streamId)
    || !Number.isSafeInteger(inputSeq) || inputSeq <= 0) {
    throw new Error('Invalid terminal input');
  }
  const last = streams.get(streamId) ?? 0;
  if (inputSeq > last + 1) throw new Error('Terminal input sequence gap');
  if (inputSeq === last + 1) {
    pty.write(data);
    streams.clear();
    streams.set(streamId, inputSeq);
  }
  return Math.max(inputSeq, last);
}
