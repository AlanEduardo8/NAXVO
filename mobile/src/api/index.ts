import {
  ApiError,
  dbRequest,
  dbRpc,
  functionRequest,
  privateFileUrl,
  publicFileUrl,
  uploadFile,
} from './client';
import {
  authGetUser,
  authSignIn,
  authSignOut,
  authSignUp,
} from '@/lib/supabase';
import type {
  Category,
  HomeData,
  PortfolioItem,
  RequestDetailResponse,
  Review,
  ServiceOffering,
  ServiceRequest,
  User,
  Worker,
} from '@/types/api';

let profileCache: User | null = null;

const jsonHeaders = {
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

function queryString(values: Record<string, string | number | boolean | null | undefined>) {
  const q = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  });
  return q.toString();
}

function extFrom(uri: string, mimeType?: string | null) {
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('pdf')) return 'pdf';
  if (mimeType?.includes('webp')) return 'webp';
  const m = uri.match(/\.([a-zA-Z0-9]{2,5})(?:\?|$)/);
  return m?.[1]?.toLowerCase() || 'jpg';
}

function cleanNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeUser(row: any): User {
  return {
    ...row,
    id: Number(row.id),
    nombre: String(row.nombre ?? ''),
    apellidos: String(row.apellidos ?? ''),
    email: String(row.email ?? ''),
    tipo: row.tipo ?? 'cliente',
    modo_dual_habilitado: Boolean(row.modo_dual_habilitado),
    disponible: Boolean(row.disponible),
    verificado: Boolean(row.verificado),
    calificacion_promedio: Number(row.calificacion_promedio ?? 0),
    anos_experiencia: row.anos_experiencia == null ? null : Number(row.anos_experiencia),
    radio_servicio_km: row.radio_servicio_km == null ? null : Number(row.radio_servicio_km),
    tema_preferido: row.tema_preferido ?? 'sistema',
    modo_color: row.modo_color ?? 'normal',
    verificacion_estado: row.verificacion_estado ?? (row.tipo === 'trabajador' ? 'pendiente' : 'no_aplica'),
    estado_cuenta: row.estado_cuenta ?? 'activo',
  } as User;
}

async function getOwnProfileFresh() {
  const auth = await authGetUser();
  const rows = await dbRequest<any[]>(
    `usuarios?${queryString({ auth_user_id: `eq.${auth.id}`, select: '*', limit: 1 })}`,
  );
  if (!rows[0]) {
    throw new ApiError(
      'profile_missing',
      'La cuenta existe en Supabase Auth, pero falta su perfil NAXVO. Ejecuta 00_FULL_SETUP.sql y vuelve a iniciar sesión.',
      409,
    );
  }
  const user = normalizeUser(rows[0]);
  if (user.estado_cuenta === 'suspendido') {
    await authSignOut();
    throw new ApiError('account_suspended', 'Esta cuenta se encuentra suspendida. Contacta a soporte.', 403);
  }
  profileCache = user;
  return user;
}

async function ownProfile() {
  return profileCache ?? getOwnProfileFresh();
}

