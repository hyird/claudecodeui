// Reuse the auth database so terminal metadata follows the same deployment data
// directory. Input acknowledgement and deduplication live in the PTY owner (the
// web process for ordinary PTYs, the broker for persistent ones), not here.
let database;

export function initializeTerminalStateStore(db) {
  database = db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS terminal_workspaces (
      user_id INTEGER PRIMARY KEY,
      state TEXT NOT NULL
    );
    DROP TABLE IF EXISTS terminal_input_streams;
  `);
}

export function readTerminalWorkspace(userId) {
  const row = database.query('SELECT state FROM terminal_workspaces WHERE user_id = ?').get(userId);
  if (!row) return null;
  try { return JSON.parse(row.state); } catch { return null; }
}

export function saveTerminalWorkspace(workspace) {
  database.query(`INSERT INTO terminal_workspaces (user_id, state) VALUES (?, ?)
    ON CONFLICT(user_id) DO UPDATE SET state = excluded.state`).run(workspace.userId, JSON.stringify({
    tabsState: workspace.tabsState,
    exitedTabs: [...workspace.exitedTabs],
  }));
}

export function deleteTerminalWorkspace(userId) {
  database.query('DELETE FROM terminal_workspaces WHERE user_id = ?').run(userId);
}
