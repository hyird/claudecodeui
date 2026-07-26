export const TERMINAL_EVENT_REPLAY_LIMIT = 5000;
// The replay log exists only to bridge a short reconnect, so it is capped by payload
// bytes as well as by entry count. Without a byte cap a single burst of large chunks
// (`cat` on a big file) pins ~limit * chunkSize in memory per session — hundreds of MB
// for 5000 x 64 KB. Dropping the oldest entries past the cap only costs a reconnect the
// incremental replay: getTerminalReplayPlan falls back to the serialized screen snapshot.
export const TERMINAL_EVENT_REPLAY_BYTE_LIMIT = 2 * 1024 * 1024;
// Rough per-entry bookkeeping cost (object header + seq + type) so a flood of tiny
// chunks is still bounded by the byte budget rather than only by the entry count.
const EVENT_OVERHEAD_BYTES = 64;
// Dropped entries are left in place and skipped via `start`; the backing array is only
// compacted once the dead prefix is both large enough to matter and at least half the
// array, which keeps trimming O(1) amortized instead of O(n) per recorded event.
const COMPACT_MIN_DROPPED = 1024;

function eventBytes(event) {
  return typeof event.data === 'string'
    ? event.data.length + EVENT_OVERHEAD_BYTES
    : EVENT_OVERHEAD_BYTES;
}

export function createTerminalEventLog(
  limit = TERMINAL_EVENT_REPLAY_LIMIT,
  byteLimit = TERMINAL_EVENT_REPLAY_BYTE_LIMIT,
) {
  return {
    lastSeq: 0,
    limit,
    byteLimit,
    // Live entries are buffer[start..]. `events` materializes that window for callers.
    buffer: [],
    start: 0,
    bytes: 0,
    get events() {
      return this.start === 0 ? this.buffer : this.buffer.slice(this.start);
    },
  };
}

function dropOldestEvent(log) {
  log.bytes -= eventBytes(log.buffer[log.start]);
  // Release the reference so a dropped chunk is collectable before compaction runs.
  log.buffer[log.start] = undefined;
  log.start += 1;
}

export function recordTerminalEvent(log, event) {
  log.lastSeq += 1;
  const sequencedEvent = {
    ...event,
    seq: log.lastSeq,
  };
  log.buffer.push(sequencedEvent);
  log.bytes += eventBytes(sequencedEvent);

  while (
    log.buffer.length - log.start > log.limit
    || (log.bytes > log.byteLimit && log.buffer.length - log.start > 1)
  ) {
    dropOldestEvent(log);
  }

  if (log.start >= COMPACT_MIN_DROPPED && log.start * 2 >= log.buffer.length) {
    log.buffer = log.buffer.slice(log.start);
    log.start = 0;
  }

  return sequencedEvent;
}

export function getTerminalReplayPlan(log, lastSeq) {
  const normalizedLastSeq = Number.isFinite(lastSeq) ? Math.max(0, Math.floor(lastSeq)) : 0;
  const lastAvailableSeq = log.lastSeq;

  if (normalizedLastSeq <= 0) {
    return { mode: 'reset', gap: false, lastSeq: lastAvailableSeq, events: [] };
  }

  if (normalizedLastSeq > lastAvailableSeq) {
    return { mode: 'reset', gap: true, lastSeq: lastAvailableSeq, events: [] };
  }

  const firstBufferedSeq = log.buffer[log.start]?.seq ?? lastAvailableSeq + 1;
  if (normalizedLastSeq + 1 < firstBufferedSeq) {
    return { mode: 'reset', gap: true, lastSeq: lastAvailableSeq, events: [] };
  }

  const events = [];
  for (let index = log.start; index < log.buffer.length; index += 1) {
    if (log.buffer[index].seq > normalizedLastSeq) {
      events.push(log.buffer[index]);
    }
  }

  return {
    mode: 'replay',
    gap: false,
    lastSeq: lastAvailableSeq,
    events,
  };
}