async function findUsers(ids: number[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<number, any>();
  const rows = await dbRequest<any[]>(
    `usuarios?select=id,nombre,apellidos,email,foto_url,especialidad,profesion&or=(${unique.map(id => `id.eq.${id}`).join(',')})`,
  );
  return new Map<number, any>(rows.map((row: any) => [Number(row.id), row] as [number, any]));
}

async function enrichRequests(rows: any[]): Promise<ServiceRequest[]> {
  const users = await findUsers(rows.flatMap(row => [Number(row.cliente_id), Number(row.trabajador_id || 0)]));
  return rows.map(row => {
    const client = users.get(Number(row.cliente_id));
    const worker = users.get(Number(row.trabajador_id));
    return {
      ...row,
      id: Number(row.id),
      presupuesto: row.presupuesto == null ? null : Number(row.presupuesto),
      cliente: client ? { nombre: `${client.nombre ?? ''} ${client.apellidos ?? ''}`.trim(), foto_url: client.foto_url } : null,
      trabajador: worker ? { nombre: `${worker.nombre ?? ''} ${worker.apellidos ?? ''}`.trim(), foto_url: worker.foto_url, especialidad: worker.especialidad } : null,
      cliente_nombre: client ? `${client.nombre ?? ''} ${client.apellidos ?? ''}`.trim() : undefined,
      trabajador_nombre: worker ? `${worker.nombre ?? ''} ${worker.apellidos ?? ''}`.trim() : undefined,
    } as ServiceRequest;
  });
}

export async function login(email: string, password: string) {
  profileCache = null;
  await authSignIn(email.trim(), password);
  return getOwnProfileFresh();
}

export async function register(payload: Record<string, unknown>) {
  const email = String(payload.email ?? '').trim();
  const password = String(payload.password ?? '');
  const metadata: Record<string, unknown> = { ...payload };
  delete metadata.password;
  metadata.anos_experiencia = cleanNumber(metadata.anos_experiencia) ?? 0;
  metadata.tipo = metadata.tipo === 'trabajador' ? 'trabajador' : 'cliente';

  const signed = await authSignUp(email, password, metadata);
  if (!signed.access_token) {
    throw new ApiError(
      'email_confirmation_required',
      'La cuenta fue creada. Confirma tu correo antes de iniciar sesión, o desactiva “Confirm email” en Supabase Auth durante las pruebas.',
      202,
    );
  }
  profileCache = null;
  const user = await getOwnProfileFresh();
  return { user, auth: signed, next_step: user.tipo === 'trabajador' ? 'verification' : 'home' };
}

export const getMe = () => getOwnProfileFresh();

export async function logout(_allDevices = false) {
  profileCache = null;
  await authSignOut();
}

// Las mismas categorías base definidas en supabase/00_FULL_SETUP.sql.
// Solo respaldan la selección visual cuando el catálogo remoto no está disponible.
const DEFAULT_CATEGORIES: Category[] = [
  { slug: 'plomeria', name: 'Plomería', mark: 'P', description: 'Instalación y reparación de tuberías, fugas y sanitarios.' },
  { slug: 'electricidad', name: 'Electricidad', mark: 'E', description: 'Instalaciones, reparaciones y mantenimiento eléctrico.' },
  { slug: 'carpinteria', name: 'Carpintería', mark: 'C', description: 'Muebles, puertas, reparación y trabajos en madera.' },
  { slug: 'pintura', name: 'Pintura', mark: 'P', description: 'Pintura interior, exterior y acabados.' },
  { slug: 'jardineria', name: 'Jardinería', mark: 'J', description: 'Diseño, mantenimiento y cuidado de áreas verdes.' },
  { slug: 'albanileria', name: 'Albañilería', mark: 'A', description: 'Construcción, reparación y remodelación.' },
  { slug: 'electrodomesticos', name: 'Electrodomésticos', mark: 'E', description: 'Diagnóstico y reparación de electrodomésticos.' },
  { slug: 'mantenimiento', name: 'Mantenimiento General', mark: 'M', description: 'Soluciones generales para hogar, oficina y negocio.' },
];

export async function getCategories() {
  try {
    const rows = await dbRequest<Category[]>('categorias?select=slug,name,mark,description&activo=eq.true&order=orden.asc', {}, false);
    return rows.length ? rows : DEFAULT_CATEGORIES;
  } catch (error) {
    console.warn('NAXVO: no se pudo consultar el catálogo de Supabase; se muestran las categorías base.', error);
    return DEFAULT_CATEGORIES;
  }
}

export async function getHome(): Promise<HomeData> {
  const [stats, workers, reviews] = await Promise.all([
    dbRpc<any>('naxvo_home_stats', {}, false),
    dbRequest<any[]>('naxvo_public_workers?select=*&destacado=eq.true&order=calificacion_promedio.desc&limit=6', {}, false),
    dbRequest<any[]>('naxvo_public_reviews?select=*&order=fecha.desc&limit=6', {}, false),
  ]);
  return {
    stats: {
      profesionales: Number(stats?.profesionales ?? 0),
      servicios_completados: Number(stats?.servicios_completados ?? 0),
      clientes: Number(stats?.clientes ?? 0),
      calificacion: Number(stats?.calificacion ?? 0),
    },
    featured_professionals: workers.map((row: any) => ({
      id: Number(row.id),
      nombre: row.nombre,
      foto_url: row.foto_url,
      especialidad: row.especialidad,
      ciudad: row.ciudad,
      estado: row.estado,
      calificacion: Number(row.calificacion_promedio ?? 0),
      servicios: Number(row.total_servicios ?? 0),
      verificado: Boolean(row.verificado),
      disponible: Boolean(row.disponible),
    })),
    reviews: reviews.map((row: any) => ({
      id: Number(row.id),
      puntuacion: Number(row.puntuacion ?? 0),
      comentario: row.comentario ?? '',
      cliente: row.cliente ?? 'Cliente NAXVO',
      especialidad: row.especialidad,
      fecha: row.fecha,
    })),
  };
}

export async function getWorkers(query = ''): Promise<Worker[]> {
  const input = new URLSearchParams(query);
  const q = input.get('q')?.trim() ?? '';
  let resource = 'naxvo_public_workers?select=*&order=destacado.desc,calificacion_promedio.desc,nombre.asc';
  if (q) {
    const safe = q.replace(/[(),]/g, ' ').trim();
    resource += `&or=(nombre.ilike.*${encodeURIComponent(safe)}*,apellidos.ilike.*${encodeURIComponent(safe)}*,profesion.ilike.*${encodeURIComponent(safe)}*,especialidad.ilike.*${encodeURIComponent(safe)}*,ciudad.ilike.*${encodeURIComponent(safe)}*)`;
  }
  const rows = await dbRequest<any[]>(resource, {}, false);
  let favorites = new Set<number>();
  try {
    const me = await ownProfile();
    if (me.tipo === 'cliente') {
      const fav = await dbRequest<any[]>(`profesionales_favoritos?select=trabajador_id&cliente_id=eq.${me.id}`);
      favorites = new Set(fav.map(x => Number(x.trabajador_id)));
    }
  } catch {
    // El catálogo también funciona antes de iniciar sesión.
  }
  return rows.map((row: any) => ({ ...row, id: Number(row.id), favorite: favorites.has(Number(row.id)) })) as Worker[];
}

export async function getWorker(id: number) {
  const workers = await dbRequest<any[]>(`naxvo_public_workers?select=*&id=eq.${id}&limit=1`, {}, false);
  if (!workers[0]) throw new ApiError('not_found', 'No encontramos este profesional.', 404);
  const [portfolio, reviews] = await Promise.all([
    dbRequest<any[]>(`naxvo_public_portfolio?select=*&trabajador_id=eq.${id}&order=fecha_registro.desc`, {}, false),
    dbRequest<any[]>(`naxvo_public_reviews?select=*&trabajador_id=eq.${id}&order=fecha.desc`, {}, false),
  ]);
  let favorite = false;
  try {
    const me = await ownProfile();
    const fav = await dbRequest<any[]>(`profesionales_favoritos?select=trabajador_id&cliente_id=eq.${me.id}&trabajador_id=eq.${id}&limit=1`);
    favorite = Boolean(fav[0]);
  } catch {}
  const worker = { ...workers[0], id: Number(workers[0].id), favorite } as Worker;
  const mappedPortfolio = portfolio.map((item: any) => ({ ...item, id: Number(item.id), imagen_url: item.imagen_url ?? item.imagen })) as PortfolioItem[];
  const mappedReviews = reviews.map((item: any) => ({ ...item, id: Number(item.id), puntuacion: Number(item.puntuacion) })) as Review[];
  return { worker, portfolio: mappedPortfolio, reviews: mappedReviews };
}

export async function getFavorites() {
  const me = await ownProfile();
  const fav = await dbRequest<any[]>(`profesionales_favoritos?select=trabajador_id&cliente_id=eq.${me.id}&order=fecha.desc`);
  const ids = fav.map(x => Number(x.trabajador_id)).filter(Boolean);
  if (!ids.length) return [];
  const workers = await dbRequest<any[]>(`naxvo_public_workers?select=*&or=(${ids.map(id => `id.eq.${id}`).join(',')})`);
  return workers.map((row: any) => ({ ...row, id: Number(row.id), favorite: true })) as Worker[];
}

export async function toggleFavorite(workerId: number) {
  const me = await ownProfile();
  const existing = await dbRequest<any[]>(`profesionales_favoritos?select=id&cliente_id=eq.${me.id}&trabajador_id=eq.${workerId}&limit=1`);
  if (existing[0]) {
    await dbRequest(`profesionales_favoritos?id=eq.${existing[0].id}`, { method: 'DELETE' });
    return { worker_id: workerId, favorite: false };
  }
  await dbRequest('profesionales_favoritos', {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify({ cliente_id: me.id, trabajador_id: workerId }),
  });
  return { worker_id: workerId, favorite: true };
}

export async function getRequests() {
  const me = await ownProfile();
  const filter = me.tipo === 'trabajador' ? `trabajador_id=eq.${me.id}` : me.tipo === 'cliente' ? `cliente_id=eq.${me.id}` : '';
  const rows = await dbRequest<any[]>(`solicitudes?select=*&${filter ? `${filter}&` : ''}order=fecha_creacion.desc`);
  return enrichRequests(rows);
}

export async function getOpportunities() {
  const me = await ownProfile();
  if (me.tipo !== 'trabajador') return { verified: false, requests: [] as ServiceRequest[] };
  if (!me.verificado) return { verified: false, requests: [] as ServiceRequest[] };
  const rows = await dbRpc<any[]>('naxvo_get_opportunities');
  return { verified: true, requests: rows as ServiceRequest[] };
}

export const acceptOpportunity = (id: number) => dbRpc('naxvo_accept_request', { p_request_id: id });
export const declineOpportunity = (id: number) => dbRpc('naxvo_decline_request', { p_request_id: id });

export async function createRequest(payload: Record<string, unknown>) {
  // El RPC existente solo admite 'efectivo' y 'mercadopago'.
  // La selección 'tarjeta' debe procesarse por Mercado Pago, nunca como efectivo.
  const method = payload.metodo_pago === 'tarjeta' ? 'mercadopago' : payload.metodo_pago;
  const result = await dbRpc<any>('naxvo_create_request', {
    p_payload: { ...payload, metodo_pago: method },
  });
  const requestId = Number(result?.request_id ?? result?.id ?? result);
  if (!Number.isSafeInteger(requestId) || requestId < 1) {
    throw new ApiError('invalid_request_id', 'Supabase no confirmó el folio de la solicitud. Comprueba tus solicitudes antes de intentarlo de nuevo.', 502);
  }
  return { request_id: requestId };
}

export async function uploadRequestImage(requestId: number, asset: { uri: string; mimeType?: string | null }) {
  const me = await ownProfile();
  const ext = extFrom(asset.uri, asset.mimeType);
  const path = `${requestId}/${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  await uploadFile('request-media', path, asset.uri, asset.mimeType);
  const rows = await dbRequest<any[]>('solicitud_imagenes', {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify({ solicitud_id: requestId, usuario_id: me.id, path }),
  });
  const url = await privateFileUrl('request-media', path).catch(() => null);
  return { request_id: requestId, url, id: rows[0]?.id };
}

export const startService = (requestId: number) => dbRpc<{ request_id: number; estado: string }>('naxvo_start_service', { p_request_id: requestId });
export const requestServiceCompletion = (requestId: number, notas: string) => dbRpc<{ request_id: number; finalizacion_estado: string }>('naxvo_request_completion', { p_request_id: requestId, p_notas: notas });
export const requestCompletionCorrection = (requestId: number, motivo: string) => dbRpc<{ request_id: number; finalizacion_estado: string }>('naxvo_request_correction', { p_request_id: requestId, p_motivo: motivo });
export const confirmServiceCompletion = (requestId: number) => dbRpc<{ request_id: number; estado: string; finalizacion_estado: string }>('naxvo_confirm_completion', { p_request_id: requestId });

export async function uploadCompletionEvidence(requestId: number, asset: { uri: string; mimeType?: string | null }) {
  const me = await ownProfile();
  const ext = extFrom(asset.uri, asset.mimeType);
  const path = `${requestId}/${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  await uploadFile('completion-evidence', path, asset.uri, asset.mimeType);
  const rows = await dbRequest<any[]>('solicitud_evidencias', {
    method: 'POST', headers: jsonHeaders, body: JSON.stringify({ solicitud_id: requestId, trabajador_id: me.id, tipo: 'finalizacion', path }),
  });
  const url = await privateFileUrl('completion-evidence', path).catch(() => null);
  return { request_id: requestId, evidence: { id: rows[0]?.id, path, url } };
}

export async function getRequest(id: number): Promise<RequestDetailResponse> {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`solicitudes?select=*&id=eq.${id}&limit=1`);
  if (!rows[0]) throw new ApiError('not_found', 'No encontramos esta solicitud o no tienes acceso.', 404);
  const r = rows[0];
  const users = await findUsers([Number(r.cliente_id), Number(r.trabajador_id || 0)]);
  const client = users.get(Number(r.cliente_id));
  const worker = users.get(Number(r.trabajador_id));
  const [events, evidences, images] = await Promise.all([
    dbRequest<any[]>(`solicitud_eventos?select=*&solicitud_id=eq.${id}&order=fecha.desc`),
    dbRequest<any[]>(`solicitud_evidencias?select=*&solicitud_id=eq.${id}&order=fecha.desc`),
    dbRequest<any[]>(`solicitud_imagenes?select=*&solicitud_id=eq.${id}&order=fecha.asc`),
  ]);
  const evidenceMapped = await Promise.all(evidences.map(async ev => ({
    id: Number(ev.id), tipo: ev.tipo, fecha: ev.fecha, url: ev.path ? await privateFileUrl('completion-evidence', ev.path).catch(() => null) : null,
  })));
  const imageUrls = await Promise.all(images.map(async img => img.path ? privateFileUrl('request-media', img.path).catch(() => null) : null));
  const finalState = r.finalizacion_estado ?? 'no_solicitada';
  const request = {
    ...r,
    id: Number(r.id),
    presupuesto: r.presupuesto == null ? null : Number(r.presupuesto),
    cliente_nombre: client?.nombre,
    cliente_apellidos: client?.apellidos,
    cliente_email: client?.email,
    trabajador_nombre: worker?.nombre,
    trabajador_apellidos: worker?.apellidos,
    trabajador_email: worker?.email,
    imagenes_url: imageUrls.filter(Boolean),
  } as any;
  return {
    request,
    events: events.map(e => ({ ...e, id: Number(e.id) })),
    completion: {
      state: finalState,
      notes: r.finalizacion_notas,
      correction_reason: r.finalizacion_correccion_motivo,
      requested_at: r.finalizacion_solicitada_at,
      confirmed_at: r.finalizacion_confirmada_at,
      evidences: evidenceMapped,
      can_start: me.tipo === 'trabajador' && Number(r.trabajador_id) === me.id && r.estado === 'asignado' && r.cotizacion_estado === 'aceptada',
      can_request: me.tipo === 'trabajador' && Number(r.trabajador_id) === me.id && r.estado === 'en_curso' && ['no_solicitada', 'correccion_solicitada'].includes(finalState),
      can_review: me.tipo === 'cliente' && Number(r.cliente_id) === me.id && r.estado === 'en_curso' && finalState === 'solicitada',
      completed: r.estado === 'completado' || finalState === 'confirmada',
    },
  };
}

export async function getMessages(requestId: number, afterId = 0) {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`mensajes?select=*&solicitud_id=eq.${requestId}${afterId ? `&id=gt.${afterId}` : ''}&order=id.asc`);
  const unread = rows.filter(x => Number(x.receptor_id) === me.id && !x.leido).map(x => Number(x.id));
  if (unread.length) {
    await dbRequest(`mensajes?receptor_id=eq.${me.id}&solicitud_id=eq.${requestId}&leido=eq.false`, {
      method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ leido: true }),
    }).catch(() => undefined);
  }
  return rows;
}

