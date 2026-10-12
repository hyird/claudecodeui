import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  initializeTerminalStateStore, readTerminalWorkspace, saveTerminalWorkspace, deleteTerminalWorkspace,
} from './terminal-state.js';

test('reopening the database preserves tab order and exited tabs across application updates', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cloud-terminal-state-'));
  const dbPath = path.join(directory, 'state.sqlite');
  let db = new Database(dbPath);
  try {
    // Databases from earlier versions carry an unused input-stream table.
    db.exec('CREATE TABLE terminal_input_streams (session_id TEXT PRIMARY KEY)');
    initializeTerminalStateStore(db);
    const workspace = {
      userId: 7, tabsState: { tabs: [{ id: 'tab-b', title: 'B' }, { id: 'tab-a', title: 'A' }], activeId: 'tab-a', nextIndex: 3 },
      exitedTabs: new Set(['tab-b']),
    };
    saveTerminalWorkspace(workspace);
    db.close();
    db = new Database(dbPath);
    initializeTerminalStateStore(db);
    expect(readTerminalWorkspace(7)).toEqual({ tabsState: workspace.tabsState, exitedTabs: ['tab-b'] });
    expect(db.query("SELECT name FROM sqlite_master WHERE name = 'terminal_input_streams'").get()).toBeNull();
    deleteTerminalWorkspace(7);
    expect(readTerminalWorkspace(7)).toBeNull();
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
