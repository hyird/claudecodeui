import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { cloudcli } from '../proto/messages.js';
import { createTerminalSessions } from './terminal-sessions.js';
import { createTerminalWorkspaces } from './terminal-workspaces.js';
import {
  cancelTerminalOutputFlush, flushTerminalOutput, queueTerminalOutput, readTerminalSnapshot, resizeSession,
} from './terminal-output.js';
import { TERMINAL_PARSE_BACKLOG_LIMIT } from './terminal-snapshot.js';

// Exercise the real session and workspace factories with a real xterm parser, a
// fake PTY and in-memory tab storage. Importing the server entry would start Bun's
// HTTP listener and auth database.
const { TerminalClientMessage, TerminalServerMessage } = cloudcli;
const disabledPty = { enabled: false, sessionIds: new Set(), count: () => 0, prepare: async () => null, close: async () => {} };

function decodeServerMessage(bytes) {
  const message = TerminalServerMessage.decode(bytes);
  const seq = message.seq || undefined;
  switch (message.body) {
    case 'output': {
      const raw = Buffer.from(message.output.data);
      return { type: 'output', data: (message.output.compressed ? inflateSync(raw) : raw).toString('utf8'), seq };
    }
    case 'ready':
      return {
        type: 'ready', cwd: message.ready.cwd, sessionId: message.ready.sessionId, reset: message.ready.reset,
        gap: message.ready.gap, lastSeq: message.ready.lastSeq, sessionGeneration: message.ready.sessionGeneration, seq,
      };
    case 'exit':
      return { type: 'exit', exitCode: message.exit.exitCode, signal: message.exit.signal, seq };
    case 'error':
      return { type: 'error', message: message.error.message };
    case 'inputAck':
      return { type: 'input-ack', inputSeq: message.inputAck.inputSeq };
    case 'pong':
      return { type: 'pong' };
    default:
      throw new Error(`Unexpected server message ${message.body}`);
  }
}

function socket(workspace, kind) {
  return {
    readyState: 1, data: { workspace, kind, activeSession: null }, messages: [], getBufferedAmount: () => 0,
    send(bytes) { this.messages.push(decodeServerMessage(bytes)); },
    close(code) { this.closedCode = code; this.readyState = 3; },
  };
}

function fakePty() {
  return {
    writes: [], sizes: [],
    onData(callback) { this.emitData = callback; },
    onExit(callback) { this.emitExit = callback; },
    write(data) { this.writes.push(data); },
    resize(cols, rows) { this.sizes.push([cols, rows]); },
    kill() { this.killed = true; },
  };
}

function harness(t, { cols = 20, rows = 4, persistentPty = disabledPty } = {}) {
  const sessions = new Map();
  const ptys = [];
  const ptyOptions = [];
  const sessionId = randomUUID();
  const stored = new Map([[1, {
    tabsState: { tabs: [{ id: sessionId, title: 'Terminal' }], activeId: sessionId, nextIndex: 2 },
    exitedTabs: [],
  }]]);
  const saves = [];
  const store = {
    readTerminalWorkspace: (userId) => (stored.has(userId) ? structuredClone(stored.get(userId)) : null),
    saveTerminalWorkspace: (workspace) => {
      saves.push(workspace.userId);
      stored.set(workspace.userId, structuredClone({
        tabsState: workspace.tabsState, exitedTabs: [...workspace.exitedTabs],
      }));
    },
    deleteTerminalWorkspace: (userId) => stored.delete(userId),
  };
  let terminals;
  const workspaces = createTerminalWorkspaces({
    sessions, persistentPty, store, closeSession: (...args) => terminals.closeSession(...args),
  });
  terminals = createTerminalSessions({
    sessions, persistentPty, workspaces,
    spawnPty(_command, _args, options) {
      ptyOptions.push(options);
      const pty = fakePty();
      ptys.push(pty);
      return pty;
    },
  });
  const workspace = workspaces.workspaceFor(1);
  const send = (ws, body) => terminals.handleTerminalMessage(ws, TerminalClientMessage.encode(body).finish());
  const init = (ws, fields = {}) => send(ws, { init: {
    sessionId, inputStreamId: randomUUID(), cols, rows, ...fields,
  } });
  t.after(() => {
    for (const value of sessions.values()) {
      cancelTerminalOutputFlush(value);
      value.terminal.dispose();
    }
  });
  return { sessions, ptys, ptyOptions, sessionId, stored, saves, workspace, workspaces, terminals, send, init };
}