export const sendMessage = (requestId: number, message: string) => dbRpc<{ message: any }>('naxvo_send_message', { p_request_id: requestId, p_message: message });

export async function getNotifications() {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`notificaciones?select=*&usuario_id=eq.${me.id}&order=fecha.desc&limit=100`);
  return { unread_count: rows.filter(x => !x.leida).length, notifications: rows };
}

export async function markAllNotifications() {
  const me = await ownProfile();
  return dbRequest(`notificaciones?usuario_id=eq.${me.id}&leida=eq.false`, {
    method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ leida: true, fecha_lectura: new Date().toISOString() }),
  });
}

export async function markNotification(id: number) {
  const me = await ownProfile();
  return dbRequest(`notificaciones?id=eq.${id}&usuario_id=eq.${me.id}`, {
    method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ leida: true, fecha_lectura: new Date().toISOString() }),
  });
}

export async function getPortfolio() {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`trabajos_realizados?select=*&trabajador_id=eq.${me.id}&order=fecha_registro.desc`);
  return rows.map(row => ({ ...row, id: Number(row.id), imagen_url: row.imagen_url })) as PortfolioItem[];
}

export async function getVerification() {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`verificaciones_profesionales?select=*&usuario_id=eq.${me.id}&limit=1`);
  const v = rows[0];
  return {
    estado: v?.estado ?? me.verificacion_estado ?? 'pendiente',
    verificado: me.verificado,
    nota: v?.nota_revision ?? me.verificacion_nota,
    solicitada_at: v?.fecha_solicitud ?? null,
    tiene_documento: Boolean(v?.documento_path),
    tiene_ine_frente: Boolean(v?.ine_frente_path ?? v?.documento_path),
    tiene_ine_reverso: Boolean(v?.ine_reverso_path),
    tiene_rostro: Boolean(v?.rostro_path),
  };
}

