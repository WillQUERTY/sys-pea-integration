-- =====================================================================
-- Khemia Database Schema (SQL Server)
-- Script de inicializacion y definicion del modelo de datos completo
-- Especificacion Integral Khemia (Taller 2 Estructura de Datos)
-- =====================================================================

USE peai;
GO

-- Los indices filtrados de la seccion 5 exigen QUOTED_IDENTIFIER ON.
-- sqlcmd lo trae OFF por defecto; pyodbc/ODBC lo ponen ON solos.
SET QUOTED_IDENTIFIER ON;
GO

-- =====================================================================
-- 1. Tablas de catalogos (Minciencias)
-- =====================================================================

-- Familia de producto (modelo 2024: code GNC/DTI/ASC/DPC/FRH)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductFamily' AND xtype='U')
CREATE TABLE ProductFamily (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    code       NVARCHAR(50)  NULL,
    name       NVARCHAR(200) NOT NULL UNIQUE,
    sort_order INT           NULL
);
GO

-- Subtipo de producto (tipologias 2024: ART/SF/EC/...)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductSubtype' AND xtype='U')
CREATE TABLE ProductSubtype (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    family_id  INT NOT NULL REFERENCES ProductFamily(id) ON DELETE CASCADE,
    code       NVARCHAR(50)  NULL,
    name       NVARCHAR(200) NOT NULL,
    model_ref  NVARCHAR(100) NULL,   -- numeral del documento 2024 (p.ej. 2.2.1.1)
    sort_order INT           NULL
);
GO

-- Categoria de calidad (categorias por tipologia, Anexo 1 del modelo 2024).
-- name = etiqueta visible (SE REPITE entre tipologias: la unicidad es por code).
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualityCategory' AND xtype='U')
CREATE TABLE QualityCategory (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    code              NVARCHAR(50)   NULL,
    name              NVARCHAR(300)  NOT NULL,
    subtype_id        INT            NULL REFERENCES ProductSubtype(id) ON DELETE CASCADE,
    measurement_class NVARCHAR(50)   NULL,   -- TOP/A/B/ASC/DPC/FRH-A/FRH-B (par. 3.7)
    weight            DECIMAL(10,2)  NULL,  -- peso relativo (Anexo 1)
    global_weight     DECIMAL(10,2)  NULL,  -- peso global (Tabla 6, par. 3.6)
    sort_order        INT            NULL
);
GO

-- =====================================================================
-- 2. Tablas principales (Entidades fundamentales)
-- =====================================================================

