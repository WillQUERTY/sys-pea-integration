import logging
from datetime import datetime

# Configuración de Logging Estructurado
logger = logging.getLogger("peai.scraper")

# Constantes de Negocio y Validación
MIN_YEAR = 1900
MAX_YEAR = datetime.now().year + 1
ALLOWED_HOSTS = {
    "scienti.minciencias.gov.co",
    "minciencias.gov.co",
    "www.minciencias.gov.co",
    "localhost",
    "127.0.0.1"
}

GRUPLAC_SEARCH_URL = "https://scienti.minciencias.gov.co/ciencia-war/busquedaAvanzadaGrupos.do"

# Mapeo de secciones GrupLAC -> tipologías del modelo 2024
SECTION_MAP = [
    # --- FRH: Formacion de recurso humano ---
    ("trabajos dirigidos", "TD"),    # refinado por fila (TD/TM/TP)
    ("tesis", "TD"),                 # refinado por fila (TD/TM/TP)
    ("asesorias al programa ondas", "APO"),
    # --- DPC: Divulgacion publica de la ciencia ---
    ("contenido virtual", "PCD"),    # 2024 unifica los formatos digitales
    ("audiovisual", "PCD"),
    ("recursos graficos", "PCD"),
    ("contenido de audio", "PCD"),
    ("contenido multimedia", "PCD"),
    ("contenido digital", "PCD"),    # "Producciones de contenido digital - Sonoro"
    ("contenido impreso", "PEE"),
    ("publicaciones editoriales no especializadas", "PEE"),  # nombre exacto del Anexo 1
    ("generacion de contenido", "GC"),     # DESPUES de los contenidos especificos
    ("libros de divulgacion", "LIB_DIV"),
    ("libros de formacion", "LIB_FOR"),
    ("manuales y guias", "MAN_GUI"),
    ("desarrollo web", "DW"),
    ("estrategias de comunicacion", "TRM"),
    ("produccion de estrategias", "TRM"),
    ("estrategias y contenidos", "TRM"),
    ("ediciones", "ERL"),
    ("informe final", "IFI"),
    ("informes de investigacion", "IFI"),
    ("informes tecnicos", "INF"),
    ("consultorias", "CON_CT"),     # 2024 las ubica en DPC
    ("secuencias geneticas", "NSG"),
    ("boletines", "BOL"),
    ("redes de conocimiento", "RC"),
    ("talleres de creacion", "TC"),          # DPC en 2024
    ("documentos de trabajo", "WP"),         # DPC en 2024
    ("eventos artisticos", "ECA"),           # DPC en 2024 (trabajo artistico)
    ("eventos", "EC"),
    # --- GNC: Generacion de nuevo conocimiento ---
    ("otros articulos", None),          # catch-all dudoso -> sin clasificar
    ("articulos", "ART"),
    ("notas cientificas", "N"),
    ("otros libros", None),             # catch-all dudoso
    ("libros publicados", "LIB"),
    ("capitulos", "CAP_LIB"),
    ("nuevas variedades", "VV"),
    ("nuevas razas", "NRA"),
    ("poblaciones mejoradas", "PMR"),
    ("patente", "PAT_INV"),             # refinado por fila (MOD_UTIL)
    ("obras o productos", "AAD"),       # arte ahora vive en GNC/DPC
    ("produccion en arte", "AAD"),
    # --- DTI: Desarrollo tecnologico e innovacion ---
    ("software", "SF"),
    ("prototipo", "PI"),
    ("planta piloto", "PP"),
    ("plantas piloto", "PP"),
    ("disenos industriales", "DI"),
    ("esquemas de trazados", "ECI"),
    ("productos nutraceuticos", "PN"),
    ("signos distintivos", "SD"),
    ("colecciones cientificas", "CC"),
    ("nuevos registros", "NRC"),
    ("secreto empresarial", "SE"),
    ("empresas de base tecnologica", "EBT"),
    ("empresas creativas", "ICC"),
    ("innovaciones en procesos", "IPP"),
    ("innovaciones generadas", "IG"),
    ("regulaciones y normas", "RNL"),
    ("protocolos de vigilancia epidemiologica", "PVE"),  # tipologia exacta del Anexo 1
    ("reglamentos tecnicos", "RNL"),   # los reglamentos amparan en RNL (2.2.2.3)
    ("guias de practica clinica", "RNPC"),
    ("proyectos de ley", "RNPL"),
    ("conceptos tecnicos", "CT"),
    # --- ASC: Apropiacion social del conocimiento ---
    ("centro de ciencia", "TCCG"),     # trabajo conjunto con centros de ciencia (2.2.3.3.1.4)
    # --- Secciones reconocidas SIN equivalente 2024 (importan NULL) ---
    ("demas trabajos", None),
    ("estrategias pedagogicas", None),        # sin equivalente como producto
    ("otra publicacion divulgativa", None),
    ("participacion ciudadana", None),        # no existe en Anexo 1 2024
    ("proceso de apropiacion social", None),  # ambigua: FIS/GPP/FCP/TCCG
    ("procesos de apropiacion social", None),
    ("cartas mapas o similares", None),
    ("traducciones", None),
    ("otros productos tecnologicos", None),
    ("curso de corta duracion", None),        # dictar cursos no es producto 2024
    ("curso de doctorado", None),
    ("curso de maestria", None),
    ("curso especializado de extension", None),
    ("otro programa academico", None),        # formacion del investigador
    ("programa academico", None),
    ("jurado", None),                         # actividad de evaluador
    ("comites", None),
    ("actividades como evaluador", None),     # actividad del evaluador, no producto 2024
    ("comitas", None),   # mojibake de 'comites' en el HTML de Scienti (doble encoding)
]

STRUCTURAL_HEADERS = (
    "datos basicos",
    "instituciones",
    "plan estrat",
    "lineas de investigacion",
    "integrantes del grupo",
    "proyectos",
    "produccion bibliografica",
    "produccion tecnica y tecnologica",
    "produccion de formacion y extension",
    "apropiacion social y divulgacion publica de la ciencia",
    "actividades de formacion",
)
