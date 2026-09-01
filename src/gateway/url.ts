/**
 * Build the TUI-gateway WebSocket URL for `hermes serve` / dashboard (:9119).
 *
 * Auth (2026 docs):
 * - Loopback / some hosts: `?token=<dashboard session token>`
 * - Gated OAuth hosts: prefer single-use `?ticket=` from POST /api/auth/ws-ticket
 *   (Desktop mints this after sign-in; third-party minting is thinly documented).
 *
 * We try ticket mint when a token is provided (Authorization / session header),
 * then fall back to `?token=`. Never invent OAuth PKCE on the phone.
 */

export type AuthQuery = readonly [name: 'token' | 'ticket', value: string];

export function httpBaseToWsBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('https://')) {
    return `wss://${trimmed.slice('https://'.length)}`;
  }
  if (trimmed.startsWith('http://')) {
    return `ws://${trimmed.slice('http://'.length)}`;
  }
  if (trimmed.startsWith('wss://') || trimmed.startsWith('ws://')) {
    return trimmed;
  }
  return `ws://${trimmed}`;
}

export function normalizeHttpBase(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('ws://')) {
    return `http://${trimmed.slice('ws://'.length)}`;
  }
  if (trimmed.startsWith('wss://')) {
    return `https://${trimmed.slice('wss://'.length)}`;
  }
  return `http://${trimmed}`;
}

export function buildWsUrl(baseUrl: string, auth: AuthQuery, path = '/api/ws'): string {
  const wsBase = httpBaseToWsBase(baseUrl);
  const url = new URL(path.startsWith('/') ? `${wsBase}${path}` : `${wsBase}/${path}`);
  url.searchParams.set(auth[0], auth[1]);
  return url.toString();
}

/**
 * Attempt to mint a single-use WS ticket. Returns null when the host does not
 * expose /api/auth/ws-ticket or rejects the pasted token — caller should fall
 * back to `?token=`.
 */
export async function tryMintWsTicket(
  baseUrl: string,
  token: string,
  timeoutMs = 8_000,
): Promise<string | null> {
  const httpBase = normalizeHttpBase(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${httpBase}/api/auth/ws-ticket`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        // Dashboard REST commonly accepts the session token this way.
        // Undocumented for third-party clients — best-effort only.
        Authorization: `Bearer ${token}`,
        'X-Hermes-Session-Token': token,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as { ticket?: unknown };
    return typeof body.ticket === 'string' && body.ticket.length > 0 ? body.ticket : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export function describeCloseCode(code: number): string {
  switch (code) {
    case 1000:
      return 'Normal close';
    case 1006:
      return 'Abnormal close (network or server down)';
    case 4401:
      return 'Unauthorized (bad token or ticket) — close 4401';
    case 4403:
      return 'Forbidden (Host/peer mismatch) — close 4403';
    default:
      return `WebSocket closed (${code})`;
  }
}
