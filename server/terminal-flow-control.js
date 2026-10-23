import policy from '../shared/terminal-policy.json' with { type: 'json' };

export const OUTPUT_HIGH_WATER = policy.outputHighWaterBytes;
export const OUTPUT_LOW_WATER = policy.outputLowWaterBytes;

// A slow consumer and the history parser may both pause the same producer.
// Resume only after every consumer has drained below its low-water mark.
export function createPtyFlowControl(pty) {
  const reasons = new Set();
  let disposed = false;
  return {
    setPaused(reason, paused) {
      if (disposed) return;
      const wasPaused = reasons.size > 0;
      if (paused) reasons.add(reason); else reasons.delete(reason);
      const isPaused = reasons.size > 0;
      if (wasPaused !== isPaused) {
        if (isPaused) pty.pause(); else pty.resume();
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const wasPaused = reasons.size > 0;
      reasons.clear();
      if (wasPaused) pty.resume();
    },
  };
}

// Track only bytes actually sent to this viewer. Acknowledgements are cumulative
// output sequence numbers emitted after xterm's write callback, not on receipt.
export function createViewerFlowControl(producer) {
  const reason = {};
  let frames = [];
  let head = 0;
  let pendingBytes = 0;
  let lastSentSeq = 0;
  let lastAckSeq = -1;
  let disposed = false;
  return {
    record(seq, bytes) {
      if (disposed || bytes <= 0) return;
      frames.push({ seq, bytes });
      lastSentSeq = Math.max(lastSentSeq, seq);
      pendingBytes += bytes;
      if (pendingBytes >= OUTPUT_HIGH_WATER) producer.setPaused(reason, true);
    },
    acknowledge(seq) {
      if (disposed || !Number.isSafeInteger(seq) || seq < 0 || seq > lastSentSeq) return false;
      if (seq <= lastAckSeq) return true;
      lastAckSeq = seq;
      while (head < frames.length && frames[head].seq <= seq) pendingBytes -= frames[head++].bytes;
      if (head === frames.length) { frames = []; head = 0; }
      else if (head > 1024) { frames = frames.slice(head); head = 0; }
      if (pendingBytes <= OUTPUT_LOW_WATER) producer.setPaused(reason, false);
      return true;
    },
    get pendingBytes() { return pendingBytes; },
    dispose() {
      disposed = true;
      frames = [];
      pendingBytes = 0;
      producer.setPaused(reason, false);
    },
  };
}
