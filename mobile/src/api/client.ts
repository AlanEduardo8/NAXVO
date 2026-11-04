import { invokeFunction, rest, rpc, storagePublicUrl, storageSignedUrl, storageUpload, supabaseUrl, SupabaseError } from '@/lib/supabase';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

function mapError(error: unknown): never {
  if (error instanceof ApiError) throw error;
  if (error instanceof SupabaseError) {
    throw new ApiError(error.code, error.message, error.status, error.details);
  }
  throw new ApiError('unexpected_error', error instanceof Error ? error.message : 'Ocurrió un error inesperado.', 500);
}

export function apiUrl() {
  return supabaseUrl();
}

export function apiEndpoint(path: string) {
  return `${supabaseUrl()}/${path.replace(/^\//, '')}`;
}

export async function dbRequest<T>(resource: string, init: RequestInit = {}, authenticated = true): Promise<T> {
  try { return await rest<T>(resource, init, authenticated); } catch (error) { return mapError(error); }
}

export async function dbRpc<T>(name: string, args: Record<string, unknown> = {}, authenticated = true): Promise<T> {
  try { return await rpc<T>(name, args, authenticated); } catch (error) { return mapError(error); }
}

export async function functionRequest<T>(name: string, body: Record<string, unknown>, authenticated = true): Promise<T> {
  try { return await invokeFunction<T>(name, body, authenticated); } catch (error) { return mapError(error); }
}

export async function uploadFile(bucket: string, path: string, uri: string, mimeType?: string | null, upsert = false) {
  try { return await storageUpload(bucket, path, uri, mimeType || 'application/octet-stream', upsert); } catch (error) { return mapError(error); }
}

export function publicFileUrl(bucket: string, path: string) {
  return storagePublicUrl(bucket, path);
}

export async function privateFileUrl(bucket: string, path: string, expiresIn = 3600) {
  try { return await storageSignedUrl(bucket, path, expiresIn); } catch (error) { return mapError(error); }
}