// Create the session through a viewer that leaves before it is ready, so tests
// start from a running PTY without an attached socket.
function setup(t, options) {
  const h = harness(t, options);
  const boot = socket(h.workspace);
  h.init(boot);
  const session = h.sessions.get(h.sessionId);
  h.terminals.detachSocket(session, boot);
  boot.readyState = 3;
  return { ...h, session, attach: (ws, lastSeq = 0, fields = {}) => h.init(ws, { lastSeq, ...fields }) };
}

const drain = (terminal) => new Promise((resolve) => terminal.write('', resolve));
const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

// Parser callbacks have run and every compressed restore has reached its socket.
async function settled(session, ...sockets) {
  await drain(session.terminal);
  while (sockets.some((ws) => ws.data.snapshotQueue)) await tick();
}

test('small live output is sent before the next timer without waiting for the history parser', async (t) => {
  const { session, attach } = setup(t);
  const ws = socket(session.workspace);
  attach(ws);
  await settled(session, ws);
  const delivered = [];
  const send = ws.send.bind(ws);
  ws.send = (bytes) => {
    const message = decodeServerMessage(bytes);
    if (message.type === 'output') delivered.push(message.data);
    send(bytes);
  };
  queueTerminalOutput(session, 'first');
  queueTerminalOutput(session, '-second');
  await new Promise((resolve) => setTimeout(() => { delivered.push('timer'); resolve(); }, 0));
  assert.deepEqual(delivered, ['first-second', 'timer']);
  await drain(session.terminal);
  assert.equal(ws.messages.filter((m) => m.data === 'first-second').length, 1);
});

test('continuous output is combined behind the 25 Hz deadline without losing order', async (t) => {
  const { session, attach } = setup(t);
  const ws = socket(session.workspace);
  attach(ws);
  await settled(session, ws);
  queueTerminalOutput(session, 'first');
  await new Promise((resolve) => setImmediate(resolve));
  queueTerminalOutput(session, '-second');
  queueTerminalOutput(session, '-third');
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(ws.messages.filter((m) => m.seq > 0).map((m) => m.data), ['first']);
  await new Promise((resolve) => setTimeout(resolve, 45));
  await drain(session.terminal);
  assert.deepEqual(ws.messages.filter((m) => m.seq > 0).map((m) => m.data), ['first', '-second-third']);
});

test('web PTYs advertise a remote clipboard route to fullscreen programs', (t) => {
  const { ptyOptions } = setup(t);
  assert.ok(ptyOptions[0].env.SSH_CLIENT);
  assert.equal(ptyOptions[0].env.TERM, 'xterm-256color');
});

test('attach snapshot includes pending parsed output at exactly the advertised sequence', async (t) => {
  const { session, attach } = setup(t);
  const ws = socket(session.workspace);
  queueTerminalOutput(session, 'before');
  attach(ws);
  queueTerminalOutput(session, '-after');
  flushTerminalOutput(session);
  assert.equal(ws.messages.length, 0, 'ready must wait for the parser');
  await settled(session, ws);

  const [ready, snapshot, live] = ws.messages;
  assert.equal(ready.type, 'ready');
  assert.equal(ready.lastSeq, 1);
  assert.equal(ready.sessionGeneration, session.generation);
  assert.equal(snapshot.data, 'before');
  assert.equal(snapshot.seq, undefined);
  assert.equal(live.data, '-after');
  assert.equal(live.seq, 2);
  assert.equal(ws.messages.length, 3);
});

