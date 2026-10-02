import pyodbc
import re

def clean_space(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip() if s else ""

def parse_software_text(txt: str):
    meta_pattern = r'(?i)\b(?:Nombre comercial:|contrato/registro:|\.\s*En:|plataforma:|ambiente:|Palabras:|Areas:|Sectores:|Disponibilidad:|finalidad:)'
    parts = re.split(meta_pattern, txt, maxsplit=1)
    header = parts[0].strip().rstrip(",.")

    m_quotes = re.search(r'"([^"]+)"', header)
    if m_quotes:
        title = clean_space(m_quotes.group(1))
        before = header[:m_quotes.start()].strip().rstrip(",")
        authors = [clean_space(a) for a in before.split(",") if clean_space(a)]
        return title, authors

    lines = [clean_space(l.rstrip(",")) for l in header.splitlines() if clean_space(l)]
    if len(lines) > 1:
        authors = []
        title_lines = []
        in_title = False
        for idx, l in enumerate(lines):
            is_last = (idx == len(lines) - 1)
            lower = l.lower()
            has_indicator = any(w in lower for w in [":", "software", "sistema", "simulador", "aplicaci", "modulo", "herramienta", "red", "metodo", "control", "web", "app", "diseno", "portal"])
            if in_title:
                title_lines.append(l)
            elif has_indicator or is_last:
                in_title = True
                title_lines.append(l)
            else:
                words = l.split()
                if 2 <= len(words) <= 5 and not any(ch in l for ch in [":", "/", "\\", "(", ")"]):
                    authors.append(l)
                else:
                    in_title = True
                    title_lines.append(l)
        title = " ".join(title_lines).strip()
        if title:
            return title, authors

    chunks = [clean_space(c) for c in header.split(",") if clean_space(c)]
    if not chunks:
        return clean_space(header), []
    if len(chunks) == 1:
        # If it's a person name, it's not a title.
        words = chunks[0].split()
        if 2 <= len(words) <= 5 and chunks[0].isupper() and not any(w in chunks[0].upper() for w in ["SOFTWARE", "SISTEMA", "APP", "WEB", "RED", "CONTROL"]):
            return "Software sin título", [chunks[0]]
        return chunks[0], []
    
    title = chunks[-1]
    authors = chunks[:-1]
    return title, authors

conn = pyodbc.connect('Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;')
cursor = conn.cursor()

# 1. Update items with "Nombre comercial:" in title
cursor.execute("SELECT id, title FROM Product WHERE title LIKE '%Nombre comercial:%' OR title LIKE '%. En:%'")
dirty_meta = cursor.fetchall()

count_meta = 0
for pid, title in dirty_meta:
    clean_title, _ = parse_software_text(title)
    if clean_title and clean_title != title:
        if clean_title == "Software sin título":
            # Si se perdió por completo, tratar de sacarlo de Nombre comercial:
            m_nom = re.search(r'Nombre comercial:\s*([^,]+)', title)
            if m_nom and m_nom.group(1).strip():
                clean_title = m_nom.group(1).strip()
        
        # print(f"Fixing [{pid}]: '{title[:50]}...' -> '{clean_title}'")
        cursor.execute("UPDATE Product SET title = ? WHERE id = ?", clean_title[:490], pid)
        count_meta += 1

# 2. Update person names in Software (subtype 69)
cursor.execute("SELECT id, title FROM Product WHERE subtype_id = 69")
all_sw = cursor.fetchall()
count_person = 0
for pid, title in all_sw:
    words = title.strip().split()
    if 2 <= len(words) <= 5 and title.strip().isupper() and not any(w in title.upper() for w in [":", "SOFTWARE", "SISTEMA", "APP", "WEB", "SIMULADOR", "RED", "CONTROL", "PLATAFORMA", "MODULO", "HERRAMIENTA", "ALGORITMO", "MODELO", "METODOLOGIA", "DISPOSITIVO"]):
        # It's a person name! (e.g. TONNY ENRIQUE JIMENEZ MARQUEZ)
        # Try to find the original raw text if we can, but since evidence is None, we just mark it.
        # Actually, if we just name it "Software sin título" or something
        new_title = f"Software (Autor: {title})"
        # print(f"Fixing person title [{pid}]: '{title}' -> '{new_title}'")
        cursor.execute("UPDATE Product SET title = ? WHERE id = ?", new_title, pid)
        count_person += 1

conn.commit()
print(f"Fixed {count_meta} products with metadata noise in title.")
print(f"Fixed {count_person} software products with person names as title.")