export async function switchAccountRole(target: 'cliente' | 'trabajador') {
  await dbRpc('naxvo_switch_role', { p_target: target });
  profileCache = null;
  return getOwnProfileFresh();
}

export async function getClientVerification() {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`verificaciones_clientes?select=*&usuario_id=eq.${me.id}&limit=1`);
  const v = rows[0];
  return {
    estado: v?.estado ?? 'borrador',
    tiene_ine: Boolean(v?.ine_path),
    tiene_ine_reverso: Boolean(v?.ine_reverso_path),
    tiene_rostro: Boolean(v?.rostro_path),
    nota_revision: v?.nota_revision ?? null,
  };
}

export async function submitClientVerificationImage(kind: 'ine' | 'ine_reverso' | 'rostro', uri: string, mimeType: string) {
  const me = await ownProfile();
  const ext = extFrom(uri, mimeType);
  const path = `${me.id}/client/${kind}-${Date.now()}.${ext}`;
  await uploadFile('verification-docs', path, uri, mimeType, true);
  const field = kind === 'ine' ? 'ine_path' : kind === 'ine_reverso' ? 'ine_reverso_path' : 'rostro_path';
  const current = await dbRequest<any[]>(`verificaciones_clientes?select=*&usuario_id=eq.${me.id}&limit=1`);
  if (current[0]) {
    await dbRequest(`verificaciones_clientes?usuario_id=eq.${me.id}`, {
      method: 'PATCH', headers: jsonHeaders,
      body: JSON.stringify({ [field]: path, fecha_actualizacion: new Date().toISOString() }),
    });
  } else {
    await dbRequest('verificaciones_clientes', {
      method: 'POST', headers: jsonHeaders,
      body: JSON.stringify({ usuario_id: me.id, [field]: path, estado: 'borrador' }),
    });
  }
  return getClientVerification();
}

export async function getAdminClientVerifications() {
  const rows = await dbRequest<any[]>('verificaciones_clientes?select=*&order=fecha_actualizacion.desc');
  const users = await findUsers(rows.map(x => Number(x.usuario_id)));
  return rows.map(v => ({ ...v, ...users.get(Number(v.usuario_id)), usuario_id: Number(v.usuario_id) }));
}

export async function getAdminClientDocument(usuario_id: number, tipo: 'ine' | 'ine_reverso' | 'rostro') {
  const rows = await dbRequest<any[]>(`verificaciones_clientes?select=ine_path,ine_reverso_path,rostro_path&usuario_id=eq.${usuario_id}&limit=1`);
  const path = tipo === 'ine' ? rows[0]?.ine_path : tipo === 'ine_reverso' ? rows[0]?.ine_reverso_path : rows[0]?.rostro_path;
  if (!path) throw new ApiError('not_found', 'Este documento todavía no fue cargado.', 404);
  return privateFileUrl('verification-docs', path, 300);
}

export const decideClientVerification = (usuario_id: number, decision: 'aprobada' | 'rechazada', nota: string) =>
  dbRpc('naxvo_review_client_verification', { p_user_id: usuario_id, p_decision: decision, p_note: nota });

