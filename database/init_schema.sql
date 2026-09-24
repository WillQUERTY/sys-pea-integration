-- =====================================================================
-- PEA-i Database Schema  (SQL Server)
-- Script de inicialización — ejecutar una sola vez
-- =====================================================================

-- Crear base de datos (ejecutar como admin)
-- USE master;
-- CREATE DATABASE peai;
-- GO

USE peai;
GO

-- =====================================================================
-- Tablas principales (entidades)
-- =====================================================================

-- Grupo de investigación
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchGroup' AND xtype='U')
CREATE TABLE ResearchGroup (
    id                     INT IDENTITY(1,1) PRIMARY KEY,
    external_code          NVARCHAR(50)   NOT NULL UNIQUE,
    name                   NVARCHAR(200)  NOT NULL,
    acronym                NVARCHAR(50)   NULL,
    description            NVARCHAR(MAX)  NULL,
    mission                NVARCHAR(MAX)  NULL,
    vision                 NVARCHAR(MAX)  NULL,
    declared_creation_date DATE           NULL,
    knowledge_area         NVARCHAR(200)  NULL,
    knowledge_subarea      NVARCHAR(200)  NULL,
    city                   NVARCHAR(100)  NULL,
    department             NVARCHAR(100)  NULL,
    website                NVARCHAR(500)  NULL,
    email                  NVARCHAR(200)  NULL,
    leader_id              INT            NULL,
    status                 NVARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at             DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at             DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Investigador
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Researcher' AND xtype='U')
CREATE TABLE Researcher (
    id                      INT IDENTITY(1,1) PRIMARY KEY,
    external_code           NVARCHAR(50)   NOT NULL UNIQUE,
    identification_type     NVARCHAR(20)   NULL,
    identification_number   NVARCHAR(30)   NULL,
    first_names             NVARCHAR(100)  NOT NULL,
    last_names              NVARCHAR(100)  NOT NULL,
    nationality             NVARCHAR(50)   NULL,
    country_of_residence    NVARCHAR(50)   NULL,
    institutional_email     NVARCHAR(200)  NULL,
    orcid                   NVARCHAR(50)   NULL,
    highest_education_level NVARCHAR(100)  NULL,
    status                  NVARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at              DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at              DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Familia de producto (catálogo)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductFamily' AND xtype='U')
CREATE TABLE ProductFamily (
    id   INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL UNIQUE
);
GO

-- Subtipo de producto (catálogo)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductSubtype' AND xtype='U')
CREATE TABLE ProductSubtype (
    id        INT IDENTITY(1,1) PRIMARY KEY,
    family_id INT NOT NULL REFERENCES ProductFamily(id),
    name      NVARCHAR(200) NOT NULL
);
GO

-- Categoría de calidad (catálogo)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualityCategory' AND xtype='U')
CREATE TABLE QualityCategory (
    id   INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE
);
GO

-- Producto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Product' AND xtype='U')
CREATE TABLE Product (
    id                   INT IDENTITY(1,1) PRIMARY KEY,
    external_code        NVARCHAR(50)   NOT NULL UNIQUE,
    title                NVARCHAR(500)  NOT NULL,
    description          NVARCHAR(MAX)  NULL,
    family_id            INT            NULL REFERENCES ProductFamily(id),
    subtype_id           INT            NULL REFERENCES ProductSubtype(id),
    quality_category_id  INT            NULL REFERENCES QualityCategory(id),
    obtained_date        DATE           NULL,
    publication_date     DATE           NULL,
    language             NVARCHAR(20)   NULL,
    country              NVARCHAR(50)   NULL,
    doi                  NVARCHAR(200)  NULL,
    isbn                 NVARCHAR(30)   NULL,
    issn                 NVARCHAR(30)   NULL,
    url                  NVARCHAR(500)  NULL,
    validation_status    NVARCHAR(20)   NOT NULL DEFAULT 'pending',
    status               NVARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at           DATETIME2      NOT NULL DEFAULT GETDATE(),
    updated_at           DATETIME2      NOT NULL DEFAULT GETDATE()
);
GO

-- Proyecto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Project' AND xtype='U')
CREATE TABLE Project (
    id                        INT IDENTITY(1,1) PRIMARY KEY,
    title                     NVARCHAR(500) NOT NULL,
    summary                   NVARCHAR(MAX) NULL,
    project_type              NVARCHAR(50)  NULL,
    start_date                DATE          NULL,
    end_date                  DATE          NULL,
    status                    NVARCHAR(20)  NOT NULL DEFAULT 'active',
    funding_type              NVARCHAR(50)  NULL,
    budget                    DECIMAL(18,2) NULL,
    principal_investigator_id INT           NULL REFERENCES Researcher(id),
    created_at                DATETIME2     NOT NULL DEFAULT GETDATE(),
    updated_at                DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- Plan de trabajo
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WorkPlan' AND xtype='U')
CREATE TABLE WorkPlan (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    group_id    INT           NOT NULL REFERENCES ResearchGroup(id),
    title       NVARCHAR(200) NOT NULL,
    description NVARCHAR(MAX) NULL,
    start_date  DATE          NULL,
    end_date    DATE          NULL,
    status      NVARCHAR(20)  NOT NULL DEFAULT 'active',
    created_at  DATETIME2     NOT NULL DEFAULT GETDATE()
);
GO

-- =====================================================================
-- Tablas intermedias (relaciones = multilista en la DB)
-- =====================================================================

-- Grupo ↔ Investigador
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMembership' AND xtype='U')
CREATE TABLE GroupMembership (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    group_id      INT         NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    researcher_id INT         NOT NULL REFERENCES Researcher(id)    ON DELETE CASCADE,
    start_date    DATE        NULL,
    end_date      DATE        NULL,
    role          NVARCHAR(50) NULL,
    status        NVARCHAR(20) NOT NULL DEFAULT 'active',
    CONSTRAINT UQ_GroupMembership UNIQUE (group_id, researcher_id, start_date)
);
GO

-- Grupo ↔ Producto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProductLink' AND xtype='U')
CREATE TABLE GroupProductLink (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    group_id   INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES Product(id)       ON DELETE CASCADE,
    CONSTRAINT UQ_GroupProduct UNIQUE (group_id, product_id)
);
GO

-- Producto ↔ Autor (investigador)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductAuthor' AND xtype='U')
CREATE TABLE ProductAuthor (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    product_id    INT NOT NULL REFERENCES Product(id)    ON DELETE CASCADE,
    researcher_id INT NOT NULL REFERENCES Researcher(id) ON DELETE CASCADE,
    author_order  INT NULL,
    CONSTRAINT UQ_ProductAuthor UNIQUE (product_id, researcher_id)
);
GO

-- Grupo ↔ Proyecto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProject' AND xtype='U')
CREATE TABLE GroupProject (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    group_id   INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
    project_id INT NOT NULL REFERENCES Project(id)       ON DELETE CASCADE,
    CONSTRAINT UQ_GroupProject UNIQUE (group_id, project_id)
);
GO

-- Investigador ↔ Proyecto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearcherProject' AND xtype='U')
CREATE TABLE ResearcherProject (
    id            INT IDENTITY(1,1) PRIMARY KEY,
    researcher_id INT NOT NULL REFERENCES Researcher(id) ON DELETE CASCADE,
    project_id    INT NOT NULL REFERENCES Project(id)    ON DELETE CASCADE,
    role          NVARCHAR(50) NULL,
    CONSTRAINT UQ_ResearcherProject UNIQUE (researcher_id, project_id)
);
GO

-- Proyecto ↔ Producto
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProjectProduct' AND xtype='U')
CREATE TABLE ProjectProduct (
    id         INT IDENTITY(1,1) PRIMARY KEY,
    project_id INT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES Product(id) ON DELETE NO ACTION,
    CONSTRAINT UQ_ProjectProduct UNIQUE (project_id, product_id)
);
GO

-- =====================================================================
-- Tablas de soporte (pila y cola)
-- =====================================================================

-- Pila de operaciones (historial / undo)
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UndoOperation' AND xtype='U')
CREATE TABLE UndoOperation (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    operation_type  NVARCHAR(50)  NOT NULL,
    entity_type     NVARCHAR(50)  NOT NULL,
    entity_id       INT           NOT NULL,
    previous_state  NVARCHAR(MAX) NULL,      -- JSON snapshot antes del cambio
    performed_at    DATETIME2     NOT NULL DEFAULT GETDATE(),
    undone_at       DATETIME2     NULL       -- NULL = no revertida
);
GO

-- Cola de validación
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ValidationQueueItem' AND xtype='U')
CREATE TABLE ValidationQueueItem (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    product_id      INT          NOT NULL REFERENCES Product(id),
    enqueued_at     DATETIME2    NOT NULL DEFAULT GETDATE(),
    status          NVARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending, processing, done, failed
    attempts        INT          NOT NULL DEFAULT 0,
    assigned_to     NVARCHAR(100) NULL,
    result          NVARCHAR(MAX) NULL,
    processed_at    DATETIME2     NULL
);
GO

-- =====================================================================
-- Datos iniciales de catálogos (según MinCiencias)
-- =====================================================================

-- Familias de producto
IF NOT EXISTS (SELECT 1 FROM ProductFamily)
BEGIN
    INSERT INTO ProductFamily (name) VALUES
        (N'Productos de nuevo conocimiento'),
        (N'Productos de desarrollo tecnológico e innovación'),
        (N'Productos de apropiación social del conocimiento'),
        (N'Productos de formación de recurso humano');
END
GO

-- Categorías de calidad
IF NOT EXISTS (SELECT 1 FROM QualityCategory)
BEGIN
    INSERT INTO QualityCategory (name) VALUES
        (N'A1'), (N'A'), (N'B'), (N'C'), (N'D'),
        (N'Reconocido'), (N'No reconocido');
END
GO

PRINT 'PEA-i schema created successfully.';
GO
