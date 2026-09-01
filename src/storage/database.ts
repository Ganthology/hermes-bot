import * as SQLite from 'expo-sqlite';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('hermes-bot.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          stored_session_id TEXT,
          live_session_id TEXT,
          profile_name TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY NOT NULL,
          agent_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          remote_row_id TEXT,
          created_at INTEGER NOT NULL,
          streaming INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_messages_agent ON messages(agent_id, created_at);
      `);
      return db;
    })();
  }
  return dbPromise;
}
