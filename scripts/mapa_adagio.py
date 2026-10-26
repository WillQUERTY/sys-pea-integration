"""
mapa_adagio.py — Mapa funcional del competidor Adagio (CRIS de ADAGGIO Servicios Colombia).

Descarga el esquema OpenAPI público de Adggio y genera:
  1. docs/mapa-funcional-adagio.md    -> catálogo legible de módulos y funcionalidades
  2. docs/adagio-superficie.csv       -> lista plana por endpoint (filtrable en Excel)
  3. docs/adagio-snapshot.json        -> metadatos del corte (fecha, hash, conteos)
  4. docs/adagio-cambios-<FECHA>.md   -> delta contra el CSV previo (si se re-ejecuta)

El esquema crudo NO se guarda en el repositorio (1,5 MB, propiedad de ADAGGIO):
se cachea en el directorio temporal del sistema.

Uso:
  python scripts/mapa_adagio.py                  # descarga, genera y compara
  python scripts/mapa_adagio.py --schema RUTA    # usa una copia local
  python scripts/mapa_adaggio.py --nuestro       # incluye la matriz contra Khemia
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import os
import re
import sys
import tempfile
import urllib.request
from collections import Counter, OrderedDict

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("Falta PyYAML. Instala con: pip install pyyaml")

SCHEMA_URL = "https://backend.adaggio.unicesar.edu.co/api/v3/schema/"
HTTP_METHODS = ("get", "post", "put", "patch", "delete", "head", "options")
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# --------------------------------------------------------------------------
# Taxonomía de capacidades: prefijo de ruta -> (capacidad, glosa, familia)
# El orden importa: gana la primera coincidencia.
# --------------------------------------------------------------------------
CAPACIDADES = [
    ("/auth/v2/consent",          "Identidad y acceso", "Consentimiento de datos (Ley 1581)", "Identidad"),
    ("/auth/v2/entra-id",         "Identidad y acceso", "SSO Microsoft Entra ID", "Identidad"),
    ("/auth/v2/forgot-password",  "Identidad y acceso", "Recuperación de contraseña", "Identidad"),
    ("/auth/v2/reset-password",   "Identidad y acceso", "Restablecimiento de contraseña", "Identidad"),
    ("/auth/v2/verify-token-reset-password", "Identidad y acceso", "Verificación de token de reset", "Identidad"),
    ("/auth/v2/account-confirm-email", "Identidad y acceso", "Confirmación de correo", "Identidad"),
    ("/auth/v2/verify-email",     "Identidad y acceso", "Verificación de correo", "Identidad"),
    ("/auth/v2/sign-up",          "Identidad y acceso", "Registro de usuario", "Identidad"),
    ("/auth/v2/login",            "Identidad y acceso", "Inicio de sesión (JWT)", "Identidad"),
    ("/auth/v2/refresh",          "Identidad y acceso", "Renovación de token", "Identidad"),
    ("/auth/v2/token",            "Identidad y acceso", "Verificación de token", "Identidad"),
    ("/auth/v2/logout",           "Identidad y acceso", "Cierre de sesión", "Identidad"),
    ("/auth/v2",                  "Identidad y acceso", "Otros endpoints de auth", "Identidad"),

    ("/api/v3/convocations",      "Convocatorias", "Ciclo de vida de convocatorias (fases, presupuesto, cronograma)", "Convocatorias"),
    ("/api/v3/proposals",         "Postulaciones a convocatorias", "Propuestas, expertos aliados, ítems de presupuesto, documentos", "Convocatorias"),
    ("/api/v3/evaluations",       "Evaluación de propuestas", "Rúbricas, conflicto de interés, expertos externos, sesiones", "Convocatorias"),
    ("/api/v3/project-manager",   "Gestor de proyectos (Scrum)", "Epics, sprints, backlog, tareas, responsables, recursos", "Gestión"),
    ("/api/v3/person/me",         "Derechos del titular", "Consentimiento, marketing, supresión y estado (data-rights)", "Identidad"),
    ("/api/v3/person",            "Expertos e investigadores", "Fichas de experto y trazabilidad de perfil (about-of)", "Producción"),
    ("/api/v3/production",        "Producción científica (v3)", "Fichas unificadas de producción con progreso y visibilidade", "Producción"),
    ("/api/v3/index",             "Índices v3", "Búsqueda rápida y dependencias de tipos", "Catálogos"),
    ("/api/v3/schema",            "Documentación de API", "OpenAPI, Swagger UI y ReDoc públicos", "Plataforma"),

    ("/api/v2/index",             "Catálogos de dominio", "22 catálogos de referencia (países, áreas, líneas, ODS, skills…)", "Catálogos"),
    ("/api/v2/bulk-operation",    "Operaciones masivas", "Edición masiva por modelo (uso administrativo)", "Plataforma"),
    ("/api/v2/enterprise",        "Empresas y prototipos", "Empresas, prototipos de servicio, emparejamiento con expertos", "Producción"),
    ("/api/v2/event",             "Eventos", "Catálogo y agenda de eventos", "Convocatorias"),
    ("/api/v2/funding-proposal",  "Postulaciones a fondos", "Propuestas de financiamiento, PRESUPUESTO, aliados y envío", "Convocatorias"),
    ("/api/v2/funding",           "Financiamiento", "Convocatorias de fondos y sus capítulos de presupuesto", "Convocatorias"),
    ("/api/v2/law",               "Producción jurídica", "Leyes, decretos y normas (producción normativa)", "Producción"),
    ("/api/v2/organization",      "Instituciones", "Universidades y entidades (tenant, unidades)", "Catálogos"),
    ("/api/v2/patent",            "Patentes", "Patentes nacionales y extranjeras", "Producción"),
    ("/api/v2/person",            "Expertos e investigadores", "Directorio de personas, afiliación, roles y productividad", "Producción"),
    ("/api/v2/product",           "Productos de investigación", "Software, datasets, prototipos e instrumentos", "Producción"),
    ("/api/v2/project",           "Proyectos de investigación", "Proyectos, hitos y responsables", "Producción"),
    ("/api/v2/publication",       "Publicaciones", "Artículos, libros, capítulos y conference papers", "Producción"),
    ("/api/v2/library",           "Biblioteca", "Recursos bibliográficos de la institución", "Recursos"),
    ("/api/v2/interaction",       "Interacciones", "Networking entre investigadores y Flujos de colaboración", "Gestión"),
    ("/api/v2/external-metadata", "Metadatos externos", "Enriquecimiento desde fuentes externas", "Recursos"),
    ("/api/v2/landing-page",      "Landing pages institucionales", "Páginas de presentación por institución", "Portal"),
    ("/api/v2/resource-bank",     "Banco de recursos", "Recursos y materiales compartidos", "Recursos"),
    ("/api/v2/project-manager",   "Gestor de proyectos (v2)", "Gestión de proyectos de investigación (Sprint)", "Gestión"),
    ("/api/v2/search",            "Búsqueda global", "Búsqueda transversal del ecosistema", "Portal"),
    ("/api/v2",                   "Otros endpoints v2", "Rutas v2 sin clasificar", "Plataforma"),

    ("/upc-admin",                "Administración Django del tenant", "Panel administrativo nativo (upc-admin)", "Plataforma"),
    ("/admin",                    "Administración Django", "Panel administrativo nativo (admin)", "Plataforma"),
]

FAMILIAS = OrderedDict([
    ("Identidad", "Acceso, cuentas, SSO y consentimiento"),
    ("Producción", "Catálogo científico: personas, producción, productos, proyectos"),
    ("Convocatorias", "El ciclo completo: convocar, postular, evaluar"),
    ("Gestión", "Gestión interna de proyectos y colaboración"),
    ("Catálogos", "Catálogos de referencia del dominio"),
    ("Recursos", "Repositorios de documentos y metadatos"),
    ("Portal", "Descubrimiento público y páginas institucionales"),
    ("Plataforma", "Infraestructura de la API y operación"),
])

# Señales de permisos y reglas de negocio minadas del campo `description`.
PERM_SIGNS = [
    (r"AllowAny", "AllowAny (público)"),
    (r"IsAuthenticated", "IsAuthenticated"),
    (r"IsAdminUser|IsAdmin|is_admin|admin", "requiere admin"),
    (r"read-?only|solo lectura|read only", "solo lectura"),
    (r"tenant|multi-?tenant|organización actual|institución actual", "aislado por tenant"),
    (r"permiso|permission|autorizad|rol |role ", "documenta permisos"),
    (r"Ley 1581|habeas data|consentimiento|consent", "consentimiento Ley 1581"),
    (r"evaluador|evaluación|rubric|rúbrica", "proceso de evaluación"),
    (r"soft-?delete|eliminación lógica|borrado lógico", "soft-delete"),
]


def descargar(destino: str) -> tuple[str, bytes]:
    req = urllib.request.Request(SCHEMA_URL, headers={"User-Agent": "Mozilla/5.0 (compatible; khemia-analisis)"})
    data = urllib.request.urlopen(req, timeout=90).read()
    open(destino, "wb").write(data)
    return destino, data


def clasificar(path: str) -> tuple[str, str, str]:
    for prefijo, cap, glosa, familia in CAPACIDADES:
        if path.startswith(prefijo):
            return cap, glosa, familia
    return "Sin clasificar", "—", "Plataforma"


def resumen_texto(op: dict) -> str:
    """Primera frase útil de la descripción, sin markdown pesado."""
    txt = op.get("description") or op.get("summary") or ""
    txt = re.sub(r"\s+", " ", txt).strip()
    # Corta en el primer punto seguido de espacio o en 220 caracteres.
    m = re.match(r"(.+?[.!?])(\s|$)", txt)
    if m and len(m.group(1)) < 220:
        return m.group(1).strip()
    return (txt[:217].rsplit(" ", 1)[0] + "…") if len(txt) > 220 else txt


def es_publica(op: dict) -> bool:
    sec = op.get("security")
    if sec is None:
        return False
    if isinstance(sec, list) and any(isinstance(s, dict) and not s for s in sec):
        return True
    return False


def minar_permisos(desc: str) -> list[str]:
    d = desc or ""
    return [etiqueta for patron, etiqueta in PERM_SIGNS if re.search(patron, d, re.I)]


def construir_indice() -> list[dict]:
    ops = []
    for path, item in spec_paths.items():
        if not isinstance(item, dict):
            continue
        for metodo, op in item.items():
            if metodo not in HTTP_METHODS or not isinstance(op, dict):
                continue
            cap, glosa, familia = clasificar(path)
            desc = op.get("description") or ""
            ops.append({
                "path": path,
                "metodo": metodo.upper(),
                "operacion": op.get("operationId", ""),
                "capacidad": cap,
                "glosa": glosa,
                "familia": familia,
                "publica": es_publica(op),
                "resumen": resumen_texto(op),
                "permisos": "; ".join(minar_permisos(desc)),
                "documentada": bool(desc.strip()),
                "params": len(op.get("parameters", []) or []),
            })
    return ops


def modulo_de(path: str) -> str:
    """Primer y segundo segmento significativo, p.ej. 'api/v2/funding'."""
    seg = [s for s in path.strip("/").split("/") if s]
    if not seg:
        return "/"
    if seg[0] == "api" and len(seg) >= 3:
        return "/".join(seg[:3])
    if seg[0] == "auth" and len(seg) >= 3:
        return "/".join(seg[:3])
    return "/".join(seg[:2])


def nuestro_inventario() -> dict:
    """Inventario de Khemia desde los routers FastAPI (nuestro lado)."""
    base = os.path.join(REPO_ROOT, "backend", "app", "api", "routers")
    router_re = re.compile(r'@router\.(get|post|put|patch|delete)\(\s*"([^"]+)"')
    por_router = Counter()
    total = 0
    if os.path.isdir(base):
        for nombre in sorted(os.listdir(base)):
            if not nombre.endswith(".py"):
                continue
            texto = open(os.path.join(base, nombre), encoding="utf-8", errors="replace").read()
            n = len(router_re.findall(texto))
            por_router[nombre] = n
            total += n
    return {"total": total, "por_router": dict(por_router)}


def escribir_csv(ruta: str, ops: list[dict]) -> None:
    cols = ["capacidad", "familia", "glosa", "modulo", "metodo", "path", "publica",
            "documentada", "permisos", "params", "operacion", "resumen"]
    with open(ruta, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        for op in ops:
            fila = dict(op)
            fila["modulo"] = modulo_de(op["path"])
            fila["publica"] = "SI" if op["publica"] else "no"
            fila["documentada"] = "SI" if op["documentada"] else "no"
            w.writerow({c: fila.get(c, "") for c in cols})


def diff_csv(previo: str, actual: str) -> tuple[list[str], list[str], list[str]]:
    def leer(ruta):
        if not os.path.exists(ruta):
            return None
        with open(ruta, encoding="utf-8-sig") as fh:
            return {(r["metodo"], r["path"]): r for r in csv.DictReader(fh)}
    a, b = leer(previo), leer(actual)
    if a is None:
        return [], [], []
    _altos = {k for k in b if k not in a}
    bajas = {k for k in a if k not in b}
    cambios = []
    for k in set(a) & set(b):
        if a[k].get("resumen", "") != b[k].get("resumen", ""):
            cambios.append(f"{k[0]} {k[1]}")
    return sorted(_altos), sorted(bajas), sorted(cambios)


def md_tabla(rows: list[list[str]], cabeceras: list[str]) -> str:
    out = ["| " + " | ".join(cabeceras) + " |",
           "|" + "|".join("---" for _ in cabeceras) + "|"]
    for r in rows:
        out.append("| " + " | ".join(str(x) for x in r) + " |")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--schema", help="ruta local del esquema YAML (por defecto se descarga)")
    ap.add_argument("--out", default=os.path.join(REPO_ROOT, "docs"))
    ap.add_argument("--nuestro", action="store_true", help="incluye la matriz contra Khemia")
    args = ap.parse_args()

    if args.schema:
        ruta, datos = args.schema, open(args.schema, "rb").read()
    else:
        cache = os.path.join(tempfile.gettempdir(), "adagio_schema.yaml")
        if os.path.exists(cache) and os.path.getsize(cache) > 100000:
            ruta, datos = cache, open(cache, "rb").read()
        else:
            ruta, datos = descargar(cache)

    global spec_paths
    spec = yaml.safe_load(open(ruta, encoding="utf-8"))
    spec_paths = spec.get("paths", {})
    ops = construir_indice()

    hash_esq = hashlib.sha256(datos).hexdigest()[:16]
    fecha = dt.date.today().isoformat()

    # --- salidas -----------------------------------------------------------
    os.makedirs(args.out, exist_ok=True)
    csv_ruta = os.path.join(args.out, "adagio-superficie.csv")
    escribir_csv(csv_ruta, ops)

    snap = {
        "generado": fecha,
        "fuente": SCHEMA_URL,
        "sha256esquema": hash_esq,
        "bytesesquema": len(datos),
        "rutas": len(spec_paths),
        "operaciones": len(ops),
        "publicas": sum(1 for o in ops if o["publica"]),
        "documentadas": sum(1 for o in ops if o["documentada"]),
        "modulos": len({modulo_de(o["path"]) for o in ops}),
    }
    with open(os.path.join(args.out, "adagio-snapshot.json"), "w", encoding="utf-8") as fh:
        json.dump(snap, fh, ensure_ascii=False, indent=2)

    # --- delta contra el corte previo -------------------------------------
    alt, bajas, camb = diff_csv(csv_ruta + ".prev", csv_ruta) if os.path.exists(csv_ruta + ".prev") else ([], [], [])
    if alt or bajas or camb:
        with open(os.path.join(args.out, f"adagio-cambios-{fecha}.md"), "w", encoding="utf-8") as fh:
            fh.write(f"# Cambios en la API de Adaggio — {fecha}\n\n")
            fh.write(f"Endpoints nuevos: **{len(alt)}** · eliminados: **{len(bajas)}** · con descripción cambiada: **{len(camb)}**\n\n")
            for titulo, items in (("Nuevos", alt), ("Eliminados", bajas), ("Descripción modificada", camb)):
                fh.write(f"## {titulo} ({len(items)})\n\n")
                for it in items:
                    fh.write(f"- `{it[0]} {it[1]}`\n" if isinstance(it, tuple) else f"- `{it}`\n")
                fh.write("\n")
    # guarda copia para el próximo delta
    with open(csv_ruta + ".prev", "w", encoding="utf-8-sig") as fh:
        fh.write(open(csv_ruta, encoding="utf-8-sig").read())

    # --- markdown ----------------------------------------------------------
    por_cap = OrderedDict()
    for o in ops:
        por_cap.setdefault(o["capacidad"], []).append(o)

    pub = [o for o in ops if o["publica"]]
    doc_pct = 100.0 * snap["documentadas"] / max(1, len(ops))
    nuestro = nuestro_inventario() if args.nuestro else None

    L = []
    L.append("# Mapa funcional de Adaggio — catálogo de módulos y funcionalidades")
    L.append("")
    L.append(f"> **Corte:** {fecha} · **Fuente:** esquema OpenAPI público `{SCHEMA_URL}`")
    L.append(f"> **Hash del esquema:** `{hash_esq}` · {snap['bytesesquema']:,} bytes · {snap['rutas']} rutas · **{snap['operaciones']} operaciones**")
    L.append(f"> **Públicas (sin JWT):** {snap['publicas']} · **Con descripción documentada:** {snap['documentadas']} ({doc_pct:.0f}%)")
    L.append("")
    L.append("Generado con `python scripts/mapa_adagio.py`. El esquema crudo de ADAGGIO **no** se versiona en este")
    L.append("repositorio; se cachea en el directorio temporal del sistema. Para re-cortar su API: vuelve a ejecutar")
    L.append("el script y el delta (`docs/adagio-cambios-*.md`) registra qué añadieron o movieron.")
    L.append("")
    L.append("---")
    L.append("")

    L.append("## 1. Familias funcionales")
    L.append("")
    filas = []
    for fam, glosa in FAMILIAS.items():
        sub = [o for o in ops if o["familia"] == fam]
        if not sub:
            continue
        filas.append([fam, glosa, len(sub), len({o["path"] for o in sub}),
                      len({o["capacidad"] for o in sub}),
                      sum(1 for o in sub if o["publica"])])
    L.append(md_tabla(filas, ["Familia", "Alcance", "Operaciones", "Rutas", "Módulos", "Públicas"]))
    L.append("")

    L.append("## 2. Módulos (vista de árbol)")
    L.append("")
    for fam in FAMILIAS:
        caps = [c for c in por_cap if por_cap[c][0]["familia"] == fam]
        if not caps:
            continue
        L.append(f"### {fam} — {FAMILIAS[fam]}")
        L.append("")
        for cap in caps:
            subs = sorted({o["glosa"] for o in por_cap[cap]})
            n_ops = len(por_cap[cap])
            n_paths = len({o["path"] for o in por_cap[cap]})
            n_pub = sum(1 for o in por_cap[cap] if o["publica"])
            L.append(f"- **{cap}** — {n_ops} operaciones / {n_paths} rutas / {n_pub} públicas")
            for s in subs:
                L.append(f"  - {s}")
            mods = sorted({modulo_de(o["path"]) for o in por_cap[cap]})
            if len(mods) > 1:
                L.append(f"  - *rutas:* {', '.join('`' + m + '`' for m in mods[:14])}{' …' if len(mods) > 14 else ''}")
        L.append("")

    L.append("## 3. Catálogo por capacidad (detalle)")
    L.append("")
    for cap in por_cap:
        grupo = por_cap[cap]
        L.append(f"### {cap}")
        L.append("")
        sub_counts = Counter(o["glosa"] for o in grupo)
        for glosa, n in sub_counts.most_common():
            L.append(f"- {glosa} — {n} operaciones")
        L.append("")
        mods = OrderedDict()
        for o in grupo:
            mods.setdefault(modulo_de(o["path"]), []).append(o)
        for mod, items in mods.items():
            L.append(f"**`{mod}`** ({len(items)} operaciones)")
            L.append("")
            filas = []
            for o in sorted(items, key=lambda x: (x["path"], x["metodo"])):
                est = "pública" if o["publica"] else "JWT"
                res = o["resumen"].replace("|", "\\|")[:150]
                extra = o["permisos"]
                filas.append([o["metodo"], f"`{o['path']}`", est, extra or "—", res or "—"])
            L.append(md_tabla(filas, ["Método", "Ruta", "Acceso", "Permisos documentados", "Descripción"]))
            L.append("")

    L.append("## 4. Endpoints públicos (responden sin JWT)")
    L.append("")
    L.append(f"Total: **{len(pub)}** operaciones. Reparto por capacidad:")
    L.append("")
    pc = Counter(o["capacidad"] for o in pub)
    L.append(md_tabla([[c, n] for c, n in pc.most_common()], ["Capacidad", "Operaciones públicas"]))
    L.append("")
    L.append("Endpoints públicos completos:")
    L.append("")
    for o in sorted(pub, key=lambda x: (x["capacidad"], x["path"])):
        L.append(f"- `{o['metodo']} {o['path']}` — {o['resumen'][:120]}")
    L.append("")

    L.append("## 5. Endpoints sin descripción")
    L.append("")
    sin_doc = [o for o in ops if not o["documentada"]]
    L.append(f"{len(sin_doc)} de {len(ops)} operaciones no tienen `description` "
             f"({100.0 * len(sin_doc) / max(1, len(ops)):.0f}%). "
             "Este sí es un punto ciego del atacante: para esas rutas hay que deducir el contrato probando.")
    L.append("")
    if sin_doc:
        L.append(md_tabla([[f"`{o['path']}`", o["metodo"]] for o in sin_doc[:60]],
                          ["Ruta", "Método"]))
        if len(sin_doc) > 60:
            L.append("")
            L.append(f"_(… y {len(sin_doc) - 60} más; lista completa en `docs/adagio-superficie.csv`.)_")
    L.append("")

    if nuestro:
        L.append("## 6. Comparación de superficie: Adaggio vs Khemia")
        L.append("")
        L.append(md_tabla([
            ["Rutas/módulos", snap["modulos"], "8 routers"],
            ["Operaciones", snap["operaciones"], nuestro["total"]],
            ["Operaciones públicas sin token", snap["publicas"], "todas (no hay auth)"],
            ["Documentadas con descripción", f"{doc_pct:.0f}%", "~0% (OpenAPI vacío de texto)"],
            ["Control de acceso", "JWT + cookie + header, por tenant", "ninguno en el backend Python"],
            ["Esquema OpenAPI público", "1,5 MB con 666 rutas", "no publicado (protegido por entorno)"],
        ], ["Métrica", "Adaggio", "Khemia"]))
        L.append("")
        L.append("Detalle de nuestros routers:")
        L.append("")
        L.append(md_tabla([[k, v] for k, v in sorted(nuestro["por_router"].items())],
                          ["Router", "Endpoints"]))
        L.append("")

    md_ruta = os.path.join(args.out, "mapa-funcional-adaggio.md")
    with open(md_ruta, "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")

    print(f"OK  esquema: {ruta}")
    print(f"    rutas={snap['rutas']} operaciones={snap['operaciones']} publicas={snap['publicas']} "
          f"documentadas={snap['documentadas']}")
    print(f"    -> {md_ruta}")
    print(f"    -> {csv_ruta}")
    print(f"    -> {os.path.join(args.out, 'adagio-snapshot.json')}")
    if alt or bajas or camb:
        print(f"    delta: +{len(alt)} -{len(bajas)} ~{len(camb)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
