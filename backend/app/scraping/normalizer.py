import re
import hashlib
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

from .. import repository
from .constants import MIN_YEAR, MAX_YEAR


class GruplacNormalizer:
    @staticmethod
    def normalize(text: Any) -> str:
        if not text:
            return ""
        # Keep accents for storage, just normalize spacing
        s = str(text).strip()
        s = re.sub(r'[\r\n\t\xa0]+', ' ', s)
        return " ".join(s.split())

    @classmethod
    def normalized_name_key(cls, value: str) -> str:
        if not value:
            return ""
        # For deduplication, we DO strip accents so NORENA matches NOREÑA
        nfkd = unicodedata.normalize("NFD", value)
        no_accents = "".join(c for c in nfkd if unicodedata.category(c) != "Mn")
        val = no_accents.encode("ascii", "ignore").decode("ascii").upper()
        val = re.sub(r"[^A-Z0-9 ]", " ", val)
        return " ".join(val.split())

    @classmethod
    def match_key(cls, text: Any) -> str:
        """
        Llave de comparación insensible a tildes/puntuación para reconocer
        encabezados y etiquetas de la página ("Datos básicos" == "datos basicos").
        El almacenamiento conserva tildes; esto solo se usa para hacer match.
        """
        return cls.normalized_name_key(str(text or "")).lower()

    @staticmethod
    def extract_year(text: str) -> Optional[int]:
        if not text:
            return None
        matches = re.findall(r"\b(18\d{2}|19\d{2}|20\d{2}|21\d{2})\b", text)
        for m in matches:
            y = int(m)
            if MIN_YEAR <= y <= MAX_YEAR:
                return y
        return None

    @classmethod
    def normalize_classification(cls, text: Any) -> str:
        """
        La celda 'Clasificado' de GrupLAC mezcla la categoría con el texto de
        vigencia ('Bcon vigencia hasta la publicación...'). Se extrae solo la
        categoría del modelo de medición (A1/A/B/C, histórico D, o Reconocido)
        para que matchee el catálogo de la UI; si no se reconoce, se conserva
        el texto crudo.
        """
        t = cls.normalize(text)
        if not t:
            return ""
        if re.search(r"reconocido", t, re.IGNORECASE):
            return "Reconocido"
        m = re.match(r"^(A1|A|B|C|D)\b", t, re.IGNORECASE)
        if m:
            return m.group(1).upper()
        # Caso frecuente: letra pegada al texto ('Bcon vigencia...')
        m = re.match(r"^(A1|A|B|C|D)\s*con\b", t, re.IGNORECASE)
        if m:
            return m.group(1).upper()
        m = re.search(r"\bcategor[íi]a\s+(A1|A|B|C|D)\b", t, re.IGNORECASE)
        if m:
            return m.group(1).upper()
        return t

    @classmethod
    def split_city_department(cls, text: Any) -> Tuple[str, str]:
        """
        GrupLAC publica la ubicación en una sola celda 'DEPTO - CIUDAD'
        ('CESAR - VALLEDUPAR'). Se parte en (city, department) con title case
        para que department matchee el catálogo de la UI. Sin separador, todo
        se considera ciudad (comportamiento previo).
        """
        t = cls.normalize(text)
        if not t:
            return "", ""
        if " - " in t:
            dept, _, city = t.partition(" - ")
            return city.strip().title(), dept.strip().title()
        return t.title(), ""

    @classmethod
    def normalize_year_month(cls, text: Any) -> str:
        """
        'Año y mes de formación' de GrupLAC viene como '2005 - 7'. Se normaliza
        a 'YYYY-MM' (formato que esperan los inputs type=month de la UI).
        """
        t = cls.normalize(text)
        if not t:
            return ""
        m = re.match(r"^(\d{4})\s*[-/]\s*(\d{1,2})\b", t)
        if m:
            return f"{m.group(1)}-{int(m.group(2)):02d}"
        y = cls.extract_year(t)
        return str(y) if y else t

    @staticmethod
    def normalize_doi(doi: Optional[str]) -> str:
        return repository.clean_doi(doi)

    @classmethod
    def product_external_code(cls, title: str, year: Optional[int], doi: str = "", authors: Optional[List[str]] = None) -> str:
        norm_doi = cls.normalize_doi(doi).lower()
        if norm_doi:
            canonical = f"DOI:{norm_doi}"
            digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:20]
            return f"PRD_DOI_{digest}"

        canon_title = cls.normalized_name_key(title)
        canonical = f"{canon_title}|{year or ''}"
        digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:20]
        return f"PRD_{digest}"

    @classmethod
    def collaborator_external_code(cls, name: str) -> str:
        key = cls.normalized_name_key(name)
        digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:16]
        return f"EXT_{digest}"

    @classmethod
    def parse_membership_period(cls, value: str) -> Dict[str, Any]:
        norm = cls.normalize(value).strip()
        match = re.match(
            r"^(\d{4})(?:/(\d{1,2}))?\s*-\s*(Actual|\d{4}(?:/\d{1,2})?)$",
            norm,
            re.IGNORECASE
        )
        if not match:
            parts = [p.strip() for p in norm.split("-") if p.strip()]
            end_raw = parts[1] if len(parts) > 1 else None
            is_curr = bool(end_raw and end_raw.lower() == "actual")
            return {
                "start_date": None,
                "end_date": None,
                "is_current": is_curr,
                "raw_value": norm,
                "valid": False
            }

        start_yr = match.group(1)
        start_mo = match.group(2)
        start_date = f"{start_yr}-{int(start_mo):02d}-01" if start_mo else f"{start_yr}-01-01"

        end_raw = match.group(3)
        if end_raw.lower() == "actual":
            end_date = None
            is_current = True
        else:
            p_end = end_raw.split("/")
            end_date = f"{p_end[0]}-{int(p_end[1]):02d}-01" if len(p_end) == 2 else f"{p_end[0]}-01-01"
            is_current = False

        return {
            "start_date": start_date,
            "end_date": end_date,
            "is_current": is_current,
            "raw_value": norm,
            "valid": True
        }
