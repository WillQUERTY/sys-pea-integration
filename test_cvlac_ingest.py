import os
import pyodbc
from backend.app.cvlac_scraper import CvParser, CvCommitService
from backend.app import repository

raw_text = """Hoja de vida
Nombre	Camila Andrea Noreña Julio
Nombre en citaciones	NOREÑA JULIO, CAMILA ANDREA
Nacionalidad	Colombiana
Sexo	Femenino
Formación Académica
 
Maestría/Magister UNIVERSIDAD POPULAR DEL CESAR
MAESTRIA EN CIENCIAS FISICAS
Agostode2022 - de
SENSORES ÓPTICOS BASADOS EN FIBRAS ÓPTICAS DE CAMPO EVANESCENTES RECUBIERTAS CON GRAFENOS OXIDADOS PARA LA MEDICIÓN DE ÍNDICE DE REFRACCIÓN.
 
Pregrado/Universitario UNIVERSIDAD POPULAR DEL CESAR
LICENCIATURA EN MATEMATICAS Y FISICA
Febrerode2017 - Diciembrede 2021
Dependencia de la temperatura de un sensor de fibra óptica basado en las resonancias de plasmones superficiales
Formación Complementaria
 
Cursos de corta duración POLITECNICO SUPERIOR DE COLOMBIA
Diplomado en didáctica y docencia universitaria
Febrerode2023 - Marzode 2023
Áreas de actuación
 Ciencias Naturales -- Matemática -- Matemáticas Puras
Reconocimientos
Participación en el 2do congreso internacional virtual de investigadores LASIRC,FUNDACIÓN RED LATINOAMERICANA DE JOVENES E INVESTIGADORES - Octubrede 2020
 
Eventos científicos
1 Nombre del evento: IX JORNADA DE SOCIALIZACION DE RESULTADOS DE PROYECTOS DE INVESTIGACION y THE EXPO ¿ SEMILLEROS Y JÓVENES EGRESADOS INVESTIGADORES  Tipo de evento: Encuentro  Ámbito: Nacional  Realizado el:2025-11-05 00:00:00.0,  2025-11-05 00:00:00.0   en VALLEDUPAR   - Universidad Popular del Cesar  
Productos asociados
Nombre del producto:Análisis de la sensibilidad de un sensor óptico basado en una fibra óptica curvada con y sin recubrimiento de grafeno oxidado Tipo de producto:Producción técnica - Presentación de trabajo - Ponencia
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónGestionadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
2 Nombre del evento: RIAO-OPTILAS 2025 Conference  Tipo de evento: Congreso  Ámbito: Internacional  Realizado el:2025-11-17 00:00:00.0,  2025-11-21 00:00:00.0   en Santa Cruz de la Sierra   - Universidad Privada Boliviana  
Productos asociados
Nombre del producto:Optical sensor based on a Mach-Zehnder interferometric curved optical fiber for measuring refractive index Tipo de producto:Demás trabajos - Demás trabajos - Póster
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónPatrocinadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
3 Nombre del evento: 2do Taller Internacional QTECNOS Nano & Quantum Workshop 2024  Tipo de evento: Taller  Ámbito: Internacional  Realizado el:2024-11-25 00:00:00.0,  2024-11-29 00:00:00.0   en CARTAGENA DE INDIAS   - Universidad de Cartagena  
Productos asociados
Nombre del producto:Optical fibers coated with oxidated graphene for sensing applications Tipo de producto:Demás trabajos - Demás trabajos - Póster
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD DE CARTAGENA Tipo de vinculaciónGestionadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
4 Nombre del evento: VIII JORNADA DE SOCIALIZACIÓN DE RESULTADOS DE PROYECTOS DE INVESTIGACIÓN Y THE EXPO SEMILLEROS Y JOVENES INVESTIGADORES 2024  Tipo de evento: Encuentro  Ámbito: Nacional  Realizado el:2024-11-14 00:00:00.0,  2024-11-14 00:00:00.0   en VALLEDUPAR   - Universidad Popular del Cesar  
Productos asociados
Nombre del producto:Sensores ópticos basados en fibras ópticas de campo evanescente recubiertas con grafeno oxidado para la medición de indice de refracción. Tipo de producto:Producción técnica - Presentación de trabajo - Ponencia
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónGestionadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
 5 Nombre del evento: The EXPO SEMILLEROS Y JOVENES INVESTIGADORES  Tipo de evento: Otro  Ámbito: Nacional  Realizado el:2023-11-09 00:00:00.0,  2023-11-10 00:00:00.0   en VALLEDUPAR   - UNIVERSIDAD POPULAR DEL CESAR  
Productos asociados
Nombre del producto:SENSORES BASADOS EN FIBRAS ÓPTICAS ACOPLADAS EN LA PUNTA CON UNA MICROESFERA RECUBIERTA CON GRAFENO OXIDADO Tipo de producto:Producción técnica - Presentación de trabajo - Ponencia
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónGestionadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
 6 Nombre del evento: XVIII National Meeting on Optics and the IX Andean and Caribbean Conference on Optics and its Applications ENO CANCOA 2024  Tipo de evento: Congreso  Ámbito: Nacional  Realizado el:2024-06-12 00:00:00.0,  2024-06-14 00:00:00.0   en CARTAGENA DE INDIAS   - UNIVERSIDAD TECNOLÓGICA DE BOLÍVAR  
Productos asociados
Nombre del producto:Desarrollo de un sensor óptico basado en una fibra óptica en forma de nudo recubierta con grafeno oxidado. Tipo de producto:Producción técnica - Presentación de trabajo - Ponencia
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónPatrocinadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
 7 Nombre del evento: CONGRESO INTERNACIONAL VIRTUAL DE INVESTIGADORES LASIRC  Tipo de evento: Congreso  Ámbito: Internacional  Realizado el:2020-10-24 00:00:00.0,  2020-10-24 00:00:00.0   en VALLEDUPAR   - Virtual  
Productos asociados
Nombre del producto:RECUBRIMIENTO METÁLICO EN FIBRAS TÁPER PARA APLICACIONES EN SENSORES ÓPTICOS Tipo de producto:Producción técnica - Presentación de trabajo - Ponencia
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónPatrocinadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
 8 Nombre del evento: CONGRESO INTERNACIONAL DE INGENIERÍA FÍSICA  Tipo de evento: Congreso  Ámbito: Internacional  Realizado el:2021-09-27 00:00:00.0,  2021-09-29 00:00:00.0   en Ciudad de México   - Virtual  
Productos asociados
Nombre del producto:Fiber optic sensor based on surface plasmon resonances: A theoretical study Tipo de producto:Producción técnica - Presentación de trabajo - Ponencia
Nombre del producto:Surface plasmon resonance in optical fibers for temperature measurement. A theoretical study Tipo de producto:Demás trabajos - Demás trabajos - Póster
Instituciones asociadas
Nombre de la institución:UNIVERSIDAD POPULAR DEL CESAR Tipo de vinculaciónPatrocinadora
Participantes
Nombre: CAMILA ANDREA NORENA JULIO Rol en el evento: Ponente
Artículos
Producción bibliográfica - Artículo - Publicado en revista especializada
CAMILA ANDREA NORENA JULIO, CLAUDIA ASENATH VILLARRUEL MOLINA, YEINER YASSHIN MOLINA FRAGOZO, REINALDO ENRIQUE RUIZ DUARTE, JUAN PABLO MOLINA ALVAREZ, DUBER ALEXANDER AVILA PADILLA, SINDI DAYANA HORTA PINERES, "Green stem-extract synthesis of gold nanoparticles for pyridoxine SERS: morphology, extract-dependent behavior, and DFT/CPHF analysis" . En: Alemania 
APPLIED PHYSICS A MATERIALS SCIENCE PROCESSING  ISSN: 1432-0630  ed: SPRINGER HEIDELBERG
v.132 fasc.6 p.1 - 12 ,2026,  DOI: 10.1007/s00339-026-09669-x
Palabras:
Green synthesis, Gold nanoparticles, Plant stem extracts, Surface-enhanced Raman Scattering, Pyridoxine, DFT/CPHF,
Capitulos de libro
 Tipo: Capítulo de libro
CAMILA ANDREA NORENA JULIO, "RECUBRIMIENTO METÁLICO EN FIBRAS TÁPER PARA APLICACIONES EN SENSORES ÓPTICOS" la investigación como eje de transformación del conocimiento . En: Colombia  ISBN: 978-958-49-0749-3  ed:  , v. , p.455 - 460  1 ,2020
Areas:
Ciencias Sociales -- Ciencias de la Educación -- Educación General (Incluye Capacitación, Pedagogía),
Proyectos
 Tipo de proyecto: Investigación y desarrollo 
SENSORES ÓPTICOS BASADOS EN FIBRAS ÓPTICAS DE CAMPO EVANESCENTES RECUBIERTAS CON GRAFENOS OXIDADOS PARA LA MEDICIÓN DE ÍNDICE DE REFRACCIÓN
Inicio: Enero  2022 Duración 
Resumen
Los sensores ópticos basados en fibras ópticas son dispositivos de medida que utilizan la tecnología de las fibras ópticas para propagar luz a través de ellas y así detectar y/o medir diferentes variables físicas, químicas o biológicas; fundamentándose en el principio de que la luz puede propagarse al interior de la fibra óptica con mínima pérdida de energía, lo que los convierte en una herramienta poderosa para aplicaciones de detección y monitoreo en una amplia variedad de campos. Algunas de las ventajas más destacadas de los sensores ópticos basados en fibras ópticas es la inmunidad a interferencias electromagnéticas, respuesta rápida, amplio rango de operación y su capacidad para resistir ambientes hostiles, lo que los convierte en una buena herramienta en diferentes disciplinas, incluyendo la medicina, la industria, medio ambiente y telecomunicaciones. Estos dispositivos de medición y detección han evolucionado para adquirir mejores resultados, mejorando su desempeño tales como un amplio rango dinámico de operación, buena resolución y flexibilidad, buena precisión, alta sensibilidad, rápida respuesta de medición y la gran variedad de variables físicas, químicas y biológicas que puede medir a través de las diferentes configuraciones, arquitecturas, diseños y recubrimientos, los cuales se encuentran reportados por algunos autores. En general, los sensores recubiertos con materiales como el grafeno y óxido de grafeno, demuestran que la integración de este material con fibras ópticas de campo evanescente como las fibras adelgazadas, fibras pulidas o fibras en forma de nudo, conducen a una mejora en la sensibilidad gracias a la delgadez y ligereza de este material, puesto que posibilita una mejor interacción entre la luz y la zona de detección.

 Tipo de proyecto: Investigación y desarrollo 
PROPIEDADES DE DETECCIÓN DE SENSORES ÓPTICOS BASADOS EN FIBRAS ÓPTICAS DE CAMPO EVANESCENTE RECUBIERTAS CON MATERIALES GRAFÉNICOS
Inicio: Febrero  2023 Fin: Noviembre  2024 Duración 
Resumen
La investigación aquí propuesta pretende desarrollar un sensor basado en fibras ópticas de campo evanescente recubierta con materiales grafénicos que pueda ser utilizado para la medición o detección de alguna variable física, química o biológica. Con el fin de diseñar un dispositivo de sensado óptimo, se requiere de la evaluación de diferentes tipos de fibras ópticas de campo evanescente, tales como las fibras ópticas adelgazadas, fibras pulidas o los sistemas de fibra resonante en forma de nudo o lazo. El dispositivo se pretende desarrollar a escala de laboratorio (TRL 6, según Technology Readiness Levels) y se evaluarán los parámetros de desempeño tales como sensibilidad, reproducibilidad, resolución, precisión y la figura de mérito. Los sensores ópticos basados en fibras ópticas son importantes porque constituyen herramientas de medición y detección con parámetros de desempeño que pueden ser superiores a los dispositivos con la tecnología tradicional, los cuales pueden medir y detectar variables físicas, químicas o biológicas y elementos o biocompuestos que son difíciles de detectar. Durante la ejecución del mismo, se abordará un objetivo general y tres objetivos específicos que garantizan la ejecución de la propuesta de investigación con equipos, herramientas, insumos y software que serán aportados desde el grupo de investigación de óptica e informática. Con relación a la metodología de la propuesta, por tratarse de una investigación experimental en el campo de las ciencias básicas, se requiere abordar la investigación desde la experimentación, iniciando con el diseño de la plataforma de medición, la funcionalización de la fibra óptica usada a través del recubrimiento con un material grafénico y la caracterización del dispositivo para la medida de la variable física, química o biológica seleccionada.
"""

DB_CONN_STR = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"

cv = CvParser.parse_text(raw_text)
print("=== PARSER RESULT ===")
print(f"Investigador: {cv.name} | {cv.nationality} | Nivel: {cv.highest_education_level}")
print(f"Artículos ({len(cv.articles)}):")
for a in cv.articles:
    print(f"  - {a.title} | {a.journal} ({a.year}) | DOI: {a.doi} | Autores: {len(a.authors)}")
print(f"Capítulos ({len(cv.book_chapters)}):")
for b in cv.book_chapters:
    print(f"  - {b.title} | {b.book} ({b.year}) | ISBN: {b.isbn}")
print(f"Eventos ({len(cv.events)}):")
for e in cv.events:
    print(f"  - [{e.product_type}] {e.product_title} ({e.year})")
print(f"Proyectos ({len(cv.projects)}):")
for p in cv.projects:
    print(f"  - {p.title} ({p.year})")

print("\n=== EJECUTANDO INGESTA ATOMICA EN SQL SERVER ===")
res = CvCommitService.commit_cvlac(cv, DB_CONN_STR)
print(res)
