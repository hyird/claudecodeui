import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import headlessXterm from '@xterm/headless';
import { SerializeAddon } from '@xterm/addon-serialize';
import { createTerminalEventLog, getTerminalReplayPlan, recordTerminalEvent } from './terminal-stream.js';

// Exercise the actual server functions with a real xterm parser and a fake PTY.
// Importing the server itself would start Bun's HTTP listener and auth database.
const source = fs.readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const functions = [
  'createTerminalSnapshot', 'writeTerminalSnapshot', 'forEachTerminalOutputFrame',
  'clearTerminalOutputFlushTimer', 'flushTerminalOutput', 'queueTerminalOutputPiece',
  'queueTerminalOutput', 'sendTerminalSnapshot', 'readTerminalSnapshot', 'resizeSession',
  'sendTerminalEvent', 'recordAndSendTerminalEvent', 'createSession', 'attachSocket',
  'detachSocket', 'closeSession', 'handleInit', 'handleTerminalMessage',
  'terminalSocketWritable', 'closeUserWorkspace',
].map((name) => {
  const match = source.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert.ok(match, `missing server function ${name}`);
  return match[0];
}).join('\n');

function setup(t, cols = 20, rows = 4) {
  const terminals = [];
  const ptys = [];
  const ptyOptions = [];
  const sessionId = randomUUID();
  const workspace = {
    userId: 1,
    tabsState: { tabs: [{ id: sessionId, title: 'Terminal' }], activeId: sessionId, nextIndex: 2 },
    exitedTabs: new Set(),
    tabSubscribers: new Set(),
  };
  const context = vm.createContext({
    Buffer, setTimeout, clearTimeout, randomUUID, process,
    HeadlessTerminal: class extends headlessXterm.Terminal {
      constructor(options) { super(options); terminals.push(this); }
    },
    SerializeAddon, createTerminalEventLog, getTerminalReplayPlan, recordTerminalEvent,
    SERVER_SNAPSHOT_SCROLLBACK: 1000,
    TERMINAL_OUTPUT_MAX_FRAME_BYTES: 16 * 1024,
    TERMINAL_OUTPUT_FLUSH_INTERVAL_MS: 20,
    TERMINAL_SOCKET_BUFFER_LIMIT: 1024 * 1024,
    WS_OPEN: 1,
    UUID_V4_PATTERN: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    sessions: new Map(), workspaces: new Map(),
    resolveCwd: () => '.', resolveShell: () => ({ command: 'fake', args: [] }),
    readString: (value, fallback = '') => typeof value === 'string' ? value : fallback,
    readNumber: (value, fallback) => typeof value === 'number' ? value : fallback,
    broadcastTabsState() {},
    encodeTerminalServerMessage: (message) => message,
    decodeTerminalClientMessage: (message) => message,
    sendTerminalOutput: (ws, data, seq) => ws.send({ type: 'output', data, seq }),
    ptySpawn(_command, _args, options) {
      ptyOptions.push(options);
      const pty = {
        writes: [], sizes: [],
        onData(callback) { this.emitData = callback; },
        onExit(callback) { this.emitExit = callback; },
        write(data) { this.writes.push(data); },
        resize(cols, rows) { this.sizes.push([cols, rows]); },
        kill() { this.killed = true; },
      };
      ptys.push(pty);
      return pty;
    },
  });
  vm.runInContext(functions, context);
  context.workspaces.set(workspace.userId, workspace);
  const session = context.createSession(sessionId, { cols, rows }, workspace);
  t.after(() => {
    for (const value of context.sessions.values()) context.clearTerminalOutputFlushTimer(value);
    for (const terminal of terminals) terminal.dispose();
  });
  return { context, session, ptys, ptyOptions };
}

function socket(workspace) {
  return {
    readyState: 1, data: { workspace }, messages: [],
    send(message) { this.messages.push(message); },
    close(code) { this.closedCode = code; this.readyState = 3; },
  };
}

const drain = (terminal) => new Promise((resolve) => terminal.write('', resolve));

test('web PTYs advertise a remote clipboard route to fullscreen programs', (t) => {
  const { ptyOptions } = setup(t);
  assert.ok(ptyOptions[0].env.SSH_CLIENT);
  assert.equal(ptyOptions[0].env.TERM, 'xterm-256color');
});

test('attach snapshot includes pending parsed output at exactly the advertised sequence', async (t) => {
  const { context, session } = setup(t);
  const ws = socket(session.workspace);
  context.queueTerminalOutput(session, 'before');
  context.attachSocket(ws, session);
  context.queueTerminalOutput(session, '-after');
  context.flushTerminalOutput(session);
  assert.equal(ws.messages.length, 0, 'ready must wait for the parser');
  await drain(session.terminal);

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
  const { context, session } = setup(t);
  // Pi fullscreen enables the alternate screen, mouse tracking and SGR reports.
  context.queueTerminalOutput(session, '\x1b[?1049h\x1b[?1000h\x1b[?1002h\x1b[?1003h\x1b[?1006hfullscreen');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(session.serializer.serialize().includes('\x1b[?1006h'), false,
    'xterm serialization does not include the mouse report encoding');

  const ws = socket(session.workspace);
  context.attachSocket(ws, session);
  await drain(session.terminal);
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

  context.queueTerminalOutput(session, '\x1b[?1006l\x1b[?1003l\x1b[?1002l\x1b[?1000l');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(context.readTerminalSnapshot(session).endsWith('\x1b[?1006h'), false);

  context.queueTerminalOutput(session, '\x1b[?1006h\x1bc');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(context.readTerminalSnapshot(session).endsWith('\x1b[?1006h'), false);
});

