# Seed idempotente de familias/subtipos extendidos Minciencias (ejecutar con venv del backend)
import pyodbc

CONN = ("Driver={ODBC Driver 17 for SQL Server};Server=localhost;"
        "Database=peai;Trusted_Connection=yes;")

FAMILIES = [
    "Productos de nuevo conocimiento",
    "Productos de desarrollo tecnologico e innovacion",
    "Productos de apropiacion social del conocimiento",
    "Productos de formacion de recurso humano",
    "Produccion en arte arquitectura y diseno",
]

SUBTYPES = {
    "nuevo conocimiento": [
        "Articulos de investigacion",
        "Libros resultado de investigacion",
        "Capitulos de libro resultado de investigacion",
        "Variedades vegetales y nueva raza animal",
        "Documentos de trabajo",
        "Otros articulos publicados",
        "Demas trabajos",
        "Notas cientificas",
        "Libros de formacion",
        "Otros libros publicados",
        "Manuales y guias especializadas",
    ],
    "desarrollo tecnologico": [
        "Patentes de invencion o modelo de utilidad",
        "Software con registro de soporte logico",
        "Prototipos industriales y plantas piloto",
        "Secretos empresariales e innovaciones",
        "Innovaciones en procesos y procedimientos",
        "Innovaciones generadas en la gestion empresarial",
        "Empresas de base tecnologica",
        "Otros productos tecnologicos",
        "Disenos industriales",
        "Esquemas de trazados de circuito integrado",
        "Productos nutraceuticos",
        "Regulaciones y normas",
        "Signos distintivos",
    ],
    "apropiacion social": [
        "Eventos cientificos con memorias",
        "Informes tecnicos finales de investigacion",
        "Estrategias de divulgacion y comunicacion publica",
        "Generacion de contenido virtual",
        "Producciones audiovisuales",
        "Generacion de recursos graficos",
        "Generacion de contenido de audio",
        "Generacion de contenido multimedia",
        "Generacion de contenido impreso",
        "Libros de divulgacion",
        "Estrategias pedagogicas para el fomento a la CTI",
        "Desarrollo web",
        "Otra publicacion divulgativa",
        "Ediciones",
        "Espacios de participacion ciudadana",
        "Consultorias cientifico-tecnologicas",
        "Procesos de apropiacion social",
        "Cartas mapas o similares",
        "Talleres de creacion",
        "Traducciones",
    ],
    "formacion de recurso": [
        "Tesis de doctorado dirigidas y aprobadas",
        "Trabajos de grado de maestria dirigidos",
        "Trabajos de grado de pregrado dirigidos",
        "Cursos de corta duracion dictados",
        "Cursos de formacion y extension",
        "Programas academicos de formacion",
        "Jurados y comisiones evaluadoras",
        "Comites de evaluacion",
        "Asesorias al Programa Ondas",
        "Monografias de conclusion de curso",
        "Trabajos dirigidos/tutorias de otro tipo",
    ],
    "arte arquitectura": [
        "Produccion en arte arquitectura y diseno",
    ],
}

cn = pyodbc.connect(CONN, autocommit=True)
cur = cn.cursor()

for fam in FAMILIES:
    cur.execute("IF NOT EXISTS (SELECT 1 FROM ProductFamily WHERE name=?) "
                "INSERT INTO ProductFamily(name) VALUES (?)", fam, fam)

fam_ids = {}
for key in SUBTYPES:
    row = cur.execute(
        "SELECT id, name FROM ProductFamily WHERE name LIKE ?", f"%{key}%"
    ).fetchone()
    fam_ids[key] = (row.id, row.name)
    print(f"Familia [{row.id}] {row.name}")

added = skipped = 0
for key, names in SUBTYPES.items():
    fid = fam_ids[key][0]
    for name in names:
        exists = cur.execute(
            "SELECT 1 FROM ProductSubtype WHERE family_id=? AND name=?", fid, name
        ).fetchone()
        if exists:
            skipped += 1
            continue
        cur.execute("INSERT INTO ProductSubtype (family_id, name) VALUES (?,?)", fid, name)
        added += 1
        print(f"  + {name}")

total = cur.execute("SELECT COUNT(*) FROM ProductSubtype").fetchone()[0]
print(f"\nAgregados: {added} | Ya existian: {skipped} | Total subtipos: {total}")
cn.close()
