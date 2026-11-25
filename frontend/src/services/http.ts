/**
 * Frontend en backend draaien altijd op dezelfde origin (Vite-proxy in dev, Express in productie):
 * de sessiecookie is SameSite=Strict en wordt niet cross-site meegestuurd.
 */
const BASE = '';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  params: Record<string, string | undefined> = {},
  init?: RequestInit,
): Promise<{ body: T; headers: Headers }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
  const url = `${BASE}/api${path}${qs.size ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError(0, 'Backend niet bereikbaar. Draait "npm run dev" in de projectmap?');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Sessie verlopen of ingetrokken: terug naar het loginscherm.
    if (res.status === 401 && !path.startsWith('/auth/')) window.dispatchEvent(new Event('auth:expired'));
    throw new ApiError(res.status, body.error ?? `Fout ${res.status}`);
  }
  return { body: body as T, headers: res.headers };
}

export const post = <T>(path: string, data?: unknown) =>
  request<T>(path, {}, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data === undefined ? undefined : JSON.stringify(data),
  }).then((r) => r.body);

export const get = async <T>(path: string, params: Record<string, string | undefined> = {}) => (await request<T>(path, params)).body;