-- Grupo de investigacion
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchGroup' AND xtype='U')
CREATE TABLE ResearchGroup (
    id                     INT IDENTITY(1,1) PRIMARY KEY,
    external_code          NVARCHAR(50)   NOT NULL UNIQUE,
    name                   NVARCHAR(500)  NOT NULL,
    acronym                NVARCHAR(100)  NULL,
    institution            NVARCHAR(500)  NULL,   -- Institucion que avala (e.g. UPC)
    classification         NVARCHAR(300)  NULL,   -- Clasificacion Minciencias (A1, A, B, C, Reconocido)
    description            NVARCHAR(MAX)  NULL,
    mission                NVARCHAR(MAX)  NULL,
    vision                 NVARCHAR(MAX)  NULL,
    declared_creation_date NVARCHAR(50)   NULL,
    knowledge_area         NVARCHAR(200)  NULL,
    knowledge_subarea      NVARCHAR(200)  NULL,
    city                   NVARCHAR(100)  NULL,
    department             NVARCHAR(100)  NULL,
    website                NVARCHAR(500)  NULL,
    email                  NVARCHAR(200)  NULL,
    leader_id              INT            NULL,
    status                 NVARCHAR(50)   NOT NULL DEFAULT 'active',
    created_at             DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at             DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Investigador
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Researcher' AND xtype='U')
CREATE TABLE Researcher (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    external_code           NVARCHAR(50)   NOT NULL UNIQUE,
    identification_type     NVARCHAR(50)   NULL,
    identification_number   NVARCHAR(50)   NULL,
    first_names             NVARCHAR(150)  NOT NULL,
    last_names              NVARCHAR(150)  NOT NULL,
    nationality             NVARCHAR(50)   NULL,
    country_of_residence    NVARCHAR(50)   NULL,
    institutional_email     NVARCHAR(200)  NULL,
    orcid                   NVARCHAR(50)   NULL,
    highest_education_level NVARCHAR(100)  NULL,
    education_records       NVARCHAR(MAX)  NULL,
    classification_records  NVARCHAR(MAX)  NULL,
    status                  NVARCHAR(50)   NOT NULL DEFAULT 'active',
    created_at              DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Producto cientifico / academico
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Product' AND xtype='U')
CREATE TABLE Product (
    id                     INT IDENTITY(1,1) PRIMARY KEY,
    external_code          NVARCHAR(50)   NOT NULL UNIQUE,
    title                  NVARCHAR(500)  NOT NULL,
    description            NVARCHAR(MAX)  NULL,
    family_id              INT            NULL REFERENCES ProductFamily(id),
    subtype_id             INT            NULL REFERENCES ProductSubtype(id),
    quality_category_id    INT            NULL REFERENCES QualityCategory(id),
    obtained_date          NVARCHAR(50)   NULL,
    publication_date       NVARCHAR(50)   NULL,
    language               NVARCHAR(50)   NULL,
    country                NVARCHAR(100)  NULL,
    doi                    NVARCHAR(500)  NULL,
    isbn                   NVARCHAR(50)   NULL,
    issn                   NVARCHAR(50)   NULL,
    url                    NVARCHAR(500)  NULL,
    validation_status      NVARCHAR(50)   NOT NULL DEFAULT 'pending',
    evidence               NVARCHAR(MAX)  NULL,
    specialized_attributes NVARCHAR(MAX)  NULL,
    status                 NVARCHAR(50)   NOT NULL DEFAULT 'active',
    created_at             DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at             DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Proyecto de investigacion
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Project' AND xtype='U')
CREATE TABLE Project (
    id                        INT IDENTITY(1,1) PRIMARY KEY,
    title                     NVARCHAR(500)  NOT NULL,
    summary                   NVARCHAR(MAX)  NULL,
    project_type              NVARCHAR(100)  NULL,
    start_date                NVARCHAR(50)   NULL,
    end_date                  NVARCHAR(50)   NULL,
    status                    NVARCHAR(50)   NOT NULL DEFAULT 'active',
    funding_type              NVARCHAR(100)  NULL,
    budget                    DECIMAL(18,2)  NULL,
    principal_investigator_id INT            NULL REFERENCES Researcher(id),
    created_at                DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at                DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Plan de trabajo de grupo
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WorkPlan' AND xtype='U')
CREATE TABLE WorkPlan (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    group_id    INT            NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    title       NVARCHAR(250)  NOT NULL,
    description NVARCHAR(MAX)  NULL,
    start_date  NVARCHAR(50)   NULL,
    end_date    NVARCHAR(50)   NULL,
    status      NVARCHAR(50)   NOT NULL DEFAULT 'active',
    created_at  DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- =====================================================================
-- 3. Tablas intermedias (Relaciones / Multilistas)
-- =====================================================================

-- Multilista Grupo <-> Investigador (Integrantes del grupo)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMembership' AND xtype='U')
CREATE TABLE GroupMembership (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    group_id      INT           NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    researcher_id INT           NOT NULL REFERENCES Researcher(id)    ON DELETE CASCADE,
    role          NVARCHAR(100) NULL DEFAULT 'Investigador',
    start_date    NVARCHAR(50)  NULL,
    end_date      NVARCHAR(50)  NULL,
    status        NVARCHAR(50)  NOT NULL DEFAULT 'active',
    CONSTRAINT UQ_GroupMembership UNIQUE (group_id, researcher_id)
);
GO

-- Multilista Grupo <-> Producto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProductLink' AND xtype='U')
CREATE TABLE GroupProductLink (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    group_id          INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    product_id        INT NOT NULL REFERENCES Product(id)       ON DELETE CASCADE,
    status            NVARCHAR(50) NOT NULL DEFAULT 'approved',
    source            NVARCHAR(100) NULL DEFAULT 'system',
    requested_at      DATETIME2 NOT NULL DEFAULT GETDATE(),
    authorized_at     DATETIME2 NULL,
    validation_reason NVARCHAR(MAX) NULL,
    CONSTRAINT UQ_GroupProduct UNIQUE (group_id, product_id)
);
GO

-- Multilista Producto <-> Investigador (Autoria de productos)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductAuthor' AND xtype='U')
BEGIN
    CREATE TABLE ProductAuthor (
        id                         INT IDENTITY(1,1) PRIMARY KEY,
        product_id                 INT NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
        researcher_id              INT NULL REFERENCES Researcher(id)  ON DELETE CASCADE,
        author_order               INT NULL DEFAULT 1,
        external_author_name       NVARCHAR(250) NULL,
        external_author_identifier NVARCHAR(100) NULL,
        match_status               NVARCHAR(50) NOT NULL DEFAULT 'unverified'
    );
    CREATE UNIQUE INDEX UQ_ProductAuthor_Researcher ON ProductAuthor (product_id, researcher_id) WHERE researcher_id IS NOT NULL;
    CREATE UNIQUE INDEX UQ_ProductAuthor_External ON ProductAuthor (product_id, external_author_name) WHERE researcher_id IS NULL AND external_author_name IS NOT NULL;
END
GO

-- Relacion Grupo <-> Proyecto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProject' AND xtype='U')
CREATE TABLE GroupProject (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    group_id   INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    project_id INT NOT NULL REFERENCES Project(id)       ON DELETE CASCADE,
    CONSTRAINT UQ_GroupProject UNIQUE (group_id, project_id)
);
GO

-- Relacion Investigador <-> Proyecto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearcherProject' AND xtype='U')
CREATE TABLE ResearcherProject (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    researcher_id INT           NOT NULL REFERENCES Researcher(id) ON DELETE CASCADE,
    project_id    INT           NOT NULL REFERENCES Project(id)    ON DELETE CASCADE,
    role          NVARCHAR(100) NULL,
    CONSTRAINT UQ_ResearcherProject UNIQUE (researcher_id, project_id)
);
GO

-- Relacion Proyecto <-> Producto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProjectProduct' AND xtype='U')
CREATE TABLE ProjectProduct (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    project_id INT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES Product(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_ProjectProduct UNIQUE (project_id, product_id)
);
GO

-- =====================================================================
-- 4. Tablas de soporte de estructuras (Pila y Cola)
-- =====================================================================

-- Pila de operaciones (Undo / Historial LIFO)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UndoOperation' AND xtype='U')
CREATE TABLE UndoOperation (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    operation_type NVARCHAR(50)  NOT NULL,
    entity_type    NVARCHAR(50)  NOT NULL,
    entity_id      INT           NOT NULL,
    previous_state NVARCHAR(MAX) NULL,
    performed_at   DATETIME2     NOT NULL DEFAULT GETDATE(),
    undone_at      DATETIME2     NULL
);
GO

-- Cola de validacion (FIFO)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ValidationQueueItem' AND xtype='U')
CREATE TABLE ValidationQueueItem (
    id           INT IDENTITY(1,1) PRIMARY KEY,
    product_id   INT           NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
    enqueued_at  DATETIME2     NOT NULL DEFAULT GETDATE(),
    status       NVARCHAR(50)  NOT NULL DEFAULT 'pending',
    attempts     INT           NOT NULL DEFAULT 0,
    assigned_to  NVARCHAR(100) NULL,
    result       NVARCHAR(MAX) NULL,
    processed_at DATETIME2     NULL
);
GO

-- =====================================================================
-- 5. Catalogos Minciencias 2024: extension idempotente de columnas
-- =====================================================================
-- Los catalogos NO se siembran aqui. Fuente unica del catalogo 2024:
--     database/catalog_2024.json  ->  database/seed_catalog_2024.py (upsert)
-- Este bloque solo agrega a una BD existente las columnas nuevas (en una BD
-- nueva, los CREATE TABLE de la seccion 1 ya las traen y todo esto es no-op).

-- ProductFamily: codigo corto + orden del modelo
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ProductFamily') AND name = 'code')
BEGIN
    ALTER TABLE ProductFamily ADD code NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ProductFamily') AND name = 'sort_order')
BEGIN
    ALTER TABLE ProductFamily ADD sort_order INT NULL;
END
GO

-- ProductSubtype: codigo de tipologia 2024, numeral del documento y orden
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ProductSubtype') AND name = 'code')
BEGIN
    ALTER TABLE ProductSubtype ADD code NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ProductSubtype') AND name = 'model_ref')
BEGIN
    ALTER TABLE ProductSubtype ADD model_ref NVARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('ProductSubtype') AND name = 'sort_order')
BEGIN
    ALTER TABLE ProductSubtype ADD sort_order INT NULL;
END
GO

-- QualityCategory: categoria por tipologia (Anexo 1 del modelo 2024).
-- code = clave (ART_A1, ...); name = etiqueta visible, que se repite entre
-- tipologias ("Calidad A1" existe en varias), por eso la unicidad va en code.
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'code')
BEGIN
    ALTER TABLE QualityCategory ADD code NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'subtype_id')
BEGIN
    ALTER TABLE QualityCategory ADD subtype_id INT NULL REFERENCES ProductSubtype(id) ON DELETE CASCADE;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'measurement_class')
BEGIN
    ALTER TABLE QualityCategory ADD measurement_class NVARCHAR(50) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'weight')
BEGIN
    ALTER TABLE QualityCategory ADD weight DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'global_weight')
