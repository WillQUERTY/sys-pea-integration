# Re-importacion AITICE desde el HTML local descargado (docs/AITICE-PAGE.html)
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.scraper import GruplacHtmlParser, GruplacCommitService

CONN = ("Driver={ODBC Driver 17 for SQL Server};Server=localhost;"
        "Database=peai;Trusted_Connection=yes;")

html = open(os.path.join(os.path.dirname(__file__), "..", "docs", "AITICE-PAGE.html"),
            encoding="utf-8", errors="replace").read()
data = GruplacHtmlParser().parse(html, source_url="local:AITICE-PAGE.html")
print(f"Extraidos: {len(data.products)} productos, {len(data.members)} miembros, "
      f"{len(data.projects)} proyectos")

result = GruplacCommitService.commit(data, db_conn_str=CONN)
print("RESULTADO:", {k: v for k, v in result.items() if k != "details"})