export async function updateProfile(payload: Record<string, unknown>) {
  const me = await ownProfile();
  const allowed = [
    'nombre','apellidos','telefono','fecha_nacimiento','direccion','ciudad','estado','codigo_postal','biografia',
    'facebook','instagram','linkedin','sitio_web','profesion','especialidad','especialidades','anos_experiencia','experiencia',
    'zona_servicio','radio_servicio_km','modalidad_servicio','horario_disponibilidad',
  ];
  const body: Record<string, unknown> = {};
  allowed.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) body[key] = payload[key];
  });
  if (body.anos_experiencia !== undefined) body.anos_experiencia = cleanNumber(body.anos_experiencia) ?? 0;
  if (body.radio_servicio_km !== undefined) body.radio_servicio_km = cleanNumber(body.radio_servicio_km);
  const rows = await dbRequest<any[]>(`usuarios?id=eq.${me.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
  profileCache = rows[0] ? normalizeUser(rows[0]) : null;
  return profileCache ?? getOwnProfileFresh();
}

export async function updateAppearance(payload: { tema_preferido: string; modo_color: string }) {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`usuarios?id=eq.${me.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(payload) });
  profileCache = normalizeUser(rows[0] ?? { ...me, ...payload });
  return profileCache;
}

export async function setAvailability(disponible: boolean) {
  const me = await ownProfile();
  if (me.tipo !== 'trabajador') throw new ApiError('forbidden', 'Solo un perfil profesional puede cambiar su disponibilidad.', 403);
  if (disponible && !me.verificado) throw new ApiError('verification_required', 'Completa tu verificación profesional antes de activar tu disponibilidad.', 409);
  const rows = await dbRequest<any[]>(`usuarios?id=eq.${me.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ disponible }) });
  profileCache = normalizeUser(rows[0] ?? { ...me, disponible });
  return profileCache;
}

export async function uploadProfilePhoto(asset: { uri: string; mimeType?: string | null }) {
  const me = await ownProfile();
  const ext = extFrom(asset.uri, asset.mimeType);
  const path = `${me.id}/avatar.${ext}`;
  await uploadFile('avatars', path, asset.uri, asset.mimeType, true);
  const foto_url = `${publicFileUrl('avatars', path)}?v=${Date.now()}`;
  const rows = await dbRequest<any[]>(`usuarios?id=eq.${me.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify({ foto_url }) });
  profileCache = normalizeUser(rows[0] ?? { ...me, foto_url });
  return profileCache;
}

export async function createPortfolioItem(payload: { uri: string; beforeUri?: string; titulo: string; descripcion: string; categoria: string; etiquetas: string; fecha_realizado: string }) {
  const me = await ownProfile();
  const ext = extFrom(payload.uri, 'image/jpeg');
  const base = `${me.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const afterPath = `${base}.${ext}`;
  await uploadFile('portfolio', afterPath, payload.uri, 'image/jpeg');
  let beforePath: string | null = null;
  if (payload.beforeUri) {
    beforePath = `${base}-before.${extFrom(payload.beforeUri, 'image/jpeg')}`;
    await uploadFile('portfolio', beforePath, payload.beforeUri, 'image/jpeg');
  }
  const rows = await dbRequest<any[]>('trabajos_realizados', {
    method: 'POST', headers: jsonHeaders,
    body: JSON.stringify({
      trabajador_id: me.id,
      origen: 'manual', titulo: payload.titulo, descripcion: payload.descripcion,
      categoria: payload.categoria, etiquetas: payload.etiquetas, fecha_realizado: payload.fecha_realizado || null,
      imagen_url: publicFileUrl('portfolio', afterPath),
      imagen_antes_url: beforePath ? publicFileUrl('portfolio', beforePath) : null,
      activo: true,
    }),
  });
  return { portfolio_id: Number(rows[0]?.id) };
}

export async function submitVerification(identificacion: string, document: { uri: string; name: string; type: string }) {
  // Compatibilidad con instalaciones anteriores. La nueva interfaz usa
  // submitProfessionalVerificationScan con INE frente/reverso y rostro.
  const me = await ownProfile();
  const ext = extFrom(document.uri, document.type);
  const path = `${me.id}/professional/${Date.now()}-${document.name.replace(/[^a-zA-Z0-9._-]/g, '_') || `document.${ext}`}`;
  await uploadFile('verification-docs', path, document.uri, document.type, true);
  await dbRpc('naxvo_submit_prof_verification', { p_identification: identificacion, p_document_path: path });
  profileCache = null;
  return { submitted: true };
}

export async function submitProfessionalVerificationScan(
  identificacion: string,
  scans: { ineFront: {uri:string; mimeType?:string|null}; ineBack:{uri:string; mimeType?:string|null}; face:{uri:string; mimeType?:string|null} },
) {
  const me = await ownProfile();
  const upload = async (kind:string, asset:{uri:string; mimeType?:string|null}) => {
    const mime = asset.mimeType || 'image/jpeg';
    const ext = extFrom(asset.uri, mime);
    const path = `${me.id}/professional/${kind}-${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    await uploadFile('verification-docs', path, asset.uri, mime, true);
    return path;
  };
  const [front, back, face] = await Promise.all([
    upload('ine-frente', scans.ineFront),
    upload('ine-reverso', scans.ineBack),
    upload('rostro', scans.face),
  ]);
  await dbRpc('naxvo_submit_prof_verification_scan', {
    p_identification: identificacion,
    p_ine_front_path: front,
    p_ine_back_path: back,
    p_face_path: face,
  });
  profileCache = null;
  return { submitted: true };
}

export async function getAdminProfessionalDocument(usuario_id:number, tipo:'ine_frente'|'ine_reverso'|'rostro') {
  const rows = await dbRequest<any[]>(`verificaciones_profesionales?select=documento_path,ine_frente_path,ine_reverso_path,rostro_path&usuario_id=eq.${usuario_id}&limit=1`);
  const v=rows[0];
  const path = tipo==='ine_frente' ? (v?.ine_frente_path ?? v?.documento_path) : tipo==='ine_reverso' ? v?.ine_reverso_path : v?.rostro_path;
  if(!path) throw new ApiError('not_found','Este archivo de verificación todavía no fue cargado.',404);
  return privateFileUrl('verification-docs',path,300);
}