BEGIN
    ALTER TABLE QualityCategory ADD global_weight DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'sort_order')
BEGIN
    ALTER TABLE QualityCategory ADD sort_order INT NULL;
END
GO

-- Retirar el UNIQUE heredado sobre QualityCategory.name (las etiquetas 2024 se
-- repiten entre tipologias) y ensanchar la columna para las etiquetas largas.
-- (QUOTENAME se aplica en el SELECT: EXEC(...) solo concatena literales/variables)
DECLARE @qc_uc NVARCHAR(200);
SELECT @qc_uc = QUOTENAME(name) FROM sys.indexes WHERE object_id = OBJECT_ID('QualityCategory') AND is_unique_constraint = 1;
IF @qc_uc IS NOT NULL
BEGIN
    EXEC('ALTER TABLE QualityCategory DROP CONSTRAINT ' + @qc_uc);
END
GO

IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('QualityCategory') AND name = 'name' AND max_length < 600)
BEGIN
    ALTER TABLE QualityCategory ALTER COLUMN name NVARCHAR(300) NOT NULL;
END
GO

-- Unicidad real del catalogo 2024: el codigo (indice filtrado, tolera NULLs
-- de filas legacy hasta el reset)
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_ProductFamily_code' AND object_id = OBJECT_ID('ProductFamily'))
BEGIN
    CREATE UNIQUE INDEX UQ_ProductFamily_code ON ProductFamily(code) WHERE code IS NOT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_ProductSubtype_code' AND object_id = OBJECT_ID('ProductSubtype'))
