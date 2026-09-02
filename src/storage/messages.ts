import { coerceText, createId } from '../utils/text';
import type { GatewayHistoryMessage } from '../gateway/types';
import { getDb } from './database';

export type MessageRecord = {
  id: string;
  agentId: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | string;
  content: string;
  remoteRowId: string | null;
  createdAt: number;
  streaming: boolean;
  /** Session-only. History rows stay false so reopen does not replay the reveal. */
  live?: boolean;
};

type MessageRow = {
  id: string;
  agent_id: string;
  role: string;
  content: string;
  remote_row_id: string | null;
  created_at: number;
  streaming: number;
};

function mapRow(row: MessageRow): MessageRecord {
  return {
    id: row.id,
    agentId: row.agent_id,
    role: row.role,
    content: row.content,
    remoteRowId: row.remote_row_id,
    createdAt: row.created_at,
    streaming: row.streaming === 1,
  };
}

export async function listMessages(agentId: string): Promise<MessageRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MessageRow>(
    'SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at ASC',
    [agentId],
  );
  return rows.map(mapRow);
}

export async function insertMessage(input: {
  agentId: string;
  role: string;
  content: string;
  remoteRowId?: string | null;
  createdAt?: number;
  streaming?: boolean;
  id?: string;
}): Promise<MessageRecord> {
  const db = await getDb();
  const record: MessageRecord = {
    id: input.id ?? createId('msg'),
    agentId: input.agentId,
    role: input.role,
    content: input.content,
    remoteRowId: input.remoteRowId ?? null,
    createdAt: input.createdAt ?? Date.now(),
    streaming: Boolean(input.streaming),
  };
  await db.runAsync(
    `INSERT INTO messages (id, agent_id, role, content, remote_row_id, created_at, streaming)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.agentId,
      record.role,
      record.content,
      record.remoteRowId,
      record.createdAt,
      record.streaming ? 1 : 0,
    ],
  );
  return record;
}

export async function updateMessageContent(
  id: string,
  content: string,
  streaming: boolean,
): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE messages SET content = ?, streaming = ? WHERE id = ?', [
    content,
    streaming ? 1 : 0,
    id,
  ]);
}

export async function replaceMessagesFromHistory(
  agentId: string,
  history: GatewayHistoryMessage[],
): Promise<MessageRecord[]> {
  const db = await getDb();
  await db.runAsync('DELETE FROM messages WHERE agent_id = ?', [agentId]);

  const now = Date.now();
  const mapped: MessageRecord[] = [];

  for (let index = 0; index < history.length; index += 1) {
    const item = history[index];
    const role = typeof item.role === 'string' ? item.role : 'assistant';
    if (role === 'tool') {
      continue;
    }
    if (item.display_kind === 'hidden') {
      continue;
    }
    const content = coerceText(item.content ?? item.text);
    if (!content.trim() && role !== 'assistant') {
      continue;
    }
    const remote =
      item.row_id != null
        ? String(item.row_id)
        : item._row_id != null
          ? String(item._row_id)
          : null;
    const record = await insertMessage({
      agentId,
      role,
      content,
      remoteRowId: remote,
      createdAt: now + index,
      streaming: false,
    });
    mapped.push(record);
  }

  return mapped;
}
