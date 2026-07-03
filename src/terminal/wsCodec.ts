import type { TerminalServerMessage } from './types';

export const TERMINAL_OUTPUT_TEXT = 1;
export const TERMINAL_OUTPUT_COMPRESSED = 2;

type DecompressionStreamConstructor = new (
  format: 'deflate'
) => TransformStream<Uint8Array, Uint8Array>;

const textDecoder = new TextDecoder();

function parseJsonMessage(raw: string): TerminalServerMessage | null {
  try {
    return JSON.parse(raw) as TerminalServerMessage;
  } catch {
    return null;
  }
}

async function toBytes(raw: MessageEvent['data']) {
  if (raw instanceof ArrayBuffer) {
    return new Uint8Array(raw);
  }

  if (raw instanceof Blob) {
    return new Uint8Array(await raw.arrayBuffer());
  }

  return null;
}

async function inflateDeflate(payload: Uint8Array) {
  const DecompressionStreamCtor = (
    globalThis as typeof globalThis & {
      DecompressionStream?: DecompressionStreamConstructor;
    }
  ).DecompressionStream;

  if (!DecompressionStreamCtor) {
    throw new Error('Compressed terminal output requires DecompressionStream support');
  }

  const payloadCopy = new Uint8Array(payload.byteLength);
  payloadCopy.set(payload);
  const stream = new Blob([payloadCopy.buffer]).stream().pipeThrough(new DecompressionStreamCtor('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decodeBinaryOutput(raw: MessageEvent['data']): Promise<TerminalServerMessage | null> {
  const bytes = await toBytes(raw);
  if (!bytes || bytes.length === 0) {
    return null;
  }

  const frameType = bytes[0];
  const payload = bytes.subarray(1);

  if (frameType === TERMINAL_OUTPUT_TEXT) {
    return { type: 'output', data: textDecoder.decode(payload) };
  }

  if (frameType === TERMINAL_OUTPUT_COMPRESSED) {
    try {
      return { type: 'output', data: textDecoder.decode(await inflateDeflate(payload)) };
    } catch {
      return { type: 'error', message: 'Unable to decode compressed terminal output' };
    }
  }

  return null;
}

export async function decodeTerminalServerMessage(
  raw: MessageEvent['data']
): Promise<TerminalServerMessage | null> {
  if (typeof raw === 'string') {
    return parseJsonMessage(raw);
  }

  return decodeBinaryOutput(raw);
}
