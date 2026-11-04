export type UserRole = 'cliente' | 'trabajador' | 'admin';
export type ThemePreference = 'sistema' | 'oscuro' | 'claro';
export type ColorMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface User {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  modo_dual_habilitado?: boolean;
  tipo: UserRole;
  telefono?: string | null;
  foto_url?: string | null;
  fecha_nacimiento?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  codigo_postal?: string | null;
  biografia?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  sitio_web?: string | null;
  profesion?: string | null;
  especialidad?: string | null;
  especialidades?: string | null;
  anos_experiencia?: number | null;
  experiencia?: string | null;
  zona_servicio?: string | null;
  radio_servicio_km?: number | null;
  modalidad_servicio?: string | null;
  horario_disponibilidad?: string | null;
  disponible: boolean;
  verificado: boolean;
  verificacion_estado: string;
  verificacion_nota?: string | null;
  estado_cuenta: string;
  calificacion_promedio: number;
  tema_preferido: ThemePreference;
  modo_color: ColorMode;
}

export interface AuthTokens {
  token_type: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  access_expires_at: string;
  refresh_expires_at: string;
}

export interface ApiEnvelope<T> { ok: true; data: T; request_id?: string }
export interface ApiFailure {
  ok: false;
  error: { code: string; message: string; details?: Record<string, unknown> };
  request_id?: string;
}

export interface Category { slug: string; name: string; mark: string; description: string }

export interface Worker {
  id: number;
  nombre: string;
  apellidos: string;
  foto_url?: string | null;
  profesion?: string | null;
  especialidad?: string | null;
  especialidades?: string | null;
  anos_experiencia?: number | null;
  biografia?: string | null;
  experiencia?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  zona_servicio?: string | null;
  disponible: boolean;
  verificado: boolean;
  calificacion_promedio: number;
  promedio_calidad?: number;
  promedio_puntualidad?: number;
  promedio_trato?: number;
  total_calificaciones: number;
  total_servicios: number;
  total_portafolio: number;
  recomendacion_porcentaje?: number | null;
  favorite: boolean;
}

export interface PortfolioItem {
  id: number;
  titulo: string;
  descripcion?: string | null;
  categoria?: string | null;
  etiquetas?: string | null;
  fecha_realizado?: string | null;
  activo?: boolean;
  origen?: string | null;
  imagen_url?: string | null;
  imagen_antes_url?: string | null;
}

export interface Review {
  id: number;
  cliente: string;
  servicio?: string | null;
  puntuacion: number;
  calidad?: number | null;
  puntualidad?: number | null;
  trato?: number | null;
  recomendaria?: boolean | null;
  comentario?: string | null;
  fecha?: string | null;
}


export interface ServiceProfessional {
  id: number;
  nombre: string;
  foto_url?: string | null;
  profesion?: string | null;
  especialidad?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  zona_servicio?: string | null;
  disponible: boolean;
  verificado: boolean;
  calificacion_promedio: number;
  total_servicios: number;
}

export interface ServiceOffering {
  id: number;
  trabajador_id: number;
  categoria: string;
  titulo: string;
  descripcion?: string | null;
  precio_desde?: number | null;
  duracion_minutos?: number | null;
  modalidad: 'domicilio' | 'taller' | 'ambos';
  activo: boolean;
  fecha_actualizacion?: string | null;
  profesional?: ServiceProfessional | null;
}

