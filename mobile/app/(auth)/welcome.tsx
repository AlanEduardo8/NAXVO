import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getHome } from '@/api';
import { useTheme } from '@/context/ThemeContext';
import type { HomeData, HomeProfessional, HomeReview } from '@/types/api';

/** Los perfiles oficiales se configuran cuando se proporcionen sus URLs verificadas. */
function openSocial(network:'facebook'|'instagram'|'twitter'){
  const urls={
    facebook:process.env.EXPO_PUBLIC_NAXVO_FACEBOOK_URL,
    instagram:process.env.EXPO_PUBLIC_NAXVO_INSTAGRAM_URL,
    twitter:process.env.EXPO_PUBLIC_NAXVO_TWITTER_URL,
  };
  const url=urls[network];
  if(!url || !/^https:\/\//i.test(url)){
    Alert.alert('Redes sociales','La dirección oficial de esta red aún no está configurada.');
    return;
  }
  void Linking.openURL(url).catch(()=>Alert.alert('Redes sociales','No se pudo abrir el enlace.'));
}

const SERVICES = [
  { name: 'Plomería', mark: 'PL', desc: 'Fugas, tuberías, instalaciones, baños y mantenimiento hidráulico.', image: require('../../assets/services/plomeria.png') },
  { name: 'Electricidad', mark: 'EL', desc: 'Instalaciones, fallas, contactos, iluminación y mantenimiento eléctrico.', image: require('../../assets/services/electricidad.png') },
  { name: 'Carpintería', mark: 'CA', desc: 'Muebles, puertas, reparaciones y trabajos personalizados en madera.', image: require('../../assets/services/carpinteria.png') },
  { name: 'Pintura', mark: 'PI', desc: 'Interiores, exteriores, retoques, preparación y renovación de espacios.', image: require('../../assets/services/pintura.png') },
  { name: 'Jardinería', mark: 'JA', desc: 'Mantenimiento, poda, limpieza y cuidado de áreas verdes.', image: require('../../assets/services/jardineria.png') },
  { name: 'Albañilería', mark: 'AL', desc: 'Reparaciones, acabados, muros y trabajos generales de construcción.', image: require('../../assets/services/albanileria.png') },
  { name: 'Electrodomésticos', mark: 'ED', desc: 'Diagnóstico, mantenimiento y reparación de equipos del hogar.', image: require('../../assets/services/electrodomesticos.png') },
  { name: 'Mantenimiento', mark: 'MT', desc: 'Soluciones generales para conservar tu hogar o negocio en buen estado.', image: require('../../assets/services/mantenimiento.png') },
] as const;

const STEPS = [
  ['01', 'Publica tu necesidad', 'Describe el trabajo, agrega fotografías, dirección, urgencia y la fecha que prefieres.'],
  ['02', 'Conecta y cotiza', 'Elige un profesional o recibe atención compatible. Revisa monto, fecha y detalle antes de aceptar.'],
  ['03', 'Sigue el servicio', 'Usa el chat, recibe notificaciones y consulta ETA o ubicación cuando el profesional va en camino.'],
  ['04', 'Confirma y califica', 'Revisa evidencias, confirma el cierre y comparte una reseña ligada al servicio realizado.'],
] as const;

const BENEFITS = [
  ['shield-checkmark-outline', 'Profesionales verificados', 'Consulta experiencia, reputación, portafolio y trabajos realizados.'],
  ['document-text-outline', 'Acuerdos registrados', 'Cotizaciones, cambios, aceptación y agenda vinculados a la solicitud.'],
  ['navigate-circle-outline', 'Seguimiento transparente', 'Estados claros para solicitud, cotización, pago y finalización.'],
  ['star-outline', 'Reputación por trabajos', 'Las calificaciones se relacionan con servicios reales dentro de NAXVO.'],
  ['location-outline', 'Privacidad de ubicación', 'La ubicación se comparte durante el trayecto y con autorización.'],
  ['headset-outline', 'Historial y soporte', 'Eventos, evidencias y reportes permanecen disponibles para seguimiento.'],
] as const;

