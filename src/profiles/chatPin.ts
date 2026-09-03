import {
  createAgent,
  getAgentByProfileName,
  updateAgentMeta,
  updateAgentSessions,
  type AgentRecord,
} from '../storage/agents';
import { sessionCreate, sessionResume } from '../gateway/methods';
import type { HermesGatewayClient } from '../gateway/client';

/**
 * Ensure a local pin row exists for a host agent so chat can resume.
 */
export async function ensureLocalPinForHostAgent(input: {
  hostId: string;
  displayName: string;
  description?: string;
}): Promise<AgentRecord> {
  const existing = await getAgentByProfileName(input.hostId);
  if (existing) {
    await updateAgentMeta(existing.id, {
      name: input.displayName,
      description: input.description ?? existing.description,
      profileName: input.hostId,
    });
    return {
      ...existing,
      name: input.displayName,
      description: input.description ?? existing.description,
      profileName: input.hostId,
    };
  }
  return createAgent({
    name: input.displayName,
    description: input.description ?? '',
    profileName: input.hostId,
    storedSessionId: null,
    liveSessionId: null,
  });
}

/**
 * Open or create the forever chat for a host agent. Returns the local agent id for routing.
 */
export async function openChatForHostAgent(options: {
  hostId: string;
  displayName: string;
  description?: string;
  client: HermesGatewayClient;
}): Promise<{ localAgentId: string; storedSessionId: string }> {
  const pin = await ensureLocalPinForHostAgent({
    hostId: options.hostId,
    displayName: options.displayName,
    description: options.description,
  });

  if (pin.storedSessionId) {
    try {
      const resumed = await sessionResume(options.client, {
        session_id: pin.storedSessionId,
        profile: options.hostId,
      });
      const stored =
        resumed.stored_session_id?.trim() ||
        pin.storedSessionId;
      await updateAgentSessions(pin.id, {
        liveSessionId: resumed.session_id ?? null,
        storedSessionId: stored,
        profileName: options.hostId,
      });
      return { localAgentId: pin.id, storedSessionId: stored };
    } catch {
      // Fall through and create a fresh session.
    }
  }

  const created = await sessionCreate(options.client, {
    title: options.displayName,
    profile: options.hostId,
  });
  const stored =
    created.stored_session_id?.trim() ||
    created.session_id?.trim() ||
    null;
  if (!stored) {
    throw new Error('Could not start a chat for this agent.');
  }
  await updateAgentSessions(pin.id, {
    storedSessionId: stored,
    liveSessionId: created.session_id ?? null,
    profileName: options.hostId,
  });
  return { localAgentId: pin.id, storedSessionId: stored };
}
