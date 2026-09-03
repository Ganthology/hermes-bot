import { normalizeHttpBase } from './url';

/**
 * Fetch a gateway-local image as a data URL via dashboard `GET /api/media`.
 * Documented remote display path (Desktop / hermes_cli/web_server.py) on :9119.
 * Returns null when the host refuses or lacks the endpoint — caller should skip.
 */
export async function fetchGatewayMediaDataUrl(
  baseUrl: string,
  token: string,
  path: string,
  timeoutMs = 20_000,
): Promise<string | null> {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return null;
  }
  if (/^(?:https?:|data:)/i.test(trimmedPath)) {
    return trimmedPath;
  }

  const httpBase = normalizeHttpBase(baseUrl);
  const url = new URL(`${httpBase}/api/media`);
  url.searchParams.set('path', trimmedPath);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Hermes-Session-Token': token,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as { data_url?: unknown };
    return typeof body.data_url === 'string' && body.data_url.startsWith('data:')
      ? body.data_url
      : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
