import { createUuidV4 } from '../uuid';

const TERMINAL_INPUT_MAX_FRAME_BYTES = 4 * 1024;
export type ReliableTerminalInputState = {
  streamId: string;
  generation: string;
  nextSeq: number;
  pending: Map<number, string>;
};

const terminalInputEncoder = new TextEncoder();
const terminalInputDecoder = new TextDecoder();
const terminalInputStates = new Map<string, ReliableTerminalInputState>();

export function discardTerminalInputState(tabId: string) {
  terminalInputStates.delete(tabId);
}

export function clearTerminalInputStates() {
  terminalInputStates.clear();
}

export function getTerminalInputState(tabId: string) {
  let state = terminalInputStates.get(tabId);
  if (!state) {
    state = {
      streamId: createUuidV4(),
      generation: '',
      nextSeq: 1,
      pending: new Map(),
    };
    terminalInputStates.set(tabId, state);
  }
  return state;
}

export function splitTerminalInput(data: string) {
  const bytes = terminalInputEncoder.encode(data);
  const frames: string[] = [];
  let offset = 0;

  while (offset < bytes.length) {
    let end = Math.min(offset + TERMINAL_INPUT_MAX_FRAME_BYTES, bytes.length);
    while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    frames.push(terminalInputDecoder.decode(bytes.subarray(offset, end)));
    offset = end;
  }

  return frames;
}
