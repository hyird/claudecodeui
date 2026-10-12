import net from 'node:net';

// Private JSON stream over a mode-0600 Unix socket. JSON escapes terminal
// newlines; the stream decoder preserves UTF-8 split across network chunks.
export function readPtyMessages(socket, onMessage, onError = () => socket.destroy()) {
  // Parts of an unfinished line; joined once when its newline arrives.
  const partial = [];
  let partialLength = 0;
  socket.setEncoding('utf8');
  socket.on('data', (chunk) => {
    let start = 0;
    let end;
    while ((end = chunk.indexOf('\n', start)) >= 0) {
      let line = chunk.slice(start, end);
      if (partialLength > 0) {
        partial.push(line);
        line = partial.join('');
        partial.length = 0;
        partialLength = 0;
      }
      start = end + 1;
      try { onMessage(JSON.parse(line)); } catch (error) { onError(error); return; }
    }
    if (start < chunk.length) {
      partial.push(start === 0 ? chunk : chunk.slice(start));
      partialLength += chunk.length - start;
      if (partialLength > 64 * 1024 * 1024) onError(new Error('PTY message too large'));
    }
  });
}

export function sendPtyMessage(socket, message) {
  if (socket.destroyed) return;
  if (socket.writableLength > 64 * 1024 * 1024) { socket.destroy(); return; }
  socket.write(`${JSON.stringify(message)}\n`);
}

export function requestPtyBroker(socketPath, message) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('PTY service timed out')); }, 5000);
    socket.once('connect', () => sendPtyMessage(socket, message));
    socket.on('error', reject);
    socket.once('close', () => { clearTimeout(timer); reject(new Error('PTY service disconnected')); });
    readPtyMessages(socket, (reply) => {
      clearTimeout(timer);
      if (reply.error) reject(new Error(reply.error)); else resolve(reply);
      socket.end();
    }, (error) => { socket.destroy(); reject(error); });
  });
}
