import { Buffer } from 'node:buffer';

// addon-unicode-graphemes 0.4.0 reads its trie from data.buffer without honoring
// byteOffset (xterm.js #6079). Avoid a pooled Buffer during module initialization.
// The browser uses atob and already allocates an independent ArrayBuffer.
const previousPoolSize = Buffer.poolSize;
let UnicodeGraphemesAddon;
try {
  Buffer.poolSize = 0;
  ({ UnicodeGraphemesAddon } = await import('@xterm/addon-unicode-graphemes'));
} finally {
  Buffer.poolSize = previousPoolSize;
}

export { UnicodeGraphemesAddon };
