/** Contexto PUBLICO de interfaz. Nunca incluye texto de formularios, identificadores ni datos privados. */
export type AssistantScreen = 'home' | 'search' | 'professional' | 'service' | 'request_new' |
  'requests' | 'request_detail' | 'payment' | 'notifications' | 'favorites' |
  'profile' | 'worker_services' | 'worker_jobs' | 'worker_portfolio' | 'admin' | 'general';

export type AssistantContext = { screen: AssistantScreen; title: string; hint: string; prompts: string[] };

export function getAssistantContext(pathname: string): AssistantContext {
  const p = pathname.toLowerCase();
  if (p.includes('/payment/')) return {screen:'payment',title:'Pagos',hint:'Puedo explicarte los métodos de pago y cómo revisar su estado; no realizo pagos.',prompts:['¿Cómo pago con Mercado Pago?','¿Dónde consulto el estado de un pago?']};
  if (p.includes('/request/new')) return {screen:'request_new',title:'Nueva solicitud',hint:'¿Quieres que te guíe para describir el servicio y crear tu solicitud?',prompts:['Guíame para crear una solicitud','¿Qué información debo escribir?']};
  if (p.includes('/request/')) return {screen:'request_detail',title:'Detalle de solicitud',hint:'Puedo explicar los estados, cotizaciones y siguientes pasos de tu solicitud.',prompts:['¿Qué significa el estado de mi solicitud?','¿Cómo respondo una cotización?']};
  if (p.includes('/professional/')) return {screen:'professional',title:'Perfil profesional',hint:'Te explico cómo evaluar un perfil y elegir al profesional adecuado.',prompts:['¿Qué debo revisar en un perfil?','¿Cómo contacto a un profesional?']};
  if (p.includes('/service/')) return {screen:'service',title:'Servicio publicado',hint:'Puedo ayudarte a entender la publicación antes de solicitar un servicio.',prompts:['¿Cómo solicito este servicio?','¿Qué incluye el precio desde?']};
  if (p.includes('/search')) return {screen:'search',title:'Buscar servicios',hint:'¿Te ayudo a encontrar un profesional o un servicio?',prompts:['¿Cómo busco a un electricista?','¿Cómo filtro los resultados?']};
  if (p.includes('/favorites')) return {screen:'favorites',title:'Favoritos',hint:'Aquí puedes volver a encontrar a tus profesionales favoritos.',prompts:['¿Cómo gestiono mis favoritos?']};
  if (p.includes('/notifications')) return {screen:'notifications',title:'Notificaciones',hint:'Puedo ayudarte a entender los avisos de la aplicación.',prompts:['¿Cómo consulto mis notificaciones?']};
  if (p.includes('/opportunities')) return {screen:'worker_jobs',title:'Oportunidades de trabajo',hint:'¿Necesitas ayuda para revisar o aceptar una oportunidad?',prompts:['¿Cómo acepto una solicitud?','¿Qué debo revisar antes de aceptar?']};
  if (p.includes('/portfolio')) return {screen:'worker_portfolio',title:'Portafolio',hint:'Te ayudo a mostrar tus trabajos y mejorar tu perfil profesional.',prompts:['¿Cómo agrego trabajos a mi portafolio?']};
  if (p.includes('/services')) return {screen:'worker_services',title:'Mis servicios',hint:'Puedo orientarte para publicar y administrar tus servicios.',prompts:['¿Cómo publico un servicio?','¿Cómo edito mis servicios?']};
  if (p.includes('/jobs')) return {screen:'worker_jobs',title:'Trabajos',hint:'Puedo explicarte las etapas de los servicios que tienes asignados.',prompts:['¿Cómo actualizo el estado del trabajo?']};
  if (p.includes('/requests')) return {screen:'requests',title:'Solicitudes',hint:'Te ayudo a consultar y entender tus solicitudes.',prompts:['¿Dónde están mis solicitudes?','¿Cómo funciona una cotización?']};
  if (p.includes('/admin') || p.includes('/dashboard') || p.includes('/users') || p.includes('/verifications') || p.includes('/reports')) return {screen:'admin',title:'Administración',hint:'Puedo explicar las herramientas administrativas, sin modificar registros por ti.',prompts:['¿Cómo reviso reportes?','¿Cómo verifico a un trabajador?']};
  if (p.includes('/profile') || p.includes('/settings')) return {screen:'profile',title:'Mi perfil',hint:'¿Necesitas ayuda con tu cuenta o los ajustes de accesibilidad?',prompts:['¿Cómo actualizo mi perfil?','¿Cómo activo funciones de accesibilidad?']};
  if (p.includes('/home') || p === '/') return {screen:'home',title:'Inicio',hint:'¡Estoy aquí para ayudarte a utilizar NAXVO!',prompts:['¿Qué puedo hacer en NAXVO?','¿Cómo funciona NAXVO?']};
  return {screen:'general',title:'NAXVO',hint:'¿Necesitas ayuda? Puedes preguntarme lo que quieras sobre NAXVO.',prompts:['¿Cómo funciona NAXVO?']};
}
