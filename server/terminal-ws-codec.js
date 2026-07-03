import { deflateSync } from 'node:zlib';

export const TERMINAL_OUTPUT_TEXT = 1;
export const TERMINAL_OUTPUT_COMPRESSED = 2;
export const DISABLE_MOUSE_TRACKING = '\x1b[?9;1000;1002;1003;1005;1006;1015l';

const frameHeaderSize = 1;
const osc52Prefix = '\x1b]52;';
const osc52PrefixTailLength = osc52Prefix.length - 1;
const privateCsiPrefix = '\x1b[?';
const privateCsiPrefixTailLength = privateCsiPrefix.length - 1;
const mouseTrackingModeCodes = new Set(['9', '1000', '1002', '1003', '1005', '1006', '1015']);
const outputSanitizers = new WeakMap();

function createOutputSanitizer() {
  return {
    inOsc52: false,
    pendingMouseCsi: '',
    pendingPrefix: '',
    pendingTerminatorEsc: false,
  };
}

function findTrailingOsc52PrefixCandidate(text) {
  const maxLength = Math.min(text.length, osc52PrefixTailLength);

  for (let length = maxLength; length > 0; length -= 1) {
    const tail = text.slice(-length);

    if (osc52Prefix.startsWith(tail)) {
      return tail;
    }
  }

  return '';
}

function findTrailingPrivateCsiPrefixCandidate(text) {
  const maxLength = Math.min(text.length, privateCsiPrefixTailLength);

  for (let length = maxLength; length > 0; length -= 1) {
    const tail = text.slice(-length);

    if (privateCsiPrefix.startsWith(tail)) {
      return tail;
    }
  }

  return '';
}

function isCsiFinalByte(char) {
  const code = char.charCodeAt(0);
  return code >= 0x40 && code <= 0x7e;
}

function containsMouseTrackingMode(params) {
  return params.split(';').some((param) => mouseTrackingModeCodes.has(param));
}

function stripMouseTrackingEnables(output, state) {
  const text = state ? state.pendingMouseCsi + String(output) : String(output);
  let result = '';
  let index = 0;

  if (state) {
    state.pendingMouseCsi = '';
  }

  while (index < text.length) {
    const csiStart = text.indexOf(privateCsiPrefix, index);

    if (csiStart === -1) {
      const remainder = text.slice(index);

      if (state) {
        const pendingPrefix = findTrailingPrivateCsiPrefixCandidate(remainder);

        if (pendingPrefix) {
          result += remainder.slice(0, -pendingPrefix.length);
          state.pendingMouseCsi = pendingPrefix;
        } else {
          result += remainder;
        }
      } else {
        result += remainder;
      }

      break;
    }

    result += text.slice(index, csiStart);

    let csiEnd = -1;
    for (let cursor = csiStart + privateCsiPrefix.length; cursor < text.length; cursor += 1) {
      if (isCsiFinalByte(text[cursor])) {
        csiEnd = cursor;
        break;
      }
    }

    if (csiEnd === -1) {
      if (state) {
        state.pendingMouseCsi = text.slice(csiStart);
      } else {
        result += text.slice(csiStart);
      }
      break;
    }

    const finalByte = text[csiEnd];
    const params = text.slice(csiStart + privateCsiPrefix.length, csiEnd);
    const sequence = text.slice(csiStart, csiEnd + 1);

    if (finalByte !== 'h' || !containsMouseTrackingMode(params)) {
      result += sequence;
    }

    index = csiEnd + 1;
  }

  return result;
}

function findOsc52TerminatorEnd(text, startIndex, state) {
  let index = startIndex;

  if (state.pendingTerminatorEsc) {
    state.pendingTerminatorEsc = false;
    if (text[index] === '\\') {
      return index + 1;
    }
  }

  for (; index < text.length; index += 1) {
    if (text[index] === '\x07') {
      state.pendingTerminatorEsc = false;
      return index + 1;
    }

    if (text[index] === '\x1b') {
      if (index + 1 < text.length && text[index + 1] === '\\') {
        state.pendingTerminatorEsc = false;
        return index + 2;
      }

      if (index === text.length - 1) {
        state.pendingTerminatorEsc = true;
        return -1;
      }
    }
  }

  state.pendingTerminatorEsc = false;
  return -1;
}

function stripOsc52(output, state) {
  const text = state ? state.pendingPrefix + String(output) : String(output);
  const scanState = state ?? createOutputSanitizer();
  let result = '';
  let index = 0;

  if (state) {
    state.pendingPrefix = '';
  }

  if (scanState.inOsc52) {
    const terminatorEnd = findOsc52TerminatorEnd(text, index, scanState);

    if (terminatorEnd === -1) {
      return '';
    }

    scanState.inOsc52 = false;
    index = terminatorEnd;
  }

  while (index < text.length) {
    const osc52Start = text.indexOf(osc52Prefix, index);

    if (osc52Start === -1) {
      const remainder = text.slice(index);

      if (state) {
        const pendingPrefix = findTrailingOsc52PrefixCandidate(remainder);

        if (pendingPrefix) {
          result += remainder.slice(0, -pendingPrefix.length);
          state.pendingPrefix = pendingPrefix;
        } else {
          result += remainder;
        }
      } else {
        result += remainder;
      }

      break;
    }

    result += text.slice(index, osc52Start);

    const terminatorEnd = findOsc52TerminatorEnd(
      text,
      osc52Start + osc52Prefix.length,
      scanState
    );

    if (terminatorEnd === -1) {
      scanState.inOsc52 = true;
      break;
    }

    scanState.inOsc52 = false;
    index = terminatorEnd;
  }

  return result;
}

function sanitizeTerminalOutput(output, state) {
  return stripMouseTrackingEnables(stripOsc52(output, state), state);
}

function getOutputSanitizer(ws) {
  let sanitizer = outputSanitizers.get(ws);

  if (!sanitizer) {
    sanitizer = createOutputSanitizer();
    outputSanitizers.set(ws, sanitizer);
  }

  return sanitizer;
}

export function encodeTerminalOutputFrame(output) {
  const textPayload = Buffer.from(sanitizeTerminalOutput(output), 'utf8');
  const compressedPayload = deflateSync(textPayload);
  const useCompressed = compressedPayload.length < textPayload.length;
  const frameType = useCompressed ? TERMINAL_OUTPUT_COMPRESSED : TERMINAL_OUTPUT_TEXT;
  const payload = useCompressed ? compressedPayload : textPayload;
  const frame = Buffer.allocUnsafe(frameHeaderSize + payload.length);

  frame[0] = frameType;
  payload.copy(frame, frameHeaderSize);
  return frame;
}

export function sendTerminalOutput(ws, output) {
  const sanitizedOutput = sanitizeTerminalOutput(output, getOutputSanitizer(ws));

  if (!sanitizedOutput) {
    return;
  }

  ws.send(encodeTerminalOutputFrame(sanitizedOutput), { binary: true });
}
