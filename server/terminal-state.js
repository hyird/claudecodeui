// Reuse the auth database so terminal metadata follows the same deployment data
// directory. WAL writes persist input deduplication before acknowledging a frame.
let database;

export function initializeTerminalStateStore(db) {
  database = db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS terminal_workspaces (
      user_id INTEGER PRIMARY KEY,
      state TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS terminal_input_streams (
      session_id TEXT PRIMARY KEY,
      generation TEXT NOT NULL,
      stream_id TEXT NOT NULL,
      last_seq INTEGER NOT NULL
    );
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
  const saved = readTerminalWorkspace(userId);
  for (const tab of saved?.tabsState?.tabs ?? []) deleteTerminalInputStream(tab.id);
  database.query('DELETE FROM terminal_workspaces WHERE user_id = ?').run(userId);
}

export function readTerminalInputStream(sessionId, generation) {
  return database.query(`SELECT stream_id AS streamId, last_seq AS lastSeq
    FROM terminal_input_streams WHERE session_id = ? AND generation = ?`).get(sessionId, generation);
}

export function saveTerminalInputStream(sessionId, generation, streamId, lastSeq) {
  database.query(`INSERT INTO terminal_input_streams (session_id, generation, stream_id, last_seq)
    VALUES (?, ?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET
    generation = excluded.generation, stream_id = excluded.stream_id, last_seq = excluded.last_seq`
  ).run(sessionId, generation, streamId, lastSeq);
}

export function deleteTerminalInputStream(sessionId) {
  database.query('DELETE FROM terminal_input_streams WHERE session_id = ?').run(sessionId);
}