test('fullscreen mouse encoding survives a reset snapshot', async (t) => {
  const { session, attach } = setup(t);
  // Pi fullscreen enables the alternate screen, mouse tracking and SGR reports.
  queueTerminalOutput(session, '\x1b[?1049h\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006hfullscreen');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(session.serializer.serialize().includes('\x1b[?1006h'), false,
    'xterm serialization does not include the mouse report encoding');

  const ws = socket(session.workspace);
  attach(ws);
  await settled(session, ws);
  const snapshot = ws.messages.slice(1).filter((message) => message.type === 'output')
    .map((message) => message.data).join('');
  assert.match(snapshot, /\x1b\[\?1006h$/);

  const restored = new headlessXterm.Terminal({ allowProposedApi: true, cols: 20, rows: 4 });
  t.after(() => restored.dispose());
  await new Promise((resolve) => restored.write('\x1bc' + snapshot, resolve));
  assert.equal(restored.buffer.active.type, 'alternate');
  assert.equal(restored.modes.mouseTrackingMode, 'any');
  assert.equal(restored._core.coreMouseService.activeEncoding, 'SGR');
  const input = [];
  restored.onData((data) => input.push(data));
  restored._core.coreMouseService.triggerMouseEvent({
    col: 0, row: 0, x: 0, y: 0, button: 4, action: 1,
    ctrl: false, alt: false, shift: false,
  });
  assert.deepEqual(input, ['\x1b[<65;1;1M']);

  queueTerminalOutput(session, '\x1b[?1006l\x1b[?1003l\x1b[?1002l\x1b[?1000l');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(readTerminalSnapshot(session).endsWith('\x1b[?1006h'), false);

  queueTerminalOutput(session, '\x1b[?1006h\x1bc');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(readTerminalSnapshot(session).endsWith('\x1b[?1006h'), false);
});

test('incremental reconnect replays pending output once before newer live frames', async (t) => {
  const { session, attach } = setup(t);
  queueTerminalOutput(session, 'one');
  flushTerminalOutput(session);
  await drain(session.terminal);
  queueTerminalOutput(session, 'two');
  const ws = socket(session.workspace);
  attach(ws, 1);
  queueTerminalOutput(session, 'three');
  flushTerminalOutput(session);
  await settled(session, ws);
  assert.equal(ws.messages[0].reset, false);
  assert.deepEqual(ws.messages.slice(1).map(({ seq, data }) => [seq, data]), [[2, 'two'], [3, 'three']]);
});

test('resize preserves old-width parsing and serializes only when a snapshot is requested', async (t) => {
  const { session, attach } = setup(t, { cols: 8, rows: 4 });
  let serializations = 0;
  const serialize = session.serializer.serialize.bind(session.serializer);
  session.serializer.serialize = (...args) => { serializations++; return serialize(...args); };
  queueTerminalOutput(session, 'abcdefghi');
  resizeSession(session, 4, 4);
  resizeSession(session, 4, 4);
  queueTerminalOutput(session, 'JK');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(serializations, 0);
  assert.deepEqual(session.pty.sizes, [[4, 4]]);

  const reference = new headlessXterm.Terminal({ allowProposedApi: true, cols: 8, rows: 4, scrollback: 1000 });
  const referenceSerializer = new SerializeAddon();
  reference.loadAddon(referenceSerializer);
  t.after(() => reference.dispose());
  await new Promise((resolve) => reference.write('abcdefghi', resolve));
  reference.resize(4, 4);
  await new Promise((resolve) => reference.write('JK', resolve));
  assert.equal(serialize(), referenceSerializer.serialize());
  const ws = socket(session.workspace);
  attach(ws, 0, { cols: 4, rows: 4 });
  await settled(session, ws);
  assert.equal(serializations, 1);
});

test('new output and resize release an obsolete serialized snapshot', async (t) => {
  const { session } = setup(t);
  queueTerminalOutput(session, 'first');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.ok(readTerminalSnapshot(session).includes('first'));

  queueTerminalOutput(session, ' second');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(session.terminalSnapshot, '');
  assert.ok(readTerminalSnapshot(session).includes('first second'));

  resizeSession(session, 12, 4);
  await drain(session.terminal);
  assert.equal(session.terminalSnapshot, '');
  assert.ok(readTerminalSnapshot(session).includes('first second'));
});

test('newer attachments and closed sessions cancel obsolete parser callbacks', async (t) => {
  const { session, attach, terminals } = setup(t);
  const first = socket(session.workspace);
  const second = socket(session.workspace);
  queueTerminalOutput(session, 'pending');
  attach(first);
  attach(second);
  await settled(session, first, second);
  assert.equal(first.readyState, 3);
  assert.equal(first.messages.length, 0);
  assert.equal(second.messages[0].type, 'ready');

  const third = socket(session.workspace);
  queueTerminalOutput(session, 'discarded');
  attach(third);
  terminals.closeSession(session.id);
  await drain(session.terminal);
  assert.equal(third.messages.length, 0);
  assert.equal(session.terminalEvents.lastSeq, 1);
});

test('process exit follows queued output and an already requested attachment', async (t) => {
  const { session, attach, sessions, stored } = setup(t);
  const ws = socket(session.workspace);
  queueTerminalOutput(session, 'final bytes');
  attach(ws);
  session.pty.emitExit({ exitCode: 0 });
  await settled(session, ws);
  assert.deepEqual(ws.messages.map((message) => message.type), ['ready', 'output', 'output', 'exit']);
  assert.equal(ws.messages[1].data, 'final bytes');
  assert.equal(ws.messages.at(-1).seq, 3);
  assert.equal(sessions.has(session.id), false);
  // The exit is persisted for the tab bar, and the scrollback copy is released.
  assert.deepEqual(stored.get(1).exitedTabs, [session.id]);
  assert.equal(session.disposed, true);
});

test('generation mismatch forces a fresh snapshot even if the old sequence is in range', async (t) => {
  const { session, attach, send } = setup(t);
  queueTerminalOutput(session, 'new shell');
  flushTerminalOutput(session);
  await drain(session.terminal);
  const ws = socket(session.workspace);
  attach(ws, 1, { sessionGeneration: randomUUID() });
  await settled(session, ws);
  assert.equal(ws.messages[0].reset, true);
  assert.equal(ws.messages[0].sessionGeneration, session.generation);
  send(ws, { input: { inputSeq: 1, data: 'new command' } });
  send(ws, { input: { inputSeq: 1, data: 'new command' } });
  assert.deepEqual(session.pty.writes, ['new command']);
});

test('a user cannot attach to a terminal from another workspace', (t) => {
  const { session, ptys, init } = setup(t);
  const otherWorkspace = {
    userId: 2,
    tabsState: { tabs: [{ id: randomUUID(), title: 'Other terminal' }], activeId: '' },
    exitedTabs: new Set(), tabSubscribers: new Set(),
  };
  const ws = socket(otherWorkspace);
  init(ws);
  assert.equal(ws.messages[0].type, 'error');
  assert.equal(ws.messages[0].message, 'Terminal is not available');
  assert.equal(ptys.length, 1);
  assert.equal(session.socket, null);
});

test('a foreign workspace cannot restart a running session even with a matching tab id', (t) => {
  const { session, ptys, init, sessions } = setup(t);
  const foreignWorkspace = {
    userId: 2,
    tabsState: { tabs: [{ id: session.id, title: 'Foreign terminal' }], activeId: session.id },
    exitedTabs: new Set(), tabSubscribers: new Set(),
  };
  const ws = socket(foreignWorkspace);
  init(ws, { forceRestart: true });
  assert.equal(ws.messages[0].message, 'Terminal is not available');
  assert.equal(sessions.get(session.id), session);
  assert.equal(ptys.length, 1);
});

test('a new input stream drops obsolete sequence histories', async (t) => {
  const { session, attach, send } = setup(t);
  const first = socket(session.workspace);
  attach(first);
  await settled(session, first);
  send(first, { input: { inputSeq: 1, data: 'a' } });

  const second = socket(session.workspace);
  attach(second);
  await settled(session, second);
  assert.equal(session.inputStreams.size, 1);
  send(second, { input: { inputSeq: 1, data: 'b' } });
  assert.deepEqual(session.pty.writes, ['a', 'b']);
});

test('removing a user closes their viewers and PTYs and releases workspace state', async (t) => {
  const { session, attach, workspaces, sessions, stored } = setup(t);
  const viewer = socket(session.workspace);
  attach(viewer);
  await settled(session, viewer);
  const tabsViewer = socket(session.workspace);
  session.workspace.tabSubscribers.add(tabsViewer);

  workspaces.closeUserWorkspace(session.workspace.userId);
  assert.equal(session.pty.killed, true);
  assert.equal(session.disposed, true);
  assert.equal(viewer.readyState, 3);
  assert.equal(tabsViewer.readyState, 3);
  assert.equal(sessions.has(session.id), false);
  assert.equal(stored.has(session.workspace.userId), false);
});

test('sustained output stays bounded, ordered and complete through parser callbacks', async (t) => {
  const { session, attach } = setup(t);
  const ws = socket(session.workspace);
  attach(ws);
  const output = 'stream line\r\n'.repeat(20000);
  queueTerminalOutput(session, output);
  flushTerminalOutput(session);
  await settled(session, ws);
  const frames = ws.messages.filter((message) => message.type === 'output' && message.seq > 0);
  assert.equal(ws.messages[0].type, 'ready');
  assert.equal(frames.map((frame) => frame.data).join(''), output);
  frames.forEach((frame, index) => {
    assert.equal(frame.seq, index + 1);
    assert.ok(Buffer.byteLength(frame.data) <= 16 * 1024);
  });
});

test('multi-byte output is split on UTF-8 boundaries and recorded with its byte size', async (t) => {
  const { session, attach } = setup(t);
  const ws = socket(session.workspace);
  ws.data.kind = 'terminal-output';
  attach(ws);
  await settled(session, ws);
  const output = '中文│'.repeat(6000);
  queueTerminalOutput(session, output);
  flushTerminalOutput(session);
  await drain(session.terminal);
  const frames = ws.messages.filter((message) => message.type === 'output' && message.seq > 0);
  assert.ok(frames.length > 1);
  assert.equal(frames.map((frame) => frame.data).join(''), output);
  for (const event of session.terminalEvents.events) {
    assert.equal(event.bytes, Buffer.byteLength(event.data));
    assert.ok(event.bytes <= 16 * 1024);
  }
});

test('a slow terminal viewer is disconnected while replay state remains available', async (t) => {
  const { session, attach } = setup(t);
  const slow = socket(session.workspace);
  attach(slow);
  await settled(session, slow);
  slow.getBufferedAmount = () => 1024 * 1024 + 1;

  queueTerminalOutput(session, 'still running');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(slow.closedCode, 1013);
  assert.equal(session.terminalEvents.lastSeq, 1);

  const resumed = socket(session.workspace);
  attach(resumed);
  await settled(session, resumed);
  assert.ok(resumed.messages.some((message) => message.type === 'output' && message.data.includes('still running')));
});

test('live output reaches a ready downlink before the headless parser and is committed once', async (t) => {
  const { session, attach } = setup(t);
  const output = socket(session.workspace);
  attach(output);
  await settled(session, output);
  queueTerminalOutput(session, 'one');
  flushTerminalOutput(session);
  queueTerminalOutput(session, 'two');
  flushTerminalOutput(session);
  assert.deepEqual(output.messages.filter((message) => message.type === 'output' && message.seq > 0).map(({ seq, data }) => [seq, data]), [[1, 'one'], [2, 'two']]);
  assert.equal(session.terminalEvents.lastSeq, 0, 'live output does not wait for snapshot parsing');
  await drain(session.terminal);
  assert.equal(session.terminalEvents.lastSeq, 2);
  assert.equal(output.messages.filter((message) => message.type === 'output' && message.seq > 0).length, 2);
});

test('a parser backlog past the watermark keeps output sequenced and catches up afterwards', async (t) => {
  const { session, attach } = setup(t);
  const ws = socket(session.workspace);
  attach(ws);
  await settled(session, ws);
  // Simulate a parser that is far behind the PTY.
  session.parseBacklogBytes = TERMINAL_PARSE_BACKLOG_LIMIT;
  queueTerminalOutput(session, 'flooded');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(session.parseOverflow, true);
  assert.equal(session.unparsedFromSeq, 1);
  assert.equal(session.serializer.serialize().includes('flooded'), false);

  // The backlog drains: the next commit replays the skipped output into the parser.
  session.parseBacklogBytes = 0;
  queueTerminalOutput(session, '-next');
  flushTerminalOutput(session);
  await drain(session.terminal);
  await drain(session.terminal);
  assert.equal(session.parseOverflow, false);
  assert.equal(session.unparsedFromSeq, 0);
  assert.ok(session.serializer.serialize().includes('flooded-next'));
  assert.deepEqual(ws.messages.filter((m) => m.seq > 0).map(({ seq, data }) => [seq, data]), [[1, 'flooded'], [2, '-next']]);
  assert.equal(session.parseBacklogBytes, 0);
});

test('a restore requested during a parser backlog includes output committed without parsing', async (t) => {
  const { session, attach } = setup(t);
  session.parseBacklogBytes = TERMINAL_PARSE_BACKLOG_LIMIT;
  queueTerminalOutput(session, 'skipped');
  flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(session.unparsedFromSeq, 1);

  const ws = socket(session.workspace);
  attach(ws);
  await settled(session, ws);
  await settled(session, ws);
  const [ready, snapshot] = ws.messages;
  assert.equal(ready.lastSeq, 1);
  assert.equal(ready.reset, true);
  assert.match(snapshot.data, /skipped/);
});

test('input acknowledgements use a separate socket even while the output viewer is congested', async (t) => {
  const { session, init, send } = setup(t);
  const streamId = randomUUID();
  const output = socket(session.workspace, 'terminal-output');
  init(output, { inputStreamId: streamId });
  await settled(session, output);
  const input = socket(session.workspace, 'terminal-input');
  init(input, { inputStreamId: streamId, sessionGeneration: session.generation });
  assert.equal(session.socket, output);
  assert.equal(session.inputSocket, input);
  output.getBufferedAmount = () => 2 * 1024 * 1024;
  send(input, { input: { data: 'echo test\r', inputSeq: 1 } });
  send(input, { input: { data: 'echo test\r', inputSeq: 1 } });
  assert.deepEqual(session.pty.writes, ['echo test\r']);
  assert.deepEqual(input.messages.map((message) => message.type), ['ready', 'input-ack', 'input-ack']);
  assert.equal(output.messages.some((message) => message.type === 'input-ack'), false);
  send(output, { input: { data: 'forbidden', inputSeq: 2 } });
  assert.deepEqual(session.pty.writes, ['echo test\r']);
});

test('the advertised output-ready state already accepts its matching input attachment', async (t) => {
  const { session, init } = setup(t);
  const streamId = randomUUID();
  const output = socket(session.workspace, 'terminal-output');
  const input = socket(session.workspace, 'terminal-input');
  const send = output.send;
  output.send = function (bytes) {
    send.call(this, bytes);
    const message = this.messages.at(-1);
    if (message.type === 'ready') init(input, { inputStreamId: streamId, sessionGeneration: message.sessionGeneration });
  };
  init(output, { inputStreamId: streamId });
  await settled(session, output);
  assert.equal(input.messages[0].type, 'ready');
  assert.equal(input.closedCode, undefined);
  assert.equal(session.inputSocket, input);
});

test('input attachment rejects mismatched streams and generations without creating a PTY', async (t) => {
  const { session, ptys, init } = setup(t);
  const streamId = randomUUID();
  const output = socket(session.workspace, 'terminal-output');
  init(output, { inputStreamId: streamId });
  await settled(session, output);
  for (const fields of [
    { inputStreamId: randomUUID(), sessionGeneration: session.generation },
    { inputStreamId: streamId, sessionGeneration: randomUUID() },
  ]) {
    const input = socket(session.workspace, 'terminal-input');
    init(input, fields);
    assert.equal(input.closedCode, 1008);
  }
  assert.equal(ptys.length, 1);
  assert.equal(session.socket, output);
});

test('closing the output attachment also detaches its input socket without killing the shell', async (t) => {
  const { session, attach, terminals } = setup(t);
  const output = socket(session.workspace);
  attach(output);
  await settled(session, output);
  const input = socket(session.workspace);
  session.inputSocket = input;
  terminals.detachSocket(session, output);
  assert.equal(input.readyState, 3);
  assert.equal(session.inputSocket, null);
  assert.equal(session.pty.killed, undefined);
});

test('reattach during queued process exit creates a new generation immune to stale finalization', async (t) => {
  const { session, init, sessions } = setup(t);
  session.pty.emitExit({ exitCode: 0 });
  const ws = socket(session.workspace);
  init(ws, { sessionGeneration: session.generation, lastSeq: 0 });
  const replacement = sessions.get(session.id);
  assert.notEqual(replacement.generation, session.generation);
  await drain(session.terminal);
  await settled(replacement, ws);
  assert.equal(sessions.get(session.id), replacement);
  assert.equal(ws.messages[0].sessionGeneration, replacement.generation);
  assert.equal(ws.messages.some((message) => message.type === 'exit'), false);
});

test('attach and detach broadcasts do not rewrite stored tab state', async (t) => {
  const { session, attach, terminals, saves } = setup(t);
  const tabUpdates = [];
  session.workspace.tabSubscribers.add({ readyState: 1, send(payload) { tabUpdates.push(payload); } });
  const savesBefore = saves.length;
  const ws = socket(session.workspace);
  attach(ws);
  await settled(session, ws);
  terminals.detachSocket(session, ws);
  assert.equal(tabUpdates.length, 2);
  assert.equal(saves.length, savesBefore);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function fakePersistentPty() {
  const prepares = [];
  const closes = [];
  return {
    enabled: true, sessionIds: new Set(), prepares, closes,
    count() { return this.sessionIds.size; },
    prepare(sessionId, options) {
      const request = deferred();
      prepares.push({ sessionId, options, ...request });
      return request.promise;
    },
    async close(sessionId) { closes.push(sessionId); },
  };
}

const prepared = (data = '') => ({ generation: 'pty:broker-generation', cwd: '/srv', cols: 20, rows: 4, seq: 3, data, pty: fakePty() });

test('persistent sessions open asynchronously while the viewer keeps its heartbeat', async (t) => {
  const persistentPty = fakePersistentPty();
  const { sessions, init, send, workspace } = harness(t, { persistentPty });
  const ws = socket(workspace);
  init(ws);
  assert.equal(sessions.size, 0);
  assert.equal(persistentPty.prepares.length, 1);
  send(ws, { ping: {} });
  assert.deepEqual(ws.messages, [{ type: 'pong' }]);
  // A second viewer joins the same preparation instead of starting another.
  const second = socket(workspace);
  init(second);
  assert.equal(persistentPty.prepares.length, 1);

  persistentPty.prepares[0].resolve(prepared('restored history'));
  await tick();
  const session = sessions.get(persistentPty.prepares[0].sessionId);
  await settled(session, ws, second);
  assert.equal(ws.readyState, 3, 'the later viewer replaces the earlier one');
  const ready = second.messages.find((message) => message.type === 'ready');
  assert.equal(ready.sessionGeneration, 'pty:broker-generation');
  assert.equal(ready.reset, true);
  assert.equal(ready.cwd, '/srv');
  assert.ok(second.messages.some((message) => message.type === 'output' && message.data.includes('restored history')));
});

test('closing a persistent tab during preparation releases the prepared connection', async (t) => {
  const persistentPty = fakePersistentPty();
  const { sessions, init, terminals, workspace, sessionId } = harness(t, { persistentPty });
  const ws = socket(workspace);
  init(ws);
  terminals.closeSession(sessionId);
  assert.deepEqual(persistentPty.closes, [sessionId]);
  const result = prepared();
  persistentPty.prepares[0].resolve(result);
  await tick();
  assert.equal(result.pty.killed, true);
  assert.equal(sessions.size, 0);
  assert.deepEqual(ws.messages, [{ type: 'error', message: 'Terminal is not available' }]);
});

test('a force restart closes the persistent shell before preparing its replacement', async (t) => {
  const persistentPty = fakePersistentPty();
  const { sessions, init, workspace, sessionId } = harness(t, { persistentPty });
  const first = socket(workspace);
  init(first);
  persistentPty.prepares[0].resolve(prepared());
  await tick();
  const original = sessions.get(sessionId);
  await settled(original, first);
  const order = [];
  persistentPty.close = async (id) => { order.push(['close', id]); };
  const prepare = persistentPty.prepare.bind(persistentPty);
  persistentPty.prepare = (id, options) => { order.push(['prepare', id]); return prepare(id, options); };
  const second = socket(workspace);
  init(second, { forceRestart: true });
  assert.deepEqual(order, [['close', sessionId], ['prepare', sessionId]]);
  assert.equal(original.pty.killed, true);
  assert.equal(original.disposed, true);
});

test('an unavailable persistent service fails the viewer instead of starting a local shell', async (t) => {
  const persistentPty = fakePersistentPty();
  const { sessions, init, workspace, ptys } = harness(t, { persistentPty });
  const ws = socket(workspace);
  const logged = t.mock.method(console, 'error', () => {});
  init(ws);
  persistentPty.prepares[0].reject(new Error('PTY service disconnected'));
  await tick();
  assert.equal(logged.mock.callCount(), 1);
  assert.equal(sessions.size, 0);
  assert.equal(ptys.length, 0);
  assert.equal(ws.closedCode, 1011);
  assert.deepEqual(ws.messages, [{ type: 'error', message: 'Terminal service unavailable' }]);
});
