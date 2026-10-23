import { serve } from '@hono/node-server';
import { WebSocketServer } from 'ws';

// Keep the terminal protocol independent of the HTTP runtime. ws queues sends
// instead of returning a byte count, so expose the delivery/backlog contract
// used by terminal-output and notify it when queued writes have drained.
function terminalSocket(socket, data, handlers) {
  const peer = {
    data,
    get readyState() { return socket.readyState; },
    getBufferedAmount: () => socket.bufferedAmount,
    send(payload) {
      if (socket.readyState !== socket.OPEN) return 0;
      socket.send(payload, { binary: typeof payload !== 'string' }, (error) => {
        if (error) socket.terminate();
        else if (socket.bufferedAmount === 0) handlers.drain(peer);
      });
      return Buffer.byteLength(payload) || 1;
    },
    close: (code, reason) => socket.close(code, reason),
  };
  socket.on('message', (payload) => handlers.message(peer, payload));
  socket.on('close', () => handlers.close(peer));
  socket.on('error', () => socket.terminate());
  handlers.open(peer);
}

export function serveGateway(gateway, { port, hostname } = {}) {
  const server = serve({
    port,
    hostname,
    fetch: (request) => gateway.fetch(request, { upgrade: () => false }),
  });
  const sockets = new WebSocketServer({
    noServer: true,
    perMessageDeflate: false,
    handleProtocols: (protocols) => protocols.has('cloudcli.v1') ? 'cloudcli.v1' : false,
  });
  server.on('upgrade', async (incoming, socket, head) => {
    socket.on('error', () => {});
    try {
      const request = new Request(new URL(incoming.url, `http://${incoming.headers.host}`), {
        headers: new Headers(incoming.headers),
      });
      const response = await gateway.fetch(request, {
        upgrade(_request, { data }) {
          if (socket.destroyed) return false;
          sockets.handleUpgrade(incoming, socket, head, (ws) => terminalSocket(ws, data, gateway.websocket));
          return true;
        },
      });
      if (response && !socket.destroyed) {
        const body = Buffer.from(await response.arrayBuffer());
        socket.end(`HTTP/1.1 ${response.status} ${response.statusText || 'Rejected'}\r\nConnection: close\r\nContent-Length: ${body.length}\r\n\r\n${body}`);
      }
    } catch {
      if (!socket.destroyed) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    }
  });
  return server;
}