const FAQS = [
  ['¿Cómo solicito un servicio?', 'Crea tu cuenta, indica qué necesitas y agrega dirección, fotos y horario. Después podrás elegir un profesional o publicar la solicitud.'],
  ['¿Cómo sé cuánto voy a pagar?', 'El profesional envía una cotización dentro de NAXVO. Puedes revisarla antes de confirmar el trabajo.'],
  ['¿Los profesionales están verificados?', 'Los perfiles habilitados para recibir solicitudes públicas pasan por un proceso de verificación y muestran su estado en el perfil.'],
  ['¿Puedo comunicarme con el profesional?', 'Sí. Cuando existe una asignación, el chat del servicio mantiene la conversación asociada al trabajo.'],
  ['¿Puedo seguir la llegada del profesional?', 'Cuando el profesional va en camino puede compartir ETA y ubicación durante el trayecto.'],
  ['¿Cómo funcionan los pagos y reseñas?', 'El pago y el estado del servicio se mantienen separados. Al finalizar puedes confirmar el cierre y dejar una reseña.'],
] as const;

const EMPTY_HOME: HomeData = {
  stats: { profesionales: 0, servicios_completados: 0, clientes: 0, calificacion: 0 },
  featured_professionals: [],
  reviews: [],
};

function SectionHeader({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  const { palette } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.eyebrow, { color: palette.primary }]}>{eyebrow.toUpperCase()}</Text>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>{title}</Text>
      {text ? <Text style={[styles.sectionText, { color: palette.muted }]}>{text}</Text> : null}
    </View>
  );
}

function PrimaryAction({ title, secondary = false, icon, onPress }: { title: string; secondary?: boolean; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        secondary
          ? { backgroundColor: palette.surface2, borderColor: palette.border }
          : { backgroundColor: palette.primary, borderColor: palette.primary },
        pressed && { opacity: 0.82 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={secondary ? palette.text : palette.primaryText} /> : null}
      <Text style={[styles.actionText, { color: secondary ? palette.text : palette.primaryText }]}>{title}</Text>
    </Pressable>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.metric, { borderColor: palette.border }]}>
      <Text style={[styles.metricValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: palette.muted }]}>{label}</Text>
    </View>
  );
}

