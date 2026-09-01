import { createId } from '../utils/text';
import { getDb } from './database';

export type AgentRecord = {
  id: string;
  name: string;
  description: string;
  storedSessionId: string | null;
  liveSessionId: string | null;
  profileName: string | null;
  createdAt: number;
  updatedAt: number;
};

type AgentRow = {
  id: string;
  name: string;
  description: string;
  stored_session_id: string | null;
  live_session_id: string | null;
  profile_name: string | null;
  created_at: number;
  updated_at: number;
};

function mapRow(row: AgentRow): AgentRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    storedSessionId: row.stored_session_id,
    liveSessionId: row.live_session_id,
    profileName: row.profile_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAgents(): Promise<AgentRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<AgentRow>(
    'SELECT * FROM agents ORDER BY updated_at DESC',
  );
  return rows.map(mapRow);
}

export async function getAgent(id: string): Promise<AgentRecord | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<AgentRow>('SELECT * FROM agents WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

export async function createAgent(input: {
  name: string;
  description: string;
  storedSessionId?: string | null;
  liveSessionId?: string | null;
  profileName?: string | null;
}): Promise<AgentRecord> {
  const db = await getDb();
  const now = Date.now();
  const record: AgentRecord = {
    id: createId('agent'),
    name: input.name.trim(),
    description: input.description.trim(),
    storedSessionId: input.storedSessionId ?? null,
    liveSessionId: input.liveSessionId ?? null,
    profileName: input.profileName ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO agents (
      id, name, description, stored_session_id, live_session_id, profile_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.name,
      record.description,
      record.storedSessionId,
      record.liveSessionId,
      record.profileName,
      record.createdAt,
      record.updatedAt,
    ],
  );

  return record;
}

export async function updateAgentSessions(
  id: string,
  patch: {
    storedSessionId?: string | null;
    liveSessionId?: string | null;
    profileName?: string | null;
  },
): Promise<void> {
  const db = await getDb();
  const current = await getAgent(id);
  if (!current) {
    return;
  }
  const next = {
    storedSessionId:
      patch.storedSessionId !== undefined ? patch.storedSessionId : current.storedSessionId,
    liveSessionId:
      patch.liveSessionId !== undefined ? patch.liveSessionId : current.liveSessionId,
    profileName: patch.profileName !== undefined ? patch.profileName : current.profileName,
    updatedAt: Date.now(),
  };
  await db.runAsync(
    `UPDATE agents
     SET stored_session_id = ?, live_session_id = ?, profile_name = ?, updated_at = ?
     WHERE id = ?`,
    [next.storedSessionId, next.liveSessionId, next.profileName, next.updatedAt, id],
  );
}

export async function touchAgent(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE agents SET updated_at = ? WHERE id = ?', [Date.now(), id]);
}

export async function deleteAgent(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM messages WHERE agent_id = ?', [id]);
  await db.runAsync('DELETE FROM agents WHERE id = ?', [id]);
}
