import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';

import { cloudcli } from '../proto/messages.js';
import {
  decodeTabsClientMessage,
  decodeTerminalClientMessage,
  encodeTabsServerMessage,
  encodeTerminalOutput,
  encodeTerminalServerMessage,
  sendTerminalOutput,
} from './wire.js';

const { TerminalServerMessage, TerminalClientMessage, TabsClientMessage, TabsServerMessage } = cloudcli;
const TERMINAL_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_TERMINAL_ID = '22222222-2222-4222-8222-222222222222';
const INPUT_STREAM_ID = '33333333-3333-4333-8333-333333333333';

function decodeOutputFrame(frame) {
  const message = TerminalServerMessage.decode(frame);
  assert.equal(message.body, 'output');
  const payload = Buffer.from(message.output.data);
  return message.output.compressed ? inflateSync(payload).toString('utf8') : payload.toString('utf8');
}

test('terminal output uses a compressed protobuf frame when deflate reduces payload size', () => {
  const output = `\x1b[32m${'build output '.repeat(400)}\x1b[0m\r\n`;
  const frame = encodeTerminalOutput(output, 7);
  const message = TerminalServerMessage.decode(frame);

  assert.equal(message.seq, 7);
  assert.equal(message.output.compressed, true);
  assert.ok(frame.length < Buffer.byteLength(output));
  assert.equal(decodeOutputFrame(frame), output);
});

test('small terminal output stays uncompressed inside the protobuf frame', () => {
  const frame = encodeTerminalOutput('ok\r\n');
  const message = TerminalServerMessage.decode(frame);

  assert.equal(message.output.compressed, false);
  assert.equal(decodeOutputFrame(frame), 'ok\r\n');
});

test('terminal output below the compression threshold skips deflate even when repetitive', () => {
  const output = 'x'.repeat(256);
  const frame = encodeTerminalOutput(output, 12);
  const message = TerminalServerMessage.decode(frame);

  assert.equal(message.seq, 12);
  assert.equal(message.output.compressed, false);
  assert.equal(Buffer.from(message.output.data).toString('utf8'), output);
});

test('terminal output preserves OSC 52 clipboard sequences through protobuf', () => {
  const output = 'before\x1b]52;c;SGVsbG8=\x07middle\x1b]52;c;V29ybGQ=\x1b\\after';
  assert.equal(decodeOutputFrame(encodeTerminalOutput(output)), output);
});

test('terminal websocket output preserves split OSC 52 sequences', () => {
  const sent = [];
  const ws = { send(frame) { sent.push(frame); } };

  sendTerminalOutput(ws, 'a\x1b]5');
  sendTerminalOutput(ws, '2;c;SGVsbG8=');
  sendTerminalOutput(ws, '\x07b\x1b]52;c;V29ybGQ=\x1b');
  sendTerminalOutput(ws, '\\c');

  assert.equal(
    sent.map(decodeOutputFrame).join(''),
    'a\x1b]52;c;SGVsbG8=\x07b\x1b]52;c;V29ybGQ=\x1b\\c',
  );
});

test('terminal output preserves mouse tracking mode sequences', () => {
  const output = 'before\x1b[?1000hmiddle\x1b[?1000;1002;1006hafter\x1b[?25h\x1b[?1000l';
  assert.equal(decodeOutputFrame(encodeTerminalOutput(output)), output);
});

test('empty terminal output is not framed or sent', () => {
  const sent = [];
  sendTerminalOutput({ send(frame) { sent.push(frame); } }, '');
  assert.equal(sent.length, 0);
});

test('terminal client messages round-trip through protobuf', () => {
  const init = TerminalClientMessage.encode({
    init: {
      sessionId: TERMINAL_ID,
      cols: 120,
      rows: 40,
      cwd: '/tmp',
      forceRestart: true,
      lastSeq: 9,
      inputStreamId: INPUT_STREAM_ID,
    },
  }).finish();
  assert.deepEqual(decodeTerminalClientMessage(init), {
    type: 'init',
    sessionId: TERMINAL_ID,
    cols: 120,
    rows: 40,
    cwd: '/tmp',
    forceRestart: true,
    lastSeq: 9,
    inputStreamId: INPUT_STREAM_ID,
  });

  const input = TerminalClientMessage.encode({ input: { data: 'ls\r', inputSeq: 7 } }).finish();
  assert.deepEqual(decodeTerminalClientMessage(input), { type: 'input', data: 'ls\r', inputSeq: 7 });

  const resize = TerminalClientMessage.encode({ resize: { cols: 80, rows: 24 } }).finish();
  assert.deepEqual(decodeTerminalClientMessage(resize), { type: 'resize', cols: 80, rows: 24 });
});

test('terminal ready frames carry replay reset metadata', () => {
  const frame = encodeTerminalServerMessage({
    type: 'ready',
    cwd: '/tmp/project',
    sessionId: TERMINAL_ID,
    reset: true,
    gap: true,
    lastSeq: 21,
  });
  const message = TerminalServerMessage.decode(frame);

  assert.equal(message.body, 'ready');
  assert.equal(message.ready.cwd, '/tmp/project');
  assert.equal(message.ready.sessionId, TERMINAL_ID);
  assert.equal(message.ready.reset, true);
  assert.equal(message.ready.gap, true);
  assert.equal(message.ready.lastSeq, 21);
});

test('terminal input acknowledgements carry the cumulative input sequence', () => {
  const frame = encodeTerminalServerMessage({ type: 'input-ack', inputSeq: 17 });
  const message = TerminalServerMessage.decode(frame);

  assert.equal(message.body, 'inputAck');
  assert.equal(message.inputAck.inputSeq, 17);
});

test('tabs client hyphenated commands map back from protobuf oneof fields', () => {
  const setActive = TabsClientMessage.encode({ setActive: { activeId: SECOND_TERMINAL_ID } }).finish();
  assert.deepEqual(decodeTabsClientMessage(setActive), { type: 'set-active', activeId: SECOND_TERMINAL_ID });

  const updateTitle = TabsClientMessage.encode({ updateTitle: { tabId: SECOND_TERMINAL_ID, title: 'logs' } }).finish();
  assert.deepEqual(
    decodeTabsClientMessage(updateTitle),
    { type: 'update-title', tabId: SECOND_TERMINAL_ID, title: 'logs' },
  );
});

test('tabs server state encodes to a decodable protobuf frame', () => {
  const frame = encodeTabsServerMessage({
    type: 'tabs',
    state: {
      tabs: [{ id: TERMINAL_ID, title: '终端 1', status: 'connected' }],
      activeId: TERMINAL_ID,
    },
  });
  const message = TabsServerMessage.decode(frame);

  assert.equal(message.body, 'tabs');
  assert.equal(message.tabs.activeId, TERMINAL_ID);
  assert.deepEqual(
    message.tabs.tabs.map((tab) => ({ id: tab.id, title: tab.title, status: tab.status })),
    [{ id: TERMINAL_ID, title: '终端 1', status: 'connected' }],
  );
});
