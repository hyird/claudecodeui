import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { test } from 'node:test';

import { cloudcli } from '../proto/messages.js';
import {
  decodeTabsClientMessage,
  decodeTerminalClientMessage,
  encodeTabsServerMessage,
  encodeTerminalOutput,
  sendTerminalOutput,
} from './wire.js';

const { TerminalServerMessage, TerminalClientMessage, TabsClientMessage, TabsServerMessage } = cloudcli;

function decodeOutputFrame(frame) {
  const message = TerminalServerMessage.decode(frame);
  assert.equal(message.body, 'output');
  const payload = Buffer.from(message.output.data);
  return message.output.compressed ? inflateSync(payload).toString('utf8') : payload.toString('utf8');
}

test('terminal output uses a compressed protobuf frame when deflate reduces payload size', () => {
  const output = `\x1b[32m${'build output '.repeat(400)}\x1b[0m\r\n`;
  const frame = encodeTerminalOutput(output);
  const message = TerminalServerMessage.decode(frame);

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
    init: { sessionId: 'terminal-1', cols: 120, rows: 40, cwd: '/tmp', forceRestart: true },
  }).finish();
  assert.deepEqual(decodeTerminalClientMessage(init), {
    type: 'init',
    sessionId: 'terminal-1',
    cols: 120,
    rows: 40,
    cwd: '/tmp',
    forceRestart: true,
  });

  const input = TerminalClientMessage.encode({ input: { data: 'ls\r' } }).finish();
  assert.deepEqual(decodeTerminalClientMessage(input), { type: 'input', data: 'ls\r' });

  const resize = TerminalClientMessage.encode({ resize: { cols: 80, rows: 24 } }).finish();
  assert.deepEqual(decodeTerminalClientMessage(resize), { type: 'resize', cols: 80, rows: 24 });
});

test('tabs client hyphenated commands map back from protobuf oneof fields', () => {
  const setActive = TabsClientMessage.encode({ setActive: { activeId: 'terminal-2' } }).finish();
  assert.deepEqual(decodeTabsClientMessage(setActive), { type: 'set-active', activeId: 'terminal-2' });

  const updateTitle = TabsClientMessage.encode({ updateTitle: { tabId: 'terminal-2', title: 'logs' } }).finish();
  assert.deepEqual(decodeTabsClientMessage(updateTitle), { type: 'update-title', tabId: 'terminal-2', title: 'logs' });
});

test('tabs server state encodes to a decodable protobuf frame', () => {
  const frame = encodeTabsServerMessage({
    type: 'tabs',
    state: {
      tabs: [{ id: 'terminal-1', title: '终端 1', status: 'connected' }],
      activeId: 'terminal-1',
      nextIndex: 2,
    },
  });
  const message = TabsServerMessage.decode(frame);

  assert.equal(message.body, 'tabs');
  assert.equal(message.tabs.activeId, 'terminal-1');
  assert.equal(message.tabs.nextIndex, 2);
  assert.deepEqual(
    message.tabs.tabs.map((tab) => ({ id: tab.id, title: tab.title, status: tab.status })),
    [{ id: 'terminal-1', title: '终端 1', status: 'connected' }],
  );
});
