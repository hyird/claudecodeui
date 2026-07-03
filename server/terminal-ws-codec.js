import { deflateSync } from 'node:zlib';

export const TERMINAL_OUTPUT_TEXT = 1;
export const TERMINAL_OUTPUT_COMPRESSED = 2;

const frameHeaderSize = 1;

export function encodeTerminalOutputFrame(output) {
  const textPayload = Buffer.from(String(output), 'utf8');
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
  ws.send(encodeTerminalOutputFrame(output), { binary: true });
}
