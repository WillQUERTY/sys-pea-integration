# Borrador de Correo de Entrega — Parcial 2 EdD

**Destinatario:** adithperez@unicesar.edu.co  
**Asunto:** Estructura de datos Parcial 2 Grupo # 2026  
**Fecha:** 24 de octubre de 2026  
**Grupo:** WP - DN - EO (Universidad Popular del Cesar)

---

## Asunto

Estructura de datos Parcial 2 Grupo # 2026

## Cuerpo del mensaje

Estimado Ing. Adith Pérez:

Por la presente remitimos la entrega del Parcial 2 de la asignatura Estructura de Datos, correspondiente al grupo WP-DN-EO de la Universidad Popular del Cesar.

Integrantes del grupo:
- William Andrés Peñaranda Oñate (WP) — Ingeniería de Sistemas
- Donaldo David Noriega Palomino (DN) — Ingeniería de Sistemas
- Edinson José Olivero Rojas (EO) — Ingeniería de Sistemas

## Archivos adjuntos

1. **Taller2_WP-DN-EO.py** — Código fuente en Python con las respuestas a los dos ejercicios del Parcial 2: cálculo del I_Grupo y el I_Investigador (indicador de producción científica, Modelo de Medición Minciencias 2024 §3.10), con la identificación explícita de las variables de entrada y de salida del modelo para grupo e investigador.
2. **Taller2_WP-DN-EO.cpp** — Código fuente en C++ con las mismas respuestas a los dos ejercicios del Parcial 2, con paridad numérica exacta respecto de la versión en Python.
3. **Parcial2_WP-DN-EO.docx** — Documento de especificación técnica en Word con diseño de la estructura de datos, estrategia de solución, diagramas de casos de uso (UML), diagramas de secuencia (UML), matriz de trazabilidad y la sección de indicadores con las variables de entrada y salida del modelo.
4. **INTEGRANTES.txt** — Archivo de identificación de los estudiantes del grupo (nombres y programa).
5. **pea_data.json** — Archivo de persistencia con los datos utilizados (12 colecciones completas).

> Los archivos fuente llevan las iniciales del grupo en el nombre, conforme a la NOTA 8 del enunciado.

## Enlaces de referencia

- Repositorio GitHub: https://github.com/WillQUERTY/sys-pea-integration
- Video demostrativo (YouTube): https://www.youtube.com/watch?v=eezB3oZ3n2w&t=12s
- Versión en vivo (despliegue web): http://155.133.22.12/

## Plazos de entrega

- Entrega preliminar: viernes 23 de octubre de 2026, 11:59 a. m.
- Entrega definitiva: lunes 26 de octubre de 2026, 11:59 a. m.

Quedamos atentos a cualquier observación o comentario.

Atentamente,  
Grupo WP-DN-EO  
Universidad Popular del Cesar — Facultad de Ingenierías y Tecnológicas — Ingeniería de Sistemas

---

## Checklist previo al envío (no forma parte del correo)

1. **Verificar `INTEGRANTES.txt`**: lleva nombres completos, iniciales, programa y universidad de los 3 integrantes (WP-DN-EO). La NOTA 4 del enunciado pide identificación de los estudiantes y no exige código estudiantil ni correo institucional, por tanto no quedan campos pendientes.
2. **Rearmar y verificar el paquete**:
   ```
   python -X utf8 scripts/build_paquete_entrega.py
   ```
   El script copia los 5 adjuntos a `dist/entrega_parcial2/`, genera `Parcial2_WP-DN-EO.zip` y **sale con código de error 1** mientras queden campos sin llenar, de modo que no se pueda mandar el paquete con los marcadores. También verifica byte a byte cada adjunto contra su fuente en el repositorio.
3. **Adjuntar** los 5 archivos de `dist/entrega_parcial2/` (o el ZIP, que tiene exactamente el mismo contenido) con el asunto del encabezado, sin cambios.
4. **Fecha de envío:** dentro de la ventana de la entrega definitiva (lunes 26 de octubre de 2026, 11:59 a. m.).
