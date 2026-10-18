import pyodbc

conn_str = "Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;"
conn = pyodbc.connect(conn_str)
conn.autocommit = True
cur = conn.cursor()

ddl_statements = [
    # 1. Product year column & index
    """
    IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Product') AND name = 'year')
    BEGIN
        ALTER TABLE Product ADD year INT NULL;
    END
    """,
    """
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Product_Year' AND object_id = OBJECT_ID('Product'))
    BEGIN
        CREATE NONCLUSTERED INDEX IX_Product_Year ON Product(year);
    END
    """,

    # 2. ResearchLine table
    """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchLine' AND xtype='U')
    CREATE TABLE ResearchLine (
        id          INT IDENTITY(1,1) PRIMARY KEY,
        name        NVARCHAR(300) NOT NULL UNIQUE,
        description NVARCHAR(MAX) NULL,
        created_at  DATETIME2 NOT NULL DEFAULT GETDATE()
    );
    """,

    # 3. GroupResearchLine relation
    """
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupResearchLine' AND xtype='U')
    CREATE TABLE GroupResearchLine (
        id         INT IDENTITY(1,1) PRIMARY KEY,
        group_id   INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
        line_id    INT NOT NULL REFERENCES ResearchLine(id)  ON DELETE CASCADE,
        CONSTRAINT UQ_GroupResearchLine UNIQUE (group_id, line_id)
    );
    """,

    # 4. ObservationWindow table
    """
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
    """,

    # 5. ImportJob table
    """
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
    """,

    # 6. AuditLog table
    """
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
    """,

    # 7. Seed ObservationWindows
    """
    IF NOT EXISTS (SELECT 1 FROM ObservationWindow)
    BEGIN
        INSERT INTO ObservationWindow (name, start_year, end_year, description, is_active) VALUES
            (N'Últimos 2 años (2025-2026)', 2025, 2026, N'Ventana estándar para producción reciente e indicadores de impacto inmediato', 1),
            (N'Últimos 5 años (2022-2026)', 2022, 2026, N'Ventana quinquenal oficial de medición Minciencias', 1),
            (N'Convocatoria 894 (2021-2023)', 2021, 2023, N'Periodo histórico de convocatoria nacional', 1),
            (N'Histórico Institucional (2015-2026)', 2015, 2026, N'Ventana institucional extendida de la UPC', 1);
    END
    """
]

for stmt in ddl_statements:
    cur.execute(stmt)

print("Schema migration completed successfully!")
cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
tables = [r[0] for r in cur.fetchall()]
print(f"Total tables ({len(tables)}):", tables)