export interface ServiceRequest {
  id: number;
  servicio: string;
  descripcion: string;
  estado: string;
  finalizacion_estado?: CompletionState;
  urgencia: string;
  fecha_creacion?: string | null;
  fecha_preferida?: string | null;
  hora_preferida?: string | null;
  presupuesto?: number | null;
  mensajes_no_leidos?: number;
  cliente?: { nombre: string; foto_url?: string | null } | null;
  trabajador?: { nombre: string; foto_url?: string | null; especialidad?: string | null } | null;
  ciudad?: string | null;
  estado_dir?: string | null;
  distancia_km?: number | null;
  cliente_nombre?: string;
  direccion?: string | null;
  calle?: string | null;
  numero?: string | null;
  colonia?: string | null;
  codigo_postal?: string | null;
  instrucciones?: string | null;
  metodo_pago?: PaymentMethod | string | null;
  directa?: boolean;
  imagenes_url?: string[];
}
export type CompletionState = 'no_solicitada' | 'solicitada' | 'correccion_solicitada' | 'confirmada';

export interface CompletionEvidence {
  id: number;
  tipo: 'finalizacion' | string;
  url?: string | null;
  fecha?: string | null;
}

export interface CompletionInfo {
  state: CompletionState;
  notes?: string | null;
  correction_reason?: string | null;
  requested_at?: string | null;
  confirmed_at?: string | null;
  evidences: CompletionEvidence[];
  can_start: boolean;
  can_request: boolean;
  can_review: boolean;
  completed: boolean;
}

export interface RequestEvent {
  id: number;
  evento: string;
  titulo: string;
  descripcion?: string | null;
  fecha?: string | null;
  actor_nombre?: string | null;
  actor_apellidos?: string | null;
}

export interface RequestDetailResponse {
  request: ServiceRequest & Record<string, any>;
  events: RequestEvent[];
  completion: CompletionInfo;
}

export interface HomeStats {
  profesionales: number;
  servicios_completados: number;
  clientes: number;
  calificacion: number;
}

export interface HomeProfessional {
  id: number;
  nombre: string;
  foto_url?: string | null;
  especialidad?: string | null;
  ciudad?: string | null;
  estado?: string | null;
  calificacion: number;
  servicios: number;
  verificado: boolean;
  disponible: boolean;
}

export interface HomeReview {
  id: number;
  puntuacion: number;
  comentario: string;
  cliente: string;
  especialidad?: string | null;
  fecha?: string | null;
}

export interface HomeData {
  stats: HomeStats;
  featured_professionals: HomeProfessional[];
  reviews: HomeReview[];
}

export type PaymentMethod = 'efectivo' | 'mercadopago';
export type PaymentState = 'creado' | 'pendiente' | 'procesando' | 'pagado' | 'fallido' | 'cancelado' | 'reembolsado';

export interface PaymentAttempt {
  id: number;
  method: PaymentMethod;
  state: PaymentState;
  provider: string;
  provider_status?: string | null;
  provider_status_detail?: string | null;
  preference_id?: string | null;
  provider_payment_id?: string | null;
  checkout_url?: string | null;
  external_reference?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  paid_at?: string | null;
  commission_amount?: number | null;
  worker_amount?: number | null;
  split_applied?: boolean;
  simulation: boolean;
}

export interface PaymentStatusResponse {
  request_id: number;
  method: PaymentMethod | '';
  state: PaymentState;
  paid: boolean;
  amount?: number | null;
  commission_rate?: number | null;
  commission_amount?: number | null;
  worker_amount?: number | null;
  split_applied?: boolean;
  quote_state: string;
  service_state: string;
  cash_client_declared: boolean;
  cash_worker_confirmed: boolean;
  payment?: PaymentAttempt | null;
  refresh?: { ok: boolean; state?: string | null; reason?: string | null } | null;
}

export interface PaymentCheckoutResponse {
  request_id: number;
  checkout_url: string;
  simulation: boolean;
  reused: boolean;
  attempt_id: number;
  public_callbacks: boolean;
  commission_rate?: number;
  commission_amount?: number;
  worker_amount?: number;
}

// Asistente NAXVO IA con respaldo de ayuda guiada si falta configuración.
export interface HelpBotAnswer {
  mode?: 'ai' | 'guided';
  intent: string;
  reply: string;
  suggestions: string[];
  action: { label: string; route: string } | null;
}