export async function getServices(query = ''): Promise<ServiceOffering[]> {
  const input = new URLSearchParams(query);
  const q = input.get('q')?.trim() ?? '';
  const categoria = input.get('categoria')?.trim() ?? '';
  let resource = 'naxvo_public_services?select=*&order=fecha_actualizacion.desc';
  if (categoria) resource += `&categoria=eq.${encodeURIComponent(categoria)}`;
  if (q) {
    const safe = q.replace(/[(),]/g, ' ').trim();
    resource += `&or=(titulo.ilike.*${encodeURIComponent(safe)}*,descripcion.ilike.*${encodeURIComponent(safe)}*,categoria.ilike.*${encodeURIComponent(safe)}*,profesional_nombre.ilike.*${encodeURIComponent(safe)}*)`;
  }
  const rows = await dbRequest<any[]>(resource, {}, false);
  return rows.map((row: any) => ({
    ...row,
    id: Number(row.id),
    trabajador_id: Number(row.trabajador_id),
    precio_desde: row.precio_desde == null ? null : Number(row.precio_desde),
    duracion_minutos: row.duracion_minutos == null ? null : Number(row.duracion_minutos),
    profesional: row.profesional ?? {
      id: Number(row.trabajador_id),
      nombre: row.profesional_nombre,
      foto_url: row.profesional_foto_url,
      profesion: row.profesional_profesion,
      especialidad: row.profesional_especialidad,
      ciudad: row.profesional_ciudad,
      estado: row.profesional_estado,
      zona_servicio: row.profesional_zona_servicio,
      disponible: Boolean(row.profesional_disponible),
      verificado: Boolean(row.profesional_verificado),
      calificacion_promedio: Number(row.profesional_calificacion ?? 0),
      total_servicios: Number(row.profesional_total_servicios ?? 0),
    },
  })) as ServiceOffering[];
}

export async function getService(id: number) {
  const rows = await getServices(``);
  const service = rows.find(row => row.id === id);
  if (!service) throw new ApiError('not_found', 'No encontramos este servicio.', 404);
  return service;
}

export async function getMyServices() {
  const me = await ownProfile();
  const rows = await dbRequest<any[]>(`servicios_profesionales?select=*&trabajador_id=eq.${me.id}&order=fecha_actualizacion.desc`);
  return rows.map(row => ({ ...row, id: Number(row.id), trabajador_id: Number(row.trabajador_id), precio_desde: cleanNumber(row.precio_desde), duracion_minutos: cleanNumber(row.duracion_minutos) })) as ServiceOffering[];
}

export async function createServiceOffering(payload: Record<string, unknown>) {
  const me = await ownProfile();
  if (!me.verificado) throw new ApiError('verification_required', 'Tu perfil debe estar verificado antes de publicar servicios.', 409);
  const body = {
    trabajador_id: me.id,
    categoria: payload.categoria,
    titulo: payload.titulo,
    descripcion: payload.descripcion || null,
    precio_desde: cleanNumber(payload.precio_desde),
    duracion_minutos: cleanNumber(payload.duracion_minutos),
    modalidad: payload.modalidad || 'domicilio',
    activo: payload.activo !== false,
  };
  const rows = await dbRequest<any[]>('servicios_profesionales', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(body) });
  return { service: rows[0] as ServiceOffering, published: true, message: 'Servicio publicado.' };
}

export async function updateServiceOffering(serviceId: number, payload: Record<string, unknown>) {
  const me = await ownProfile();
  const body: Record<string, unknown> = { ...payload, fecha_actualizacion: new Date().toISOString() };
  if (body.precio_desde !== undefined) body.precio_desde = cleanNumber(body.precio_desde);
  if (body.duracion_minutos !== undefined) body.duracion_minutos = cleanNumber(body.duracion_minutos);
  const rows = await dbRequest<any[]>(`servicios_profesionales?id=eq.${serviceId}&trabajador_id=eq.${me.id}`, { method: 'PATCH', headers: jsonHeaders, body: JSON.stringify(body) });
  if (!rows[0]) throw new ApiError('not_found', 'No encontramos este servicio.', 404);
  return rows[0] as ServiceOffering;
}

export async function toggleServiceOffering(serviceId: number, activo: boolean) {
  return updateServiceOffering(serviceId, { activo });
}

export async function deleteServiceOffering(serviceId: number) {
  const me = await ownProfile();
  await dbRequest(`servicios_profesionales?id=eq.${serviceId}&trabajador_id=eq.${me.id}`, { method: 'DELETE' });
  return { deleted: true, service_id: serviceId };
}

export const submitQuote = (requestId: number, payload: { monto: string; detalle: string; fecha: string; hora: string }) =>
  dbRpc<{ request_id: number; quoted: boolean }>('naxvo_submit_quote', { p_request_id: requestId, p_amount: Number(payload.monto), p_detail: payload.detalle, p_date: payload.fecha, p_time: payload.hora });

export const respondQuote = (requestId: number, action: 'aceptar' | 'rechazar', reason = '') =>
  dbRpc<{ request_id: number; accepted: boolean }>('naxvo_respond_quote', { p_request_id: requestId, p_action: action, p_reason: reason });

export type WorkerLiveLocation = {
  solicitud_id:number; trabajador_id:number; latitud:number; longitud:number; precision_m?:number|null; rumbo?:number|null; velocidad_mps?:number|null; fecha_actualizacion:string;
};

