-- Recrea la base de datos peai desde cero (DROP + CREATE + schema + semillas)
-- Uso: sqlcmd -S localhost -E -i recreate_database.sql
-- NOTA: detener el backend (uvicorn) antes de ejecutar para liberar conexiones.
USE master;
GO
IF DB_ID('peai') IS NOT NULL
BEGIN
    ALTER DATABASE peai SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE peai;
END
GO
CREATE DATABASE peai;
GO