function ProfessionalCard({ item }: { item: HomeProfessional }) {
  const { palette } = useTheme();
  const location = [item.ciudad, item.estado].filter(Boolean).join(', ');
  return (
    <View style={[styles.proCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.proTop}>
        {item.foto_url ? (
          <Image source={{ uri: item.foto_url }} style={styles.proAvatar} />
        ) : (
          <View style={[styles.proAvatarFallback, { backgroundColor: palette.surface2 }]}>
            <Text style={[styles.proAvatarLetter, { color: palette.text }]}>{item.nombre.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
        {item.verificado ? (
          <View style={[styles.verifiedPill, { borderColor: palette.primary }]}> 
            <Ionicons name="shield-checkmark" color={palette.primary} size={14} />
            <Text style={[styles.verifiedText, { color: palette.primary }]}>Verificado</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.proName, { color: palette.text }]}>{item.nombre}</Text>
      <Text numberOfLines={1} style={[styles.proSpecialty, { color: palette.primary }]}>{item.especialidad || 'Profesional'}</Text>
      {location ? <Text numberOfLines={1} style={[styles.proLocation, { color: palette.muted }]}>{location}</Text> : null}
      <View style={styles.proStats}>
        <Text style={[styles.proStat, { color: palette.text }]}>{item.calificacion > 0 ? `${item.calificacion.toFixed(1)} ★` : 'Nuevo'}</Text>
        <Text style={[styles.proStat, { color: palette.text }]}>{item.servicios} servicios</Text>
      </View>
      <Pressable onPress={() => router.push('/(auth)/register')} style={[styles.smallButton, { borderColor: palette.border, backgroundColor: palette.surface2 }]}>
        <Text style={[styles.smallButtonText, { color: palette.text }]}>Crear cuenta para ver perfil</Text>
      </Pressable>
    </View>
  );
}

function ReviewCard({ item }: { item: HomeReview }) {
  const { palette } = useTheme();
  const stars = Math.max(1, Math.min(5, item.puntuacion || 0));
  return (
    <View style={[styles.reviewCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={styles.stars}>{'★'.repeat(stars)}<Text style={{ color: palette.border }}>{'★'.repeat(5 - stars)}</Text></Text>
      <Text style={[styles.reviewQuote, { color: palette.text }]}>“{item.comentario}”</Text>
      <Text style={[styles.reviewClient, { color: palette.text }]}>{item.cliente}</Text>
      {item.especialidad ? <Text style={[styles.reviewMeta, { color: palette.muted }]}>Servicio de {item.especialidad}</Text> : null}
    </View>
  );
}

export default function Welcome() {
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [home, setHome] = useState<HomeData>(EMPTY_HOME);
  const [openFaq, setOpenFaq] = useState(0);
  const compact = width < 380;
  const contentWidth = useMemo(() => Math.min(width - 28, 760), [width]);

  useEffect(() => {
    let active = true;
    getHome().then(data => { if (active) setHome(data); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const stats = home.stats;
  const rating = stats.calificacion > 0 ? `${stats.calificacion.toFixed(1)} ★` : '—';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: palette.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={[styles.page, { width: contentWidth }]}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <Image source={require('../../assets/logo-naxvo.png')} style={styles.brandLogo} />
              <Text style={[styles.brandName, { color: palette.text }]}>NAXVO</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable accessibilityLabel="Iniciar sesión" onPress={() => router.push('/(auth)/login')} style={[styles.headerIcon, { borderColor: palette.border, backgroundColor: palette.surface }]}>
                <Ionicons name="person-outline" size={18} color={palette.text} />
              </Pressable>
              {!compact ? (
                <Pressable onPress={() => router.push('/(auth)/register')} style={[styles.headerCreate, { backgroundColor: palette.primary }]}>
                  <Ionicons name="add" size={16} color={palette.primaryText} />
                  <Text style={[styles.headerCreateText, { color: palette.primaryText }]}>Crear cuenta</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={[styles.hero, { borderColor: palette.border, backgroundColor: palette.surface }]}> 
            <View style={[styles.heroGlow, { backgroundColor: palette.primary }]} />
            <Text style={[styles.eyebrow, { color: '#58E6C2' }]}>●  SERVICIOS PARA HOGAR Y NEGOCIO</Text>
            <Text style={[styles.heroTitle, { color: palette.text }]}>Encuentra ayuda profesional y <Text style={{ color: palette.primary }}>resuelve mejor.</Text></Text>
            <Text style={[styles.heroText, { color: palette.muted }]}>NAXVO conecta clientes con profesionales verificados para solicitar, cotizar, coordinar, pagar y dar seguimiento a un servicio desde un solo lugar.</Text>

            <View style={[styles.heroLogoCard, { borderColor: palette.border, backgroundColor: '#050407' }]}>
              <View style={[styles.logoHalo, { backgroundColor: palette.primary }]} />
              <Image source={require('../../assets/logo-naxvo.png')} resizeMode="contain" style={styles.heroLogo} />
            </View>

            <View style={styles.heroActions}>
              <PrimaryAction title="Solicitar un servicio" icon="construct-outline" onPress={() => router.push({ pathname: '/(auth)/register', params: { tipo: 'cliente' } })} />
              <PrimaryAction title="Quiero ofrecer servicios" icon="briefcase-outline" secondary onPress={() => router.push({ pathname: '/(auth)/register', params: { tipo: 'trabajador' } })} />
            </View>

            <View style={styles.trustList}>
              {['Perfiles verificados', 'Cotizaciones dentro de la plataforma', 'Chat y seguimiento'].map(text => (
                <View key={text} style={styles.trustItem}>
                  <Ionicons name="checkmark" size={16} color="#58E6C2" />
                  <Text style={[styles.trustText, { color: palette.text }]}>{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.metricsGrid, { borderColor: palette.border }]}>
            <Metric value={`${stats.profesionales}+`} label="Profesionales verificados" />
            <Metric value={`${stats.servicios_completados}+`} label="Servicios completados" />
            <Metric value={`${stats.clientes}+`} label="Clientes registrados" />
            <Metric value={rating} label="Calificación promedio" />
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Servicios" title="Lo que necesitas, en un solo lugar." text="Desde una reparación urgente hasta mantenimiento programado. Estas categorías son informativas en la portada; la búsqueda real se habilita al iniciar sesión." />
            <View style={styles.serviceGrid}>
              {SERVICES.map(service => (
                <View key={service.name} accessibilityRole="summary" style={[styles.serviceCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={[styles.serviceMark, { backgroundColor: palette.surface2, borderColor: palette.primary }]}>
                    <Text style={[styles.serviceMarkText, { color: palette.text }]}>{service.mark}</Text>
                  </View>
                  <Text style={[styles.serviceTitle, { color: palette.text }]}>{service.name}</Text>
                  <View style={[styles.serviceImageWrap, { borderColor: palette.border, backgroundColor: '#130A21' }]}>
                    <Image source={service.image} resizeMode="contain" style={styles.serviceImage} />
                  </View>
                  <Text style={[styles.serviceDesc, { color: palette.muted }]}>{service.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Cómo funciona" title="Del problema a la solución, sin perder el control." text="Cada etapa queda organizada para que sepas qué ocurrió, qué falta y cuál es la siguiente acción." />
            <View style={styles.stackGap}>
              {STEPS.map(([number, title, text]) => (
                <View key={number} style={[styles.stepCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <View style={[styles.stepNumber, { backgroundColor: palette.primary }]}><Text style={[styles.stepNumberText, { color: palette.primaryText }]}>{number}</Text></View>
                  <View style={styles.stepCopy}>
                    <Text style={[styles.stepTitle, { color: palette.text }]}>{title}</Text>
                    <Text style={[styles.stepText, { color: palette.muted }]}>{text}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Una sola experiencia" title="No solo encuentres a alguien. Gestiona todo el servicio." text="El acuerdo, la comunicación, el avance y el cierre permanecen organizados dentro de NAXVO." />
            <View style={styles.checkList}>
              {[
                ['receipt-outline', 'Cotización clara', 'Revisa el precio y la agenda antes de aceptar.'],
                ['chatbubbles-outline', 'Comunicación centralizada', 'Chat y notificaciones vinculados al servicio.'],
                ['navigate-outline', 'Seguimiento de llegada', 'ETA y ubicación opcional durante el trayecto.'],
                ['camera-outline', 'Cierre con evidencia', 'Resultado, pago, reseña e historial en el mismo expediente.'],
              ].map(([icon, title, text]) => (
                <View key={title} style={styles.checkRow}>
                  <View style={[styles.checkIcon, { backgroundColor: palette.surface2 }]}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={palette.primary} /></View>
                  <View style={styles.checkCopy}><Text style={[styles.checkTitle, { color: palette.text }]}>{title}</Text><Text style={[styles.checkText, { color: palette.muted }]}>{text}</Text></View>
                </View>
              ))}
            </View>

            <View style={[styles.trackingCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
              <View style={styles.trackingTop}><View style={styles.trackingStatus}><View style={styles.liveDot}/><Text style={[styles.trackingLabel, { color: palette.text }]}>Servicio activo</Text></View><Text style={[styles.trackingCode, { color: palette.muted }]}>#NAXVO</Text></View>
              <View style={styles.trackingService}><View style={[styles.trackingIcon, { backgroundColor: palette.surface2 }]}><Ionicons name="flash" size={26} color={palette.primary}/></View><View><Text style={[styles.trackingTitle, { color: palette.text }]}>Electricidad</Text><Text style={[styles.trackingSubtitle, { color: palette.muted }]}>Profesional asignado</Text></View></View>
              <View style={styles.progressRow}>{[0,1,2,3,4].map(i=><View key={i} style={[styles.progressPart, { backgroundColor: i < 4 ? palette.primary : palette.border }]}/>)}</View>
              <View style={styles.trackingEta}><Text style={[styles.trackingEtaText, { color: palette.text }]}>Profesional en camino</Text><Text style={[styles.trackingMinutes, { color: palette.primary }]}>18 min</Text></View>
              <View style={[styles.mapMock, { backgroundColor: palette.surface2, borderColor: palette.border }]}>
                <View style={[styles.road, styles.roadOne, { backgroundColor: palette.border }]}/><View style={[styles.road, styles.roadTwo, { backgroundColor: palette.border }]}/>
                <View style={[styles.mapPin, styles.pinHome, { backgroundColor: palette.primary }]}><Ionicons name="home" size={17} color={palette.primaryText}/></View>
                <View style={[styles.mapPin, styles.pinPro, { backgroundColor: '#58E6C2' }]}><Ionicons name="construct" size={17} color="#071510"/></View>
              </View>
              <View style={styles.trackingFooter}><Text style={[styles.trackingFootText, { color: palette.muted }]}>Pago protegido por estado</Text><Text style={[styles.trackingFootText, { color: palette.muted }]}>Chat disponible</Text></View>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Por qué NAXVO" title="Más claridad para clientes. Más oportunidades para profesionales." />
            <View style={styles.benefitGrid}>
              {BENEFITS.map(([icon, title, text]) => (
                <View key={title} style={[styles.benefitCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={25} color={palette.primary} />
                  <Text style={[styles.benefitTitle, { color: palette.text }]}>{title}</Text>
                  <Text style={[styles.benefitText, { color: palette.muted }]}>{text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Profesionales" title="Conoce perfiles disponibles en NAXVO." text="Los perfiles verificados y activos pueden aparecer aquí automáticamente." />
            {home.featured_professionals.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalCards}>
                {home.featured_professionals.map(item => <ProfessionalCard key={item.id} item={item} />)}
              </ScrollView>
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Ionicons name="people-outline" size={30} color={palette.primary}/>
                <Text style={[styles.emptyTitle, { color: palette.text }]}>Los profesionales verificados aparecerán aquí.</Text>
                <Text style={[styles.emptyText, { color: palette.muted }]}>Cuando existan perfiles activos, NAXVO mostrará automáticamente los más relevantes.</Text>
              </View>
            )}
            <PrimaryAction title="Explorar NAXVO" icon="search-outline" secondary onPress={() => router.push('/(auth)/register')} />
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Reseñas" title="Experiencias vinculadas a servicios reales." text="Las opiniones públicas se obtienen de calificaciones registradas después de un servicio." />
            {home.reviews.length ? home.reviews.map(item => <ReviewCard key={item.id} item={item}/>) : (
              <View style={[styles.emptyCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
                <Text style={styles.emptyStars}>★★★★★</Text>
                <Text style={[styles.emptyTitle, { color: palette.text }]}>Las reseñas verificadas se mostrarán aquí.</Text>
                <Text style={[styles.emptyText, { color: palette.muted }]}>Se alimentarán automáticamente conforme los clientes completen servicios y compartan su experiencia.</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Confianza y seguridad" title="Información importante protegida por diseño." text="NAXVO limita quién puede acceder a datos sensibles y conserva un historial de acciones relevantes." />
            <View style={styles.stackGap}>
              {[
                ['lock-closed-outline','Dirección protegida','La dirección completa no se muestra públicamente a profesionales sin asignación.'],
                ['shield-outline','Documentos privados','La documentación de verificación se mantiene fuera de la carpeta pública.'],
                ['card-outline','Pagos separados del servicio','El estado financiero no se mezcla con el avance operativo del trabajo.'],
                ['list-outline','Auditoría y reportes','Los eventos principales pueden conservarse para soporte y revisión administrativa.'],
              ].map(([icon,title,text])=>(
                <View key={title} style={[styles.safetyRow,{backgroundColor:palette.surface,borderColor:palette.border}]}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={palette.primary}/><View style={styles.safetyCopy}><Text style={[styles.safetyTitle,{color:palette.text}]}>{title}</Text><Text style={[styles.safetyText,{color:palette.muted}]}>{text}</Text></View></View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Preguntas frecuentes" title="Antes de empezar." />
            <View style={styles.stackGap}>
              {FAQS.map(([question, answer], index) => {
                const open = openFaq === index;
                return <Pressable key={question} onPress={()=>setOpenFaq(open ? -1 : index)} style={[styles.faqItem,{backgroundColor:palette.surface,borderColor:palette.border}]}>
                  <View style={styles.faqHead}><Text style={[styles.faqQuestion,{color:palette.text}]}>{question}</Text><Ionicons name={open?'remove':'add'} size={22} color={palette.primary}/></View>
                  {open?<Text style={[styles.faqAnswer,{color:palette.muted}]}>{answer}</Text>:null}
                </Pressable>;
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Contacto" title="Contacta con nosotros" text="¿Tienes una duda, necesitas ayuda o quieres más información sobre NAXVO?" />
            <View style={styles.stackGap}>
              <Pressable onPress={()=>Linking.openURL('mailto:naxvo1709@gmail.com').catch(()=>Alert.alert('Contacto','Escríbenos a naxvo1709@gmail.com'))} style={[styles.contactRow,{backgroundColor:palette.surface,borderColor:palette.border}]}><Ionicons name="mail-outline" size={24} color={palette.primary}/><View><Text style={[styles.contactTitle,{color:palette.text}]}>Correo electrónico</Text><Text style={[styles.contactValue,{color:palette.muted}]}>naxvo1709@gmail.com</Text></View></Pressable>
              <Pressable onPress={()=>openSocial('facebook')} style={[styles.contactRow,{backgroundColor:palette.surface,borderColor:palette.border}]}><Ionicons name="logo-facebook" size={24} color={palette.primary}/><View><Text style={[styles.contactTitle,{color:palette.text}]}>Facebook</Text><Text style={[styles.contactValue,{color:palette.muted}]}>Encuéntranos en Facebook</Text></View></Pressable>
              <Pressable onPress={()=>openSocial('instagram')} style={[styles.contactRow,{backgroundColor:palette.surface,borderColor:palette.border}]}><Ionicons name="logo-instagram" size={24} color={palette.primary}/><View><Text style={[styles.contactTitle,{color:palette.text}]}>Instagram</Text><Text style={[styles.contactValue,{color:palette.muted}]}>Síguenos en Instagram</Text></View></Pressable>
            </View>
          </View>

          <View style={[styles.finalCta, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Image source={require('../../assets/logo-naxvo.png')} style={styles.finalLogo}/>
            <Text style={[styles.finalTitle,{color:palette.text}]}>Tu hogar, en buenas manos.</Text>
            <Text style={[styles.finalText,{color:palette.muted}]}>Crea tu cuenta y administra tus servicios desde una sola aplicación.</Text>
            <PrimaryAction title="Crear cuenta" icon="person-add-outline" onPress={()=>router.push('/(auth)/register')}/>
            <PrimaryAction title="Iniciar sesión" icon="log-in-outline" secondary onPress={()=>router.push('/(auth)/login')}/>
          </View>

          <View style={styles.footer}>
            <View style={styles.footerSocials}>
              <Pressable accessibilityRole="link" accessibilityLabel="Instagram" onPress={()=>openSocial('instagram')}><Ionicons name="logo-instagram" size={22} color={palette.muted}/></Pressable>
              <Pressable accessibilityRole="link" accessibilityLabel="Facebook" onPress={()=>openSocial('facebook')}><Ionicons name="logo-facebook" size={22} color={palette.muted}/></Pressable>
              <Pressable accessibilityRole="link" accessibilityLabel="Twitter" onPress={()=>openSocial('twitter')}><Ionicons name="logo-twitter" size={22} color={palette.muted}/></Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 48 },
  page: { alignSelf: 'center', gap: 0 },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandLogo: { width: 40, height: 40, borderRadius: 12 },
  brandName: { fontSize: 21, fontWeight: '900', letterSpacing: 1.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: { width: 40, height: 40, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerCreate: { height: 40, borderRadius: 12, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  headerCreateText: { fontWeight: '900', fontSize: 13 },
  hero: { marginTop: 8, borderWidth: 1, borderRadius: 28, padding: 20, overflow: 'hidden' },
  heroGlow: { position: 'absolute', width: 210, height: 210, borderRadius: 105, opacity: 0.12, top: -100, right: -70 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  heroTitle: { fontSize: 43, lineHeight: 44, letterSpacing: -1.7, fontWeight: '900', marginTop: 18 },
  heroText: { fontSize: 15, lineHeight: 23, marginTop: 14 },
  heroLogoCard: { height: 250, borderWidth: 1, borderRadius: 26, marginTop: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoHalo: { position: 'absolute', width: 210, height: 210, borderRadius: 105, opacity: 0.18 },
  heroLogo: { width: '78%', height: '78%' },
  heroActions: { gap: 10, marginTop: 18 },
  action: { minHeight: 50, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 15 },
  actionText: { fontWeight: '900', fontSize: 14 },
  trustList: { marginTop: 18, gap: 9 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trustText: { fontSize: 13, fontWeight: '700' },
  metricsGrid: { marginTop: 14, borderWidth: 1, borderRadius: 22, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' },
  metric: { width: '50%', minHeight: 100, padding: 16, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center' },
  metricValue: { fontSize: 27, fontWeight: '900', letterSpacing: -0.5 },
  metricLabel: { marginTop: 5, fontSize: 12, lineHeight: 16 },
  section: { paddingTop: 54 },
  sectionHeader: { gap: 8, marginBottom: 20 },
  sectionTitle: { fontSize: 32, lineHeight: 35, letterSpacing: -1, fontWeight: '900' },
  sectionText: { fontSize: 14, lineHeight: 22 },
  serviceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 20, padding: 12, minWidth: 150 },
  serviceMark: { width: 34, height: 34, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  serviceMarkText: { fontSize: 10, fontWeight: '900' },
  serviceTitle: { fontSize: 16, fontWeight: '900', textAlign: 'center', marginVertical: 12 },
  serviceImageWrap: { aspectRatio: 1, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  serviceImage: { width: '94%', height: '94%' },
  serviceDesc: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  stackGap: { gap: 10 },
  stepCard: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', gap: 13 },
  stepNumber: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontWeight: '900', fontSize: 13 },
  stepCopy: { flex: 1, gap: 5 },
  stepTitle: { fontWeight: '900', fontSize: 16 },
  stepText: { fontSize: 13, lineHeight: 20 },
  checkList: { gap: 15, marginBottom: 18 },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  checkIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  checkCopy: { flex: 1, gap: 3 },
  checkTitle: { fontWeight: '900', fontSize: 15 },
  checkText: { lineHeight: 19, fontSize: 13 },
  trackingCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 16 },
  trackingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackingStatus: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#58E6C2' },
  trackingLabel: { fontWeight: '800', fontSize: 13 },
  trackingCode: { fontSize: 11, fontWeight: '800' },
  trackingService: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  trackingIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  trackingTitle: { fontWeight: '900', fontSize: 18 },
  trackingSubtitle: { fontSize: 12, marginTop: 2 },
  progressRow: { flexDirection: 'row', gap: 5 },
  progressPart: { flex: 1, height: 5, borderRadius: 99 },
  trackingEta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackingEtaText: { fontWeight: '800' },
  trackingMinutes: { fontWeight: '900', fontSize: 18 },
  mapMock: { height: 145, borderWidth: 1, borderRadius: 17, overflow: 'hidden' },
  road: { position: 'absolute', height: 8, borderRadius: 99, opacity: 0.8 },
  roadOne: { width: '120%', top: 61, left: -20, transform: [{ rotate: '-12deg' }] },
  roadTwo: { width: '90%', top: 78, left: 35, transform: [{ rotate: '38deg' }] },
  mapPin: { position: 'absolute', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  pinHome: { right: 34, top: 27 },
  pinPro: { left: 44, bottom: 25 },
  trackingFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  trackingFootText: { fontSize: 11, flex: 1 },
  benefitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  benefitCard: { width: '48%', flexGrow: 1, minWidth: 150, borderWidth: 1, borderRadius: 18, padding: 15, gap: 8 },
  benefitTitle: { fontWeight: '900', lineHeight: 20 },
  benefitText: { fontSize: 12, lineHeight: 18 },
  horizontalCards: { gap: 12, paddingRight: 8, paddingBottom: 4 },
  proCard: { width: 250, borderWidth: 1, borderRadius: 20, padding: 15 },
  proTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  proAvatar: { width: 62, height: 62, borderRadius: 19 },
  proAvatarFallback: { width: 62, height: 62, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  proAvatarLetter: { fontSize: 24, fontWeight: '900' },
  verifiedPill: { borderWidth: 1, borderRadius: 99, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5 },
  verifiedText: { fontSize: 10, fontWeight: '900' },
  proName: { fontWeight: '900', fontSize: 18, marginTop: 13 },
  proSpecialty: { fontWeight: '800', fontSize: 13, marginTop: 3 },
  proLocation: { fontSize: 12, marginTop: 6 },
  proStats: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  proStat: { fontSize: 12, fontWeight: '800' },
  smallButton: { borderWidth: 1, borderRadius: 12, padding: 11, alignItems: 'center' },
  smallButtonText: { fontSize: 11, fontWeight: '900' },
  reviewCard: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 10 },
  stars: { color: '#F8CF55', letterSpacing: 2, fontSize: 17 },
  reviewQuote: { fontSize: 15, lineHeight: 22, fontWeight: '700', marginTop: 10 },
  reviewClient: { fontWeight: '900', marginTop: 14 },
  reviewMeta: { fontSize: 12, marginTop: 3 },
  emptyCard: { borderWidth: 1, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8, marginBottom: 12 },
  emptyTitle: { fontWeight: '900', fontSize: 16, textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  emptyStars: { color: '#F8CF55', fontSize: 19, letterSpacing: 2 },
  safetyRow: { borderWidth: 1, borderRadius: 17, padding: 15, flexDirection: 'row', gap: 12 },
  safetyCopy: { flex: 1, gap: 4 },
  safetyTitle: { fontWeight: '900' },
  safetyText: { fontSize: 12, lineHeight: 18 },
  faqItem: { borderWidth: 1, borderRadius: 16, padding: 15 },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  faqQuestion: { flex: 1, fontWeight: '900', fontSize: 14 },
  faqAnswer: { fontSize: 13, lineHeight: 20, marginTop: 12 },
  contactRow: { borderWidth: 1, borderRadius: 16, padding: 15, flexDirection: 'row', gap: 13, alignItems: 'center' },
  contactTitle: { fontWeight: '900' },
  contactValue: { fontSize: 12, marginTop: 3 },
  finalCta: { marginTop: 54, borderWidth: 1, borderRadius: 25, padding: 20, alignItems: 'center', gap: 10 },
  finalLogo: { width: 74, height: 74, borderRadius: 20 },
  finalTitle: { fontWeight: '900', fontSize: 25, textAlign: 'center' },
  finalText: { textAlign: 'center', lineHeight: 20, marginBottom: 4 },
  footer: { paddingVertical: 35, alignItems: 'center', gap: 10 },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerLogo: { width: 34, height: 34, borderRadius: 10 },
  footerName: { fontWeight: '900', letterSpacing: 1 },
  footerCopy: { fontSize: 11, textAlign: 'center' },
  footerSocials: { flexDirection: 'row', gap: 16, marginTop: 4 },
});
