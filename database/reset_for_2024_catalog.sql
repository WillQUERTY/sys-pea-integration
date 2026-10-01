-- =====================================================================
-- RESET para migracion al catalogo Minciencias 2024
-- =====================================================================
-- BORRA: productos, grupos, investigadores, membresias, colas de
-- validacion, historial de importaciones y catalogos viejos.
-- CONSERVA: Project (con principal_investigator_id en NULL), ResearchLine
-- y ObservationWindow.
-- El grupo y los investigadores se recapturan de GrupLAC/CvLAC en la
-- Fase 6 (reimport); los productos se reimportan con tipologias 2024.
--
-- !! PREREQUISITO: backend DETENIDO (uvicorn :8123 y todo proceso con
-- conexion abierta a peai). El núcleo C++ cachea estado en RAM: resetear
-- la BD por debajo lo desincroniza.
-- !! Este script NO es reversible: ejecutar solo como parte del
-- procedimiento Fase 6 o de la Fase 1 (decision aprobada: reimport
-- desde cero).
-- =====================================================================

USE peai;
GO

SET QUOTED_IDENTIFIER ON;
GO

BEGIN TRY
BEGIN TRANSACTION;

    ------------------------------------------------------------------
    -- 1. Estructuras dependientes de Product (FK NO ACTION primero)
    ------------------------------------------------------------------
    DELETE FROM ValidationQueueItem;   -- FK -> Product (cascade, explicito)
    DELETE FROM ProjectProduct;        -- FK -> Product es NO ACTION: va primero
    DELETE FROM GroupProductLink;       -- FK -> Product / ResearchGroup
    DELETE FROM ProductAuthor;          -- FK -> Product / Researcher

    ------------------------------------------------------------------
    -- 2. Importaciones (se reimportaran con el scraper 2024)
    ------------------------------------------------------------------
    DELETE FROM ImportRecord;           -- FK -> ImportJob (cascade)
    DELETE FROM ImportJob;

    ------------------------------------------------------------------
    -- 3. Productos
    ------------------------------------------------------------------
    DELETE FROM Product;

    ------------------------------------------------------------------
    -- 4. Miembros e investigadores (Project conserva su fila, sin PI)
    ------------------------------------------------------------------
    UPDATE Project SET principal_investigator_id = NULL;  -- FK NO ACTION -> Researcher
    DELETE FROM GroupMembership;
    DELETE FROM ResearcherProject;
    DELETE FROM GroupProject;
    DELETE FROM Researcher;

    ------------------------------------------------------------------
    -- 5. Grupos (WorkPlan y GroupResearchLine salen por ON DELETE CASCADE)
    ------------------------------------------------------------------
    DELETE FROM ResearchGroup;

    ------------------------------------------------------------------
    -- 6. Historial que quedaria apuntando a entidades muertas
    ------------------------------------------------------------------
    DELETE FROM AuditLog;
    DELETE FROM UndoOperation;          -- la pila resurrect-productos: fuera

    ------------------------------------------------------------------
    -- 7. Catalogos viejos (ahora vienen de catalog_2024.json via seed)
    ------------------------------------------------------------------
    DELETE FROM QualityCategory;        -- antes que ProductSubtype (FK subtype_id)
    DELETE FROM ProductSubtype;
    DELETE FROM ProductFamily;

COMMIT TRANSACTION;
PRINT 'RESET OK: base lista para seed_catalog_2024.py';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT 'RESET FALLO: ' + ERROR_MESSAGE();
    THROW;
END CATCH;
GO

-- Verificacion: todo lo borrado debe quedar en cero
SELECT 'Product' AS tabla, COUNT(*) AS n FROM Product
UNION ALL SELECT 'ResearchGroup', COUNT(*) FROM ResearchGroup
UNION ALL SELECT 'Researcher', COUNT(*) FROM Researcher
UNION ALL SELECT 'GroupMembership', COUNT(*) FROM GroupMembership
UNION ALL SELECT 'ValidationQueueItem', COUNT(*) FROM ValidationQueueItem
UNION ALL SELECT 'ImportJob', COUNT(*) FROM ImportJob
UNION ALL SELECT 'ImportRecord', COUNT(*) FROM ImportRecord
UNION ALL SELECT 'ProductFamily', COUNT(*) FROM ProductFamily
UNION ALL SELECT 'ProductSubtype', COUNT(*) FROM ProductSubtype
UNION ALL SELECT 'QualityCategory', COUNT(*) FROM QualityCategory
UNION ALL SELECT 'AuditLog', COUNT(*) FROM AuditLog
UNION ALL SELECT 'UndoOperation', COUNT(*) FROM UndoOperation
UNION ALL SELECT 'Project (conserva)', COUNT(*) FROM Project
UNION ALL SELECT 'ResearchLine (conserva)', COUNT(*) FROM ResearchLine
UNION ALL SELECT 'ObservationWindow (conserva)', COUNT(*) FROM ObservationWindow;
GO
