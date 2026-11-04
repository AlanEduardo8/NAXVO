import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/lib/session';
import type { AuthTokens } from '@/types/api';

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim().replace(/\/$/, '');
const SUPABASE_KEY = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

export class SupabaseError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function assertConfigured() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new SupabaseError(
      'configuration_error',
      'Falta configurar EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      0,
    );
  }
}

export function supabaseUrl() {
  return SUPABASE_URL;
}

export function supabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function authTokensFromPayload(payload: any): AuthTokens {
  const expiresIn = Number(payload?.expires_in ?? 3600);
  const now = Date.now();
  return {
    token_type: String(payload?.token_type ?? 'bearer'),
    access_token: String(payload?.access_token ?? ''),
    refresh_token: String(payload?.refresh_token ?? ''),
    expires_in: expiresIn,
    access_expires_at: new Date(now + expiresIn * 1000).toISOString(),
    refresh_expires_at: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

async function decodeResponse(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFromPayload(status: number, payload: any, fallback: string) {
  const message =
    payload?.msg ??
    payload?.message ??
    payload?.error_description ??
    payload?.error?.message ??
    fallback;
  const code =
    payload?.code ??
    payload?.error_code ??
    payload?.error ??
    (status === 401 ? 'unauthorized' : status === 403 ? 'forbidden' : 'supabase_error');
  return new SupabaseError(String(code), String(message), status, typeof payload === 'object' ? payload : undefined);
}

async function rawFetch(url: string, init: RequestInit, timeoutMs = 20000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: init.signal ?? controller.signal });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (controller.signal.aborted) {
      throw new SupabaseError('request_timeout', 'Supabase tardó demasiado en responder. Intenta nuevamente.', 0, { message });
    }
    throw new SupabaseError('network_error', 'No se pudo conectar con Supabase. Comprueba tu conexión a internet.', 0, { message });
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshSupabaseSession(): Promise<string | null> {
  assertConfigured();
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  const response = await rawFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const payload = await decodeResponse(response);
  if (!response.ok || !payload?.access_token) {
    await clearTokens();
    throw errorFromPayload(response.status, payload, 'La sesión expiró. Inicia sesión nuevamente.');
  }
  const tokens = authTokensFromPayload(payload);
  await saveTokens(tokens);
  return tokens.access_token;
}

export async function authSignIn(email: string, password: string) {
  assertConfigured();
  const response = await rawFetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const payload = await decodeResponse(response);
  if (!response.ok || !payload?.access_token) {
    // Supabase puede devolver mensajes técnicos como "Invalid login credentials".
    // En la interfaz de NAXVO mostramos un mensaje claro y consistente sin revelar
    // si el correo existe o no.
    if (response.status === 400 || response.status === 401 || payload?.error_code === 'invalid_credentials') {
      throw new SupabaseError('invalid_credentials', 'Correo o contraseña incorrectos', response.status, typeof payload === 'object' ? payload : undefined);
    }
    throw errorFromPayload(response.status, payload, 'Correo o contraseña incorrectos');
  }
  const tokens = authTokensFromPayload(payload);
  await saveTokens(tokens);
  return { user: payload.user, tokens };
}

export async function authSignUp(email: string, password: string, metadata: Record<string, unknown>) {
  assertConfigured();
  const response = await rawFetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password, data: metadata }),
  });
  const payload = await decodeResponse(response);
  if (!response.ok || !payload?.user) {
    throw errorFromPayload(response.status, payload, 'No fue posible crear la cuenta.');
  }
  if (payload.access_token && payload.refresh_token) {
    await saveTokens(authTokensFromPayload(payload));
  }
  return payload;
}

export async function authGetUser() {
  assertConfigured();
  let token = await getAccessToken();
  if (!token) throw new SupabaseError('unauthorized', 'Inicia sesión para continuar.', 401);

  let response = await rawFetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'GET',
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (response.status === 401) {
    token = await refreshSupabaseSession();
    if (!token) throw new SupabaseError('unauthorized', 'Inicia sesión para continuar.', 401);
    response = await rawFetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
  }
  const payload = await decodeResponse(response);
  if (!response.ok) throw errorFromPayload(response.status, payload, 'No se pudo leer la sesión.');
  return payload;
}

