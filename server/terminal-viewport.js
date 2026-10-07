// Keep at most one running operation and one latest scroll destination. A fast
// drag must not leave a queue of obsolete positions to play after release.
export function createTerminalViewportController({ backend, sessionId, isAttached, send }) {
  let running = false;
  let pending = null;
  async function drain() {
    if (running) return;
    running = true;
    try {
      while (pending && isAttached()) {
        const request = pending;
        pending = null;
        try {
          const viewport = request.type === 'scroll'
            ? await backend.scroll(sessionId, request.offset)
            : await backend.viewport(sessionId);
          if (isAttached()) send({ type: 'viewport', persistent: !!viewport,
            historyLines: viewport?.historyLines ?? 0, offset: viewport?.offset ?? 0,
            rows: viewport?.rows ?? 1, requestId: request.requestId ?? 0 });
        } catch {
          if (isAttached()) send({ type: 'viewport', persistent: false, requestId: request.requestId ?? 0 });
        }
      }
    } finally {
      pending = null;
      running = false;
    }
  }
  return (request) => {
    if (request.type === 'scroll' || pending?.type !== 'scroll') pending = request;
    void drain();
  };
}