test('incremental reconnect replays pending output once before newer live frames', async (t) => {
  const { context, session } = setup(t);
  context.queueTerminalOutput(session, 'one');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  context.queueTerminalOutput(session, 'two');
  const ws = socket(session.workspace);
  context.attachSocket(ws, session, 1);
  context.queueTerminalOutput(session, 'three');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(ws.messages[0].reset, false);
  assert.deepEqual(ws.messages.slice(1).map(({ seq, data }) => [seq, data]), [[2, 'two'], [3, 'three']]);
});

test('resize preserves old-width parsing and serializes only when a snapshot is requested', async (t) => {
  const { context, session } = setup(t, 8, 4);
  let serializations = 0;
  const serialize = session.serializer.serialize.bind(session.serializer);
  session.serializer.serialize = () => { serializations++; return serialize(); };
  context.queueTerminalOutput(session, 'abcdefghi');
  context.resizeSession(session, 4, 4);
  context.resizeSession(session, 4, 4);
  context.queueTerminalOutput(session, 'JK');
  context.flushTerminalOutput(session);
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
  context.attachSocket(socket(session.workspace), session);
  await drain(session.terminal);
  assert.equal(serializations, 1);
});

test('new output and resize release an obsolete serialized snapshot', async (t) => {
  const { context, session } = setup(t, 20, 4);
  context.queueTerminalOutput(session, 'first');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.ok(context.readTerminalSnapshot(session).includes('first'));

  context.queueTerminalOutput(session, ' second');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(session.terminalSnapshot, '');
  assert.ok(context.readTerminalSnapshot(session).includes('first second'));

  context.resizeSession(session, 12, 4);
  await drain(session.terminal);
  assert.equal(session.terminalSnapshot, '');
  assert.ok(context.readTerminalSnapshot(session).includes('first second'));
});

test('newer attachments and closed sessions cancel obsolete parser callbacks', async (t) => {
  const { context, session } = setup(t);
  const first = socket(session.workspace);
  const second = socket(session.workspace);
  context.queueTerminalOutput(session, 'pending');
  context.attachSocket(first, session);
  context.attachSocket(second, session);
  await drain(session.terminal);
  assert.equal(first.readyState, 3);
  assert.equal(first.messages.length, 0);
  assert.equal(second.messages[0].type, 'ready');

  const third = socket(session.workspace);
  context.queueTerminalOutput(session, 'discarded');
  context.attachSocket(third, session);
  context.closeSession(session.id);
  await drain(session.terminal);
  assert.equal(third.messages.length, 0);
  assert.equal(session.terminalEvents.lastSeq, 1);
});

test('process exit follows queued output and an already requested attachment', async (t) => {
  const { context, session } = setup(t);
  const ws = socket(session.workspace);
  context.queueTerminalOutput(session, 'final bytes');
  context.attachSocket(ws, session);
  session.pty.emitExit({ exitCode: 0 });
  await drain(session.terminal);
  assert.deepEqual(ws.messages.map((message) => message.type), ['ready', 'output', 'output', 'exit']);
  assert.equal(ws.messages[1].data, 'final bytes');
  assert.equal(ws.messages.at(-1).seq, 3);
  assert.equal(context.sessions.has(session.id), false);
});

test('generation mismatch forces a fresh snapshot even if the old sequence is in range', async (t) => {
  const { context, session } = setup(t);
  context.queueTerminalOutput(session, 'new shell');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  const ws = socket(session.workspace);
  context.handleTerminalMessage(ws, {
    type: 'init', sessionId: session.id, inputStreamId: randomUUID(),
    sessionGeneration: randomUUID(), lastSeq: 1, cols: 20, rows: 4,
  });
  await drain(session.terminal);
  assert.equal(ws.messages[0].reset, true);
  assert.equal(ws.messages[0].sessionGeneration, session.generation);
  context.handleTerminalMessage(ws, { type: 'input', inputSeq: 1, data: 'new command' });
  context.handleTerminalMessage(ws, { type: 'input', inputSeq: 1, data: 'new command' });
  assert.deepEqual(session.pty.writes, ['new command']);
});

