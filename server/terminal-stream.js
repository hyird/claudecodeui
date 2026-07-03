export const TERMINAL_EVENT_REPLAY_LIMIT = 5000;

export function createTerminalEventLog(limit = TERMINAL_EVENT_REPLAY_LIMIT) {
  return {
    lastSeq: 0,
    events: [],
    limit,
  };
}

export function recordTerminalEvent(log, event) {
  log.lastSeq += 1;
  const sequencedEvent = {
    ...event,
    seq: log.lastSeq,
  };
  log.events.push(sequencedEvent);

  if (log.events.length > log.limit) {
    log.events.splice(0, log.events.length - log.limit);
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

  const firstBufferedSeq = log.events[0]?.seq ?? lastAvailableSeq + 1;
  if (normalizedLastSeq + 1 < firstBufferedSeq) {
    return { mode: 'reset', gap: true, lastSeq: lastAvailableSeq, events: [] };
  }

  return {
    mode: 'replay',
    gap: false,
    lastSeq: lastAvailableSeq,
    events: log.events.filter((event) => event.seq > normalizedLastSeq),
  };
}
