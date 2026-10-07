import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  initializeTerminalStateStore, readTerminalWorkspace, saveTerminalWorkspace,
  deleteTerminalWorkspace, readTerminalInputStream, saveTerminalInputStream,
} from './terminal-state.js';

test('reopening the database preserves tab order and acknowledged input across application updates', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-state-'));
  const dbPath = path.join(directory, 'state.sqlite');
  let db = new Database(dbPath);
  try {
    initializeTerminalStateStore(db);
    const workspace = {
      userId: 7, tabsState: { tabs: [{ id: 'tab-b', title: 'B' }, { id: 'tab-a', title: 'A' }], activeId: 'tab-a', nextIndex: 3 },
      exitedTabs: new Set(['tab-b']),
    };
    saveTerminalWorkspace(workspace);
    saveTerminalInputStream('tab-a', 'generation-1', 'stream-1', 42);
    db.close();
    db = new Database(dbPath);
    initializeTerminalStateStore(db);
    expect(readTerminalWorkspace(7)).toEqual({ tabsState: workspace.tabsState, exitedTabs: ['tab-b'] });
    expect(readTerminalInputStream('tab-a', 'generation-1')).toEqual({ streamId: 'stream-1', lastSeq: 42 });
    expect(readTerminalInputStream('tab-a', 'generation-2')).toBeNull();
    saveTerminalInputStream('tab-a', 'generation-2', 'stream-2', 0);
    expect(readTerminalInputStream('tab-a', 'generation-1')).toBeNull();
    deleteTerminalWorkspace(7);
    expect(readTerminalWorkspace(7)).toBeNull();
    expect(readTerminalInputStream('tab-a', 'generation-2')).toBeNull();
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