test('a user cannot attach to a terminal from another workspace', (t) => {
  const { context, session, ptys } = setup(t);
  const otherWorkspace = {
    userId: 2,
    tabsState: { tabs: [{ id: randomUUID(), title: 'Other terminal' }], activeId: '' },
    exitedTabs: new Set(), tabSubscribers: new Set(),
  };
  const ws = socket(otherWorkspace);
  context.handleTerminalMessage(ws, {
    type: 'init', sessionId: session.id, inputStreamId: randomUUID(), cols: 20, rows: 4,
  });
  assert.equal(ws.messages[0].type, 'error');
  assert.equal(ws.messages[0].message, 'Terminal is not available');
  assert.equal(ptys.length, 1);
  assert.equal(session.socket, null);
});

test('a foreign workspace cannot restart a running session even with a matching tab id', (t) => {
  const { context, session, ptys } = setup(t);
  const foreignWorkspace = {
    userId: 2,
    tabsState: { tabs: [{ id: session.id, title: 'Foreign terminal' }], activeId: session.id },
    exitedTabs: new Set(), tabSubscribers: new Set(),
  };
  const ws = socket(foreignWorkspace);
  context.handleTerminalMessage(ws, {
    type: 'init', sessionId: session.id, inputStreamId: randomUUID(), forceRestart: true,
    cols: 20, rows: 4,
  });
  assert.equal(ws.messages[0].message, 'Terminal is not available');
  assert.equal(context.sessions.get(session.id), session);
  assert.equal(ptys.length, 1);
});

test('a new input stream drops obsolete sequence histories', async (t) => {
  const { context, session } = setup(t);
  const first = socket(session.workspace);
  context.handleTerminalMessage(first, {
    type: 'init', sessionId: session.id, inputStreamId: randomUUID(), cols: 20, rows: 4,
  });
  await drain(session.terminal);
  context.handleTerminalMessage(first, { type: 'input', inputSeq: 1, data: 'a' });

  const second = socket(session.workspace);
  context.handleTerminalMessage(second, {
    type: 'init', sessionId: session.id, inputStreamId: randomUUID(), cols: 20, rows: 4,
  });
  await drain(session.terminal);
  assert.equal(session.inputStreams.size, 1);
  context.handleTerminalMessage(second, { type: 'input', inputSeq: 1, data: 'b' });
  assert.deepEqual(session.pty.writes, ['a', 'b']);
});

test('removing a user closes their viewers and PTYs and releases workspace state', async (t) => {
  const { context, session } = setup(t);
  const viewer = socket(session.workspace);
  context.attachSocket(viewer, session);
  await drain(session.terminal);
  const tabsViewer = socket(session.workspace);
  session.workspace.tabSubscribers.add(tabsViewer);

  context.closeUserWorkspace(session.workspace.userId);
  assert.equal(session.pty.killed, true);
  assert.equal(viewer.readyState, 3);
  assert.equal(tabsViewer.readyState, 3);
  assert.equal(context.sessions.has(session.id), false);
  assert.equal(context.workspaces.has(session.workspace.userId), false);
});

test('sustained output stays bounded, ordered and complete through parser callbacks', async (t) => {
  const { context, session } = setup(t);
  const ws = socket(session.workspace);
  context.attachSocket(ws, session);
  const output = 'stream line\r\n'.repeat(20000);
  context.queueTerminalOutput(session, output);
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  const frames = ws.messages.filter((message) => message.type === 'output');
  assert.equal(ws.messages[0].type, 'ready');
  assert.equal(frames.map((frame) => frame.data).join(''), output);
  frames.forEach((frame, index) => {
    assert.equal(frame.seq, index + 1);
    assert.ok(Buffer.byteLength(frame.data) <= 16 * 1024);
  });
});

test('a slow terminal viewer is disconnected while replay state remains available', async (t) => {
  const { context, session } = setup(t);
  const slow = socket(session.workspace);
  context.attachSocket(slow, session);
  await drain(session.terminal);
  slow.getBufferedAmount = () => 1024 * 1024 + 1;

  context.queueTerminalOutput(session, 'still running');
  context.flushTerminalOutput(session);
  await drain(session.terminal);
  assert.equal(slow.closedCode, 1013);
  assert.equal(session.terminalEvents.lastSeq, 1);

  const resumed = socket(session.workspace);
  context.attachSocket(resumed, session);
  await drain(session.terminal);
  assert.ok(resumed.messages.some((message) => message.type === 'output' && message.data.includes('still running')));
});

test('reattach during queued process exit creates a new generation immune to stale finalization', async (t) => {
  const { context, session } = setup(t);
  session.pty.emitExit({ exitCode: 0 });
  const ws = socket(session.workspace);
  context.handleTerminalMessage(ws, {
    type: 'init', sessionId: session.id, inputStreamId: randomUUID(),
    sessionGeneration: session.generation, lastSeq: 0, cols: 20, rows: 4,
  });
  const replacement = context.sessions.get(session.id);
  assert.notEqual(replacement.generation, session.generation);
  await drain(session.terminal);
  await drain(replacement.terminal);
  assert.equal(context.sessions.get(session.id), replacement);
  assert.equal(ws.messages[0].sessionGeneration, replacement.generation);
  assert.equal(ws.messages.some((message) => message.type === 'exit'), false);
});
