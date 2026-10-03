// Catálogos de dominio finito para los selectores del frontend.
// Fuente canónica en la UI: evitan texto libre en campos que el importador
// GrupLAC/CvLAC ya llena con valores conocidos (clasificaciones, roles, etc.).
// Los combobox "flexibles" aceptan valores fuera de la lista (datos históricos),
// pero siempre sugieren estos valores primero.

/**
 * Clasificación de grupos según el Modelo de Medición 2024 (cap. III):
 * A1, A, B, C y "Reconocido" (registrado en GrupLAC sin clasificación).
 * La categoría D ya no existe en el modelo 2024.
 */
export const GROUP_CLASSIFICATIONS = ['A1', 'A', 'B', 'C', 'Reconocido']

/** Tipos de documento de identidad (Colombia). */
export const IDENTIFICATION_TYPES = ['CC', 'CE', 'TI', 'PA', 'PPT', 'NIT']

/** Nivel máximo de formación académica. */
export const EDUCATION_LEVELS = [
  'Pregrado',
  'Especialización',
  'Maestría',
  'Doctorado',
  'Postdoctorado',
]

/**
 * Roles de vinculación a un grupo. Los dos primeros son los que realmente
 * produce el importador GrupLAC (verificado en BD: 179 membresías 'Integrante').
 * El resto cubre la tipología de investigadores del modelo Minciencias
 * (Emérito / Senior / Asociado / Junior) y roles frecuentes de captura manual.
 */
export const MEMBER_ROLES = [
  'Integrante',
  'Líder',
  'Investigador',
  'Coinvestigador',
  'Joven Investigador',
  'Investigador Junior',
  'Investigador Asociado',
  'Investigador Senior',
  'Investigador Emérito',
  'Estudiante',
  'Integrante Vinculado',
  'Administrativo',
]

/**
 * Tipos de proyecto: valores reales que GrupLAC publica y el importador guarda
 * (verificado en BD: 309 'Investigación y desarrollo', 102 'Investigación,
 * desarrollo e Innovación', 57 'Extensión y responsabilidad social CTI',
 * 12 'Investigación-Creación').
 */
export const PROJECT_TYPES = [
  'Investigación y desarrollo',
  'Investigación, desarrollo e Innovación',
  'Investigación-Creación',
  'Extensión y responsabilidad social CTI',
]

/** Tipos de financiación de proyectos. */
export const FUNDING_TYPES = [
  'Interna',
  'Externa nacional',
  'Externa internacional',
  'Cofinanciada',
  'Sin financiación',
]

/** Idiomas más frecuentes en producción científica. */
export const LANGUAGES = [
  'Español',
  'Inglés',
  'Portugués',
  'Francés',
  'Alemán',
  'Italiano',
  'Catalán',
  'Ruso',
  'Chino',
  'Japonés',
]

/**
 * Nacionalidades (gentilicios). La BD usa gentilicios, no países
 * (verificado: 165 'Colombiana', 1 'Venezolana'). Lista corta de los más
 * frecuentes en el contexto UPC; el combobox flexible acepta otros.
 */
export const NATIONALITIES = [
  'Colombiana',
  'Venezolana',
  'Argentina',
  'Brasileña',
  'Chilena',
  'Peruana',
  'Ecuatoriana',
  'Mexicana',
  'Panameña',
  'Costarricense',
  'Cubana',
  'Dominicana',
  'Española',
  'Estadounidense',
  'Canadiense',
  'Británica',
  'Francesa',
  'Alemana',
  'Italiana',
  'Portuguesa',
  'China',
  'Japonesa',
  'India',
  'Australiana',
]

/** Países (ISO 3166, nombres en español). Colombia primero por frecuencia. */
export const COUNTRIES = [
  'Colombia',
  'Argentina',
  'Brasil',
  'Chile',
  'México',
  'Perú',
  'Ecuador',
  'Venezuela',
  'Bolivia',
  'Paraguay',
  'Uruguay',
  'Panamá',
  'Costa Rica',
  'Cuba',
  'República Dominicana',
  'Guatemala',
  'Honduras',
  'El Salvador',
  'Nicaragua',
  'Puerto Rico',
  'España',
  'Estados Unidos',
  'Canadá',
  'Reino Unido',
  'Francia',
  'Alemania',
  'Italia',
  'Portugal',
  'Países Bajos',
  'Bélgica',
  'Suiza',
  'Suecia',
  'Noruega',
  'Dinamarca',
  'Finlandia',
  'Irlanda',
  'Austria',
  'Polonia',
  'República Checa',
  'Hungría',
  'Grecia',
  'Rusia',
  'Ucrania',
  'Turquía',
  'Israel',
  'China',
  'Japón',
  'Corea del Sur',
  'India',
  'Australia',
  'Nueva Zelanda',
  'Sudáfrica',
  'Egipto',
]

/**
 * Grandes áreas de conocimiento OCDE (Anexo 5 del Modelo de Medición 2024).
 * La clasificación OCDE tiene 3 niveles (Gran Área / Área / Disciplina) y el
 * importador guarda la ruta completa concatenada, p.ej.:
 * 'Ingeniería y Tecnología -- Ingenierías Eléctrica, Electrónica e Informática
 *  -- Ingeniería de Sistemas y Comunicaciones'.
 * El selector sugiere solo la gran área y acepta la ruta completa como texto
 * libre (el árbol completo son ~300 disciplinas: desproporcionado aquí).
 */
export const GRAND_AREAS_OCDE = [
  'Ciencias Naturales',
  'Ingeniería y Tecnología',
  'Ciencias Médicas y de la Salud',
  'Ciencias Agrícolas',
  'Ciencias Sociales',
  'Humanidades',
]

/** Departamentos de Colombia (32) + distrito capital. */
export const DEPARTMENTS = [
  'Amazonas',
  'Antioquia',
  'Arauca',
  'Atlántico',
  'Bogotá D.C.',
  'Bolívar',
  'Boyacá',
  'Caldas',
  'Caquetá',
  'Casanare',
  'Cauca',
  'Cesar',
  'Chocó',
  'Córdoba',
  'Cundinamarca',
  'Guainía',
  'Guaviare',
  'Huila',
  'La Guajira',
  'Magdalena',
  'Meta',
  'Nariño',
  'Norte de Santander',
  'Putumayo',
  'Quindío',
  'Risaralda',
  'San Andrés y Providencia',
  'Santander',
  'Sucre',
  'Tolima',
  'Valle del Cauca',
  'Vaupés',
  'Vichada',
]