export async function authSignOut() {
  assertConfigured();
  const token = await getAccessToken();
  try {
    if (token) {
      await rawFetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
  } finally {
    await clearTokens();
  }
}

function baseHeaders(token?: string | null, extras?: HeadersInit): HeadersInit {
  return {
    apikey: SUPABASE_KEY,
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extras ?? {}),
  };
}

export async function rest<T>(
  resource: string,
  init: RequestInit = {},
  authenticated = true,
  retry = true,
): Promise<T> {
  assertConfigured();
  let token = authenticated ? await getAccessToken() : null;
  if (authenticated && !token) throw new SupabaseError('unauthorized', 'Inicia sesión para continuar.', 401);

  const response = await rawFetch(`${SUPABASE_URL}/rest/v1/${resource.replace(/^\//, '')}`, {
    ...init,
    headers: baseHeaders(token, init.headers),
  });

  if (response.status === 401 && authenticated && retry) {
    token = await refreshSupabaseSession();
    if (token) return rest<T>(resource, init, authenticated, false);
  }

  const payload = await decodeResponse(response);
  if (!response.ok) throw errorFromPayload(response.status, payload, 'Supabase rechazó la operación.');
  return payload as T;
}

export async function rpc<T>(name: string, args: Record<string, unknown> = {}, authenticated = true): Promise<T> {
  return rest<T>(`rpc/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  }, authenticated);
}

export async function storageUpload(
  bucket: string,
  path: string,
  uri: string,
  mimeType = 'application/octet-stream',
  upsert = false,
) {
  assertConfigured();
  let token = await getAccessToken();
  if (!token) throw new SupabaseError('unauthorized', 'Inicia sesión para subir archivos.', 401);

  const local = await fetch(uri);
  const blob = await local.blob();
  const upload = async (bearer: string) => rawFetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${bearer}`,
      'Content-Type': mimeType,
      'x-upsert': upsert ? 'true' : 'false',
    },
    body: blob,
  }, 45000);

  let response = await upload(token);
  if (response.status === 401) {
    token = await refreshSupabaseSession();
    if (!token) throw new SupabaseError('unauthorized', 'La sesión expiró.', 401);
    response = await upload(token);
  }
  const payload = await decodeResponse(response);
  if (!response.ok) throw errorFromPayload(response.status, payload, 'No se pudo subir el archivo.');
  return payload;
}

export function storagePublicUrl(bucket: string, path: string) {
  assertConfigured();
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function storageSignedUrl(bucket: string, path: string, expiresIn = 3600) {
  assertConfigured();
  const token = await getAccessToken();
  if (!token) throw new SupabaseError('unauthorized', 'Inicia sesión para abrir este archivo.', 401);
  const response = await rawFetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ expiresIn }),
  });
  const payload = await decodeResponse(response);
  if (!response.ok) throw errorFromPayload(response.status, payload, 'No se pudo abrir el archivo privado.');
  const signed = String(payload?.signedURL ?? payload?.signedUrl ?? '');
  if (!signed) throw new SupabaseError('invalid_signed_url', 'Supabase no devolvió una URL firmada.', 500);
  return signed.startsWith('http') ? signed : `${SUPABASE_URL}/storage/v1${signed}`;
}

export async function invokeFunction<T>(name: string, body: Record<string, unknown>, authenticated = true): Promise<T> {
  assertConfigured();
  let token = authenticated ? await getAccessToken() : null;
  if (authenticated && !token) throw new SupabaseError('unauthorized', 'Inicia sesión para continuar.', 401);
  const call = (bearer?: string | null) => rawFetch(`${SUPABASE_URL}/functions/v1/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  }, 50000);

  let response = await call(token);
  if (response.status === 401 && authenticated) {
    token = await refreshSupabaseSession();
    response = await call(token);
  }
  const payload = await decodeResponse(response);
  if (!response.ok) throw errorFromPayload(response.status, payload, `La función ${name} no pudo completarse.`);
  return payload as T;
}