export async function updateWorkerLiveLocation(requestId:number, coords:{latitude:number;longitude:number;accuracy?:number|null;heading?:number|null;speed?:number|null}) {
  const me=await ownProfile();
  if(me.tipo!=='trabajador') throw new ApiError('forbidden','Solo el profesional puede compartir su ubicación.',403);
  const body={
    solicitud_id:requestId,trabajador_id:me.id,latitud:coords.latitude,longitud:coords.longitude,
    precision_m:coords.accuracy??null,rumbo:coords.heading??null,velocidad_mps:coords.speed??null,fecha_actualizacion:new Date().toISOString(),
  };
  const rows=await dbRequest<any[]>(`solicitud_ubicacion_trabajador?on_conflict=solicitud_id`,{
    method:'POST',headers:{'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify(body),
  });
  return rows[0] as WorkerLiveLocation;
}

export async function getWorkerLiveLocation(requestId:number) {
  const rows=await dbRequest<any[]>(`solicitud_ubicacion_trabajador?select=*&solicitud_id=eq.${requestId}&limit=1`);
  if(!rows[0]) return null;
  return { ...rows[0], solicitud_id:Number(rows[0].solicitud_id), trabajador_id:Number(rows[0].trabajador_id), latitud:Number(rows[0].latitud), longitud:Number(rows[0].longitud), precision_m:rows[0].precision_m==null?null:Number(rows[0].precision_m), rumbo:rows[0].rumbo==null?null:Number(rows[0].rumbo), velocidad_mps:rows[0].velocidad_mps==null?null:Number(rows[0].velocidad_mps) } as WorkerLiveLocation;
}

export async function stopWorkerLiveLocation(requestId:number) {
  const me=await ownProfile();
  if(me.tipo!=='trabajador') return;
  await dbRequest(`solicitud_ubicacion_trabajador?solicitud_id=eq.${requestId}&trabajador_id=eq.${me.id}`,{method:'DELETE'});
}

export async function getMercadoPagoConnection(){
  return functionRequest<{connected:boolean;provider_user_id?:string|null;expires_at?:string|null}>('mercadopago-connect',{action:'status'});
}

export async function startMercadoPagoConnection(){
  return functionRequest<{authorization_url:string}>('mercadopago-connect',{action:'authorize'});
}

export async function disconnectMercadoPago(){
  return functionRequest<{disconnected:boolean}>('mercadopago-connect',{action:'disconnect'});
}

export async function getPaymentStatus(requestId: number, refresh = false) {
  let refreshResult:any=null;
  if (refresh) {
    try { refreshResult=await functionRequest('mercadopago-checkout', { action: 'refresh', request_id: requestId }); }
    catch (error:any) { refreshResult={ok:false,reason:error?.message??'refresh_failed'}; }
  }
  const result = await dbRpc<any>('naxvo_payment_status', { p_request_id: requestId });
  if(refresh) result.refresh=refreshResult;
  return result;
}

export async function startMercadoPagoCheckout(requestId: number) {
  return functionRequest<import('@/types/api').PaymentCheckoutResponse>('mercadopago-checkout', { action: 'create', request_id: requestId });
}

export const declareCashPayment = (requestId: number) =>
  dbRpc<{ request_id: number; declared: boolean; already_paid: boolean; payment_id: number }>('naxvo_cash_declare', { p_request_id: requestId });

export const confirmCashPayment = (requestId: number) =>
  dbRpc<{ request_id: number; paid: boolean; already_paid: boolean; payment_id: number }>('naxvo_cash_confirm', { p_request_id: requestId });

function paginate<T>(items: T[], page: number, perPage = 20) {
  const p = Math.max(1, page || 1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  return { items: items.slice((p - 1) * perPage, p * perPage), total, page: p, pages };
}

export async function getAdminDashboard() {
  const me = await ownProfile();
  if (me.tipo !== 'admin') {
    throw new ApiError('admin_required', 'Esta cuenta no está registrada como administrador en NAXVO.', 403);
  }
  const data = await dbRpc<any>('naxvo_admin_dashboard');
  if (!data || typeof data !== 'object' || !data.users || !data.requests || !data.payments) {
    throw new ApiError(
      'admin_profile_not_active',
      'Supabase no reconoce este perfil como administrador activo o faltan permisos del RPC. Ejecuta supabase/03_REPARACION_COMPATIBILIDAD_FINAL.sql y vuelve a iniciar sesión.',
      403,
    );
  }
  return data;
}

export async function getAdminUsers(params: { q?: string; tipo?: string; estado?: string; verificacion?: string; page?: number } = {}) {
  let rows = await dbRequest<any[]>('naxvo_admin_users?select=*&order=fecha_registro.desc');
  const q = params.q?.trim().toLowerCase();
  if (q) rows = rows.filter(x => `${x.nombre} ${x.apellidos} ${x.email}`.toLowerCase().includes(q));
  if (params.tipo) rows = rows.filter(x => x.tipo === params.tipo);
  if (params.estado) rows = rows.filter(x => x.estado_cuenta === params.estado);
  if (params.verificacion) rows = rows.filter(x => x.verificacion_estado === params.verificacion);
  return paginate(rows, params.page ?? 1);
}

export async function getAdminUser(id: number) {
  const rows = await dbRequest<any[]>(`naxvo_admin_users?select=*&id=eq.${id}&limit=1`);
  if (!rows[0]) throw new ApiError('not_found', 'Usuario no encontrado.', 404);
  const requests = await dbRequest<any[]>(`solicitudes?select=*&or=(cliente_id.eq.${id},trabajador_id.eq.${id})&order=fecha_creacion.desc&limit=30`);
  return { user: rows[0], requests };
}

export const setAdminUserStatus = (userId: number, estado: 'activo' | 'suspendido', motivo = '', suspendidoHasta = '') =>
  dbRpc<{ updated: boolean }>('naxvo_admin_set_user_status', { p_user_id: userId, p_status: estado, p_reason: motivo, p_until: suspendidoHasta || null });

export async function getAdminVerifications(estado = 'pendiente') {
  const rows = await dbRequest<any[]>(`verificaciones_profesionales?select=*&estado=eq.${encodeURIComponent(estado)}&order=fecha_solicitud.desc`);
  const users = await dbRequest<any[]>(`naxvo_admin_users?select=*${rows.length ? `&or=(${rows.map(v => `id.eq.${v.usuario_id}`).join(',')})` : '&id=eq.-1'}`);
  const map = new Map<number, any>(users.map((u: any) => [Number(u.id), u] as [number, any]));
  return rows.map(v => ({ ...map.get(Number(v.usuario_id)), ...v, id: Number(v.usuario_id), tiene_documento_verificacion: Boolean(v.documento_path), verificacion_estado: v.estado, verificacion_nota: v.nota_revision }));
}

export const reviewAdminVerification = (workerId: number, decision: 'aprobada' | 'rechazada', nota = '') =>
  dbRpc<{ updated: boolean }>('naxvo_admin_review_professional', { p_user_id: workerId, p_decision: decision, p_note: nota });

export async function getAdminRequests(params: { q?: string; estado?: string; pago?: string; page?: number } = {}) {
  let rows = await dbRequest<any[]>('naxvo_admin_requests?select=*&order=fecha_creacion.desc');
  const q = params.q?.trim().toLowerCase();
  if (q) rows = rows.filter(x => `${x.id} ${x.servicio} ${x.cliente_nombre} ${x.trabajador_nombre ?? ''}`.toLowerCase().includes(q));
  if (params.estado) rows = rows.filter(x => x.estado === params.estado);
  if (params.pago) rows = rows.filter(x => x.estado_pago === params.pago);
  return paginate(rows, params.page ?? 1);
}

export async function getAdminRequest(id: number) {
  const requestRows = await dbRequest<any[]>(`naxvo_admin_requests?select=*&id=eq.${id}&limit=1`);
  if (!requestRows[0]) throw new ApiError('not_found', 'Solicitud no encontrada.', 404);
  const [events, payments, evidence] = await Promise.all([
    dbRequest<any[]>(`solicitud_eventos?select=*&solicitud_id=eq.${id}&order=fecha.desc`),
    dbRequest<any[]>(`pagos?select=*&solicitud_id=eq.${id}&order=fecha_creacion.desc`),
    dbRequest<any[]>(`solicitud_evidencias?select=*&solicitud_id=eq.${id}&order=fecha.desc`),
  ]);
  const users = await findUsers(events.map(e => Number(e.actor_id || 0)));
  const eventsMapped = events.map(e => ({ ...e, actor_nombre: users.get(Number(e.actor_id))?.nombre }));
  const evidenceMapped = await Promise.all(evidence.map(async e => ({ ...e, url: e.path ? await privateFileUrl('completion-evidence', e.path).catch(() => null) : null })));
  return { request: requestRows[0], events: eventsMapped, payments, evidence: evidenceMapped };
}

export const cancelAdminRequest = (requestId: number, motivo: string) =>
  dbRpc<{ cancelled: boolean }>('naxvo_admin_cancel_request', { p_request_id: requestId, p_reason: motivo });

export async function getAdminPayments(params: { q?: string; estado?: string; metodo?: string; page?: number } = {}) {
  let rows = await dbRequest<any[]>('naxvo_admin_payments?select=*&order=fecha_creacion.desc');
  const q = params.q?.trim().toLowerCase();
  if (q) rows = rows.filter(x => `${x.external_reference ?? ''} ${x.provider_payment_id ?? ''} ${x.solicitud_id}`.toLowerCase().includes(q));
  if (params.estado) rows = rows.filter(x => x.estado === params.estado);
  if (params.metodo) rows = rows.filter(x => x.metodo === params.metodo);
  const result = paginate(rows, params.page ?? 1);
  const all = await dbRequest<any[]>('pagos?select=monto,estado');
  const stats = {
    total_pagado: all.filter(x => x.estado === 'pagado').reduce((sum, x) => sum + Number(x.monto ?? 0), 0),
    intentos: all.length,
    fallidos: all.filter(x => x.estado === 'fallido').length,
    reembolsados: all.filter(x => x.estado === 'reembolsado').length,
  };
  return { stats, result };
}

export async function getAdminReviews(params: { q?: string; visibilidad?: string; puntuacion?: number; page?: number } = {}) {
  let rows = await dbRequest<any[]>('naxvo_admin_reviews?select=*&order=fecha.desc');
  const q = params.q?.trim().toLowerCase();
  if (q) rows = rows.filter(x => `${x.cliente_nombre} ${x.trabajador_nombre} ${x.comentario ?? ''}`.toLowerCase().includes(q));
  if (params.visibilidad === 'visible') rows = rows.filter(x => x.visible);
  if (params.visibilidad === 'oculta') rows = rows.filter(x => !x.visible);
  if (params.puntuacion) rows = rows.filter(x => Number(x.puntuacion) === Number(params.puntuacion));
  return paginate(rows, params.page ?? 1);
}

export const moderateAdminReview = (reviewId: number, visible: boolean, motivo = '') =>
  dbRpc<{ updated: boolean }>('naxvo_admin_moderate_review', { p_review_id: reviewId, p_visible: visible, p_reason: motivo });

export async function getAdminReports(params: { q?: string; estado?: string; categoria?: string; page?: number } = {}) {
  let rows = await dbRequest<any[]>('naxvo_admin_reports?select=*&order=fecha_creacion.desc');
  const q = params.q?.trim().toLowerCase();
  if (q) rows = rows.filter(x => `${x.asunto} ${x.descripcion} ${x.reportante_nombre ?? ''}`.toLowerCase().includes(q));
  if (params.estado) rows = rows.filter(x => x.estado === params.estado);
  if (params.categoria) rows = rows.filter(x => x.categoria === params.categoria);
  return paginate(rows, params.page ?? 1);
}

export async function getAdminReport(id: number) {
  const rows = await dbRequest<any[]>(`naxvo_admin_reports?select=*&id=eq.${id}&limit=1`);
  if (!rows[0]) throw new ApiError('not_found', 'Reporte no encontrado.', 404);
  return rows[0];
}

export const resolveAdminReport = (reportId: number, estado: 'en_revision' | 'resuelto' | 'descartado', resolucion = '') =>
  dbRpc<{ updated: boolean }>('naxvo_admin_resolve_report', { p_report_id: reportId, p_status: estado, p_resolution: resolucion });

export async function getAdminAudit(page = 1) {
  const rows = await dbRequest<any[]>('admin_auditoria?select=*&order=fecha.desc&limit=500');
  return paginate(rows, page);
}

export async function getAdminSystem() {
  const [stats, security] = await Promise.all([
    dbRpc<any>('naxvo_system_checks'),
    dbRequest<any[]>('seguridad_eventos?select=*&order=fecha.desc&limit=50'),
  ]);
  return { checks: Array.isArray(stats) ? stats : stats?.checks ?? [], security_events: security };
}

export async function getHelpWelcome() {
  return {
    intent: 'welcome',
    reply: 'Hola, soy el asistente de NAXVO. Puedo orientarte para contratar, ofrecer servicios, verificar tu cuenta o revisar un pago.',
    suggestions: ['¿Cómo contrato un servicio?', '¿Cómo verifico mi cuenta?', '¿Dónde veo mis solicitudes?'],
    action: null,
    mode: 'guided' as const,
  };
}

export async function askHelpBot(message: string, history: { role: 'user' | 'assistant'; content: string }[] = [], context?: {screen: string; simple_language: boolean}) {
  // No ocultar fallos de Groq/Supabase devolviendo la bienvenida como si la IA hubiera respondido.
  return functionRequest<import('@/types/api').HelpBotAnswer>('help-bot', {
    message,
    history,
    screen: context?.screen ?? 'general',
    simple_language: context?.simple_language ?? false,
  });
}