BEGIN
    CREATE UNIQUE INDEX UQ_ProductSubtype_code ON ProductSubtype(code) WHERE code IS NOT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_QualityCategory_code' AND object_id = OBJECT_ID('QualityCategory'))
BEGIN
    CREATE UNIQUE INDEX UQ_QualityCategory_code ON QualityCategory(code) WHERE code IS NOT NULL;
END
GO

-- =====================================================================
-- 6. Extensiones analiticas, trazabilidad y lineas de investigacion
-- =====================================================================

-- Columna de anio e indice en Product para filtros analiticos ultra-rapidos
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Product') AND name = 'year')
BEGIN
    ALTER TABLE Product ADD year INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Product_Year' AND object_id = OBJECT_ID('Product'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Product_Year ON Product(year);
END
GO

-- Lineas de investigacion declaradas
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchLine' AND xtype='U')
CREATE TABLE ResearchLine (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(300) NOT NULL UNIQUE,
    description NVARCHAR(MAX) NULL,
    created_at  DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- Relacion Grupo <-> Linea de investigacion
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupResearchLine' AND xtype='U')
CREATE TABLE GroupResearchLine (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    group_id   INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    line_id    INT NOT NULL REFERENCES ResearchLine(id)  ON DELETE CASCADE,
    CONSTRAINT UQ_GroupResearchLine UNIQUE (group_id, line_id)
);
GO

-- Ventanas de observacion temporal (Hipercubo D4 / T-26)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ObservationWindow' AND xtype='U')
CREATE TABLE ObservationWindow (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    name        NVARCHAR(150) NOT NULL UNIQUE,
    start_year  INT NOT NULL,
    end_year    INT NOT NULL,
    description NVARCHAR(500) NULL,
    is_active   BIT NOT NULL DEFAULT 1,
    created_at  DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- Trabajos de importacion (URL / CSV / PDF)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ImportJob' AND xtype='U')
CREATE TABLE ImportJob (
    id                INT IDENTITY(1,1) PRIMARY KEY,
    source_type       NVARCHAR(50)  NOT NULL, -- 'url', 'csv', 'pdf'
    source_url        NVARCHAR(500) NULL,
    file_path         NVARCHAR(500) NULL,
    status            NVARCHAR(50)  NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_records     INT NOT NULL DEFAULT 0,
    new_records       INT NOT NULL DEFAULT 0,
    duplicate_records INT NOT NULL DEFAULT 0,
    error_count       INT NOT NULL DEFAULT 0,
    details           NVARCHAR(MAX) NULL,
    created_at        DATETIME2 NOT NULL DEFAULT GETDATE(),
    completed_at      DATETIME2 NULL
);
GO

-- Detalle de conciliacion por registro de importacion
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ImportRecord' AND xtype='U')
CREATE TABLE ImportRecord (
    id                  INT IDENTITY(1,1) PRIMARY KEY,
    job_id              INT NOT NULL REFERENCES ImportJob(id) ON DELETE CASCADE,
    entity_type         NVARCHAR(50) NOT NULL, -- 'Product', 'Member', 'Project'
    external_identifier NVARCHAR(100) NULL,
    action_taken        NVARCHAR(50) NOT NULL, -- 'matched', 'created', 'updated', 'rejected', 'skipped'
    source_data_summary NVARCHAR(500) NULL,
    resolution_details  NVARCHAR(MAX) NULL,
    created_at          DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

-- Registro de auditoria de modificaciones (Seccion 36 / 42.2)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLog' AND xtype='U')
CREATE TABLE AuditLog (
    id             INT IDENTITY(1,1) PRIMARY KEY,
    entity_type    NVARCHAR(50)  NOT NULL,
    entity_id      INT           NOT NULL,
    action         NVARCHAR(50)  NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'DEACTIVATE'
    changed_by     NVARCHAR(100) NULL DEFAULT 'system',
    change_details NVARCHAR(MAX) NULL,
    created_at     DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- Semillas de ventanas de observacion
IF NOT EXISTS (SELECT 1 FROM ObservationWindow)
BEGIN
    INSERT INTO ObservationWindow (name, start_year, end_year, description, is_active) VALUES
        (N'Últimos 2 años (2025-2026)', 2025, 2026, N'Ventana estándar para producción reciente e indicadores de impacto inmediato', 1),
        (N'Últimos 5 años (2022-2026)', 2022, 2026, N'Ventana quinquenal oficial de medición Minciencias', 1),
        (N'Convocatoria 894 (2021-2023)', 2021, 2023, N'Periodo histórico de convocatoria nacional', 1),
        (N'Histórico Institucional (2015-2026)', 2015, 2026, N'Ventana institucional extendida de la UPC', 1);
END
GO

