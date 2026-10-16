// core_cpp/src/persistence/db/db_common.cpp
// Shared connection management, ODBC execution, schema definitions, and SQL utilities.

#include "persistence/db/db_common.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"

#include <cstdio>
#include <iostream>
#include <sstream>

namespace peai {

// =====================================================================
//  ODBC Connection Manager
// =====================================================================

struct OdbcConnection {
    SQLHENV env  = SQL_NULL_HENV;
    SQLHDBC dbc  = SQL_NULL_HDBC;
    bool    ok   = false;

    bool connect(const std::string& conn_str) {
        SQLAllocHandle(SQL_HANDLE_ENV, SQL_NULL_HANDLE, &env);
        SQLSetEnvAttr(env, SQL_ATTR_ODBC_VERSION, (void*)SQL_OV_ODBC3, 0);
        SQLAllocHandle(SQL_HANDLE_DBC, env, &dbc);

        SQLCHAR outbuf[1024];
        SQLSMALLINT outlen;
        SQLRETURN ret = SQLDriverConnect(
            dbc, nullptr,
            (SQLCHAR*)conn_str.c_str(), (SQLSMALLINT)conn_str.size(),
            outbuf, sizeof(outbuf), &outlen,
            SQL_DRIVER_NOPROMPT
        );
        ok = SQL_SUCCEEDED(ret);
        if (!ok) std::cerr << "[DB] Connection failed.\n";
        return ok;
    }

    void disconnect() {
        if (dbc != SQL_NULL_HDBC) { SQLDisconnect(dbc); SQLFreeHandle(SQL_HANDLE_DBC, dbc); }
        if (env != SQL_NULL_HENV) { SQLFreeHandle(SQL_HANDLE_ENV, env); }
        dbc = SQL_NULL_HDBC; env = SQL_NULL_HENV; ok = false;
    }
    ~OdbcConnection() { disconnect(); }
};

static OdbcConnection _activeDbConn;
static std::string    _lastConnStr;

SQLHDBC get_or_create_dbc(const std::string& connection_string) {
    if (_activeDbConn.ok && _lastConnStr == connection_string) {
        return _activeDbConn.dbc;
    }
    _activeDbConn.disconnect();
    if (_activeDbConn.connect(connection_string)) {
        _lastConnStr = connection_string;
        return _activeDbConn.dbc;
    }
    return SQL_NULL_HDBC;
}

void close_active_dbc() {
    _activeDbConn.disconnect();
    _lastConnStr.clear();
}

// =====================================================================
//  Encoding conversion (CP1252 <-> UTF-8)
// =====================================================================

std::string cp1252_to_utf8(const char* str) {
    if (!str || !*str) return "";
#ifdef _WIN32
    int wlen = MultiByteToWideChar(1252, 0, str, -1, NULL, 0);
    if (wlen <= 0) return str;
    std::wstring wstr(wlen, 0);
    MultiByteToWideChar(1252, 0, str, -1, &wstr[0], wlen);
    
    int ulen = WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, NULL, 0, NULL, NULL);
    if (ulen <= 0) return str;
    std::string ustr(ulen, 0);
    WideCharToMultiByte(CP_UTF8, 0, wstr.c_str(), -1, &ustr[0], ulen, NULL, NULL);
    if (!ustr.empty() && ustr.back() == '\0') ustr.pop_back();
    return ustr;
#else
    return str;
#endif
}

std::string utf8_to_cp1252(const std::string& utf8_str) {
    if (utf8_str.empty()) return "";
#ifdef _WIN32
    int wlen = MultiByteToWideChar(CP_UTF8, 0, utf8_str.c_str(), -1, NULL, 0);
    if (wlen <= 0) return utf8_str;
    std::wstring wstr(wlen, 0);
    MultiByteToWideChar(CP_UTF8, 0, utf8_str.c_str(), -1, &wstr[0], wlen);
    
    int len = WideCharToMultiByte(1252, 0, wstr.c_str(), -1, NULL, 0, NULL, NULL);
    if (len <= 0) return utf8_str;
    std::string cp(len, 0);
    WideCharToMultiByte(1252, 0, wstr.c_str(), -1, &cp[0], len, NULL, NULL);
    if (!cp.empty() && cp.back() == '\0') cp.pop_back();
    return cp;
#else
    return utf8_str;
#endif
}

// =====================================================================
//  SQL execution and escaping
// =====================================================================

std::string escape_sql(const std::string& str) {
    std::string res;
    res.reserve(str.size() + 16);
    for (char c : str) {
        if (c == '\'') res += "''";
        else res += c;
    }
    return res;
}

bool exec_sql(SQLHDBC dbc, const std::string& sql) {
    SQLHSTMT stmt;
    SQLRETURN r_alloc = SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(r_alloc)) {
        return false;
    }
    SQLRETURN ret = SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    if (!SQL_SUCCEEDED(ret) && ret != SQL_NO_DATA) {
        SQLCHAR state[7] = {0}, msg[1024] = {0};
        SQLINTEGER native = 0;
        SQLSMALLINT len = 0;
        SQLGetDiagRec(SQL_HANDLE_STMT, stmt, 1, state, &native, msg, sizeof(msg), &len);
        if (state[0] != 0) {
            std::cerr << "[DB Error " << state << "] " << msg << "\n";
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
        return false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return true;
}

// =====================================================================
//  Schema creation (16 tables + Catalogs)
// =====================================================================

bool ensure_schema(SQLHDBC dbc) {
    const char* ddl[] = {
        // 1. Catalogs
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductFamily' AND xtype='U')
           CREATE TABLE ProductFamily (
               id INT IDENTITY(1,1) PRIMARY KEY,
               name NVARCHAR(200) NOT NULL UNIQUE))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductSubtype' AND xtype='U')
           CREATE TABLE ProductSubtype (
               id INT IDENTITY(1,1) PRIMARY KEY,
               family_id INT NOT NULL REFERENCES ProductFamily(id) ON DELETE CASCADE,
               name NVARCHAR(200) NOT NULL))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='QualityCategory' AND xtype='U')
           CREATE TABLE QualityCategory (
               id INT IDENTITY(1,1) PRIMARY KEY,
               name NVARCHAR(100) NOT NULL UNIQUE))",

        // 2. Entities
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchGroup' AND xtype='U')
           CREATE TABLE ResearchGroup (
               id INT IDENTITY(1,1) PRIMARY KEY,
               external_code NVARCHAR(50) NOT NULL,
               name NVARCHAR(500) NOT NULL,
               acronym NVARCHAR(100) NULL,
               institution NVARCHAR(500) NULL,
               classification NVARCHAR(50) NULL,
               description NVARCHAR(MAX) NULL,
               mission NVARCHAR(MAX) NULL,
               vision NVARCHAR(MAX) NULL,
               declared_creation_date NVARCHAR(50) NULL,
               knowledge_area NVARCHAR(200) NULL,
               knowledge_subarea NVARCHAR(200) NULL,
               city NVARCHAR(100) NULL,
               department NVARCHAR(100) NULL,
               website NVARCHAR(500) NULL,
               email NVARCHAR(200) NULL,
               leader_id INT NULL,
               status NVARCHAR(50) NOT NULL DEFAULT 'active',
               created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
               updated_at DATETIME2 NOT NULL DEFAULT GETDATE()))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Researcher' AND xtype='U')
           CREATE TABLE Researcher (
               id INT IDENTITY(1,1) PRIMARY KEY,
               external_code NVARCHAR(50) NOT NULL,
               identification_type NVARCHAR(50) NULL,
               identification_number NVARCHAR(50) NULL,
               first_names NVARCHAR(150) NOT NULL,
               last_names NVARCHAR(150) NOT NULL,
               nationality NVARCHAR(50) NULL,
               country_of_residence NVARCHAR(50) NULL,
               institutional_email NVARCHAR(200) NULL,
               orcid NVARCHAR(50) NULL,
               highest_education_level NVARCHAR(100) NULL,
               education_records NVARCHAR(MAX) NULL,
               classification_records NVARCHAR(MAX) NULL,
               status NVARCHAR(50) NOT NULL DEFAULT 'active',
               created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
               updated_at DATETIME2 NOT NULL DEFAULT GETDATE()))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Product' AND xtype='U')
           CREATE TABLE Product (
               id INT IDENTITY(1,1) PRIMARY KEY,
               external_code NVARCHAR(50) NOT NULL,
               title NVARCHAR(500) NOT NULL,
               description NVARCHAR(MAX) NULL,
               family_id INT NULL REFERENCES ProductFamily(id),
               subtype_id INT NULL REFERENCES ProductSubtype(id),
               quality_category_id INT NULL REFERENCES QualityCategory(id),
               obtained_date NVARCHAR(50) NULL,
               publication_date NVARCHAR(50) NULL,
               language NVARCHAR(50) NULL,
               country NVARCHAR(100) NULL,
               doi NVARCHAR(200) NULL,
               isbn NVARCHAR(50) NULL,
               issn NVARCHAR(50) NULL,
               url NVARCHAR(500) NULL,
               validation_status NVARCHAR(50) NOT NULL DEFAULT 'pending',
               evidence NVARCHAR(MAX) NULL,
               specialized_attributes NVARCHAR(MAX) NULL,
               status NVARCHAR(50) NOT NULL DEFAULT 'active',
               created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
               updated_at DATETIME2 NOT NULL DEFAULT GETDATE()))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Project' AND xtype='U')
           CREATE TABLE Project (
               id INT IDENTITY(1,1) PRIMARY KEY,
               title NVARCHAR(500) NOT NULL,
               summary NVARCHAR(MAX) NULL,
               project_type NVARCHAR(100) NULL,
               start_date NVARCHAR(50) NULL,
               end_date NVARCHAR(50) NULL,
               status NVARCHAR(50) NOT NULL DEFAULT 'active',
               funding_type NVARCHAR(100) NULL,
               budget DECIMAL(18,2) NULL,
               principal_investigator_id INT NULL REFERENCES Researcher(id),
               created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
               updated_at DATETIME2 NOT NULL DEFAULT GETDATE()))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='WorkPlan' AND xtype='U')
           CREATE TABLE WorkPlan (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
               title NVARCHAR(250) NOT NULL,
               description NVARCHAR(MAX) NULL,
               start_date NVARCHAR(50) NULL,
               end_date NVARCHAR(50) NULL,
               status NVARCHAR(50) NOT NULL DEFAULT 'active',
               created_at DATETIME2 NOT NULL DEFAULT GETDATE()))",

        // 3. Relationships / Multilistas
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMembership' AND xtype='U')
           CREATE TABLE GroupMembership (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
               researcher_id INT NOT NULL REFERENCES Researcher(id) ON DELETE CASCADE,
               role NVARCHAR(100) NULL DEFAULT 'Investigador',
               start_date NVARCHAR(50) NULL,
               end_date NVARCHAR(50) NULL,
               status NVARCHAR(50) NOT NULL DEFAULT 'active',
               CONSTRAINT UQ_GroupMembership UNIQUE (group_id, researcher_id)))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProductLink' AND xtype='U')
           CREATE TABLE GroupProductLink (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
               product_id INT NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
               CONSTRAINT UQ_GroupProduct UNIQUE (group_id, product_id)))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProductAuthor' AND xtype='U')
           CREATE TABLE ProductAuthor (
               id INT IDENTITY(1,1) PRIMARY KEY,
               product_id INT NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
               researcher_id INT NOT NULL REFERENCES Researcher(id) ON DELETE CASCADE,
               author_order INT NULL DEFAULT 1,
               CONSTRAINT UQ_ProductAuthor UNIQUE (product_id, researcher_id)))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProject' AND xtype='U')
           CREATE TABLE GroupProject (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL REFERENCES ResearchGroup(id) ON DELETE CASCADE,
               project_id INT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
               CONSTRAINT UQ_GroupProject UNIQUE (group_id, project_id)))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearcherProject' AND xtype='U')
           CREATE TABLE ResearcherProject (
               id INT IDENTITY(1,1) PRIMARY KEY,
               researcher_id INT NOT NULL REFERENCES Researcher(id) ON DELETE CASCADE,
               project_id INT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
               role NVARCHAR(100) NULL,
               CONSTRAINT UQ_ResearcherProject UNIQUE (researcher_id, project_id)))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ProjectProduct' AND xtype='U')
           CREATE TABLE ProjectProduct (
               id INT IDENTITY(1,1) PRIMARY KEY,
               project_id INT NOT NULL REFERENCES Project(id) ON DELETE CASCADE,
               product_id INT NOT NULL REFERENCES Product(id) ON DELETE NO ACTION,
               CONSTRAINT UQ_ProjectProduct UNIQUE (project_id, product_id)))",

        // 4. Data structures support
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='UndoOperation' AND xtype='U')
           CREATE TABLE UndoOperation (
               id INT IDENTITY(1,1) PRIMARY KEY,
               operation_type NVARCHAR(50) NOT NULL,
               entity_type NVARCHAR(50) NOT NULL,
               entity_id INT NOT NULL,
               previous_state NVARCHAR(MAX) NULL,
               performed_at DATETIME2 NOT NULL DEFAULT GETDATE(),
               undone_at DATETIME2 NULL))",

        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ValidationQueueItem' AND xtype='U')
           CREATE TABLE ValidationQueueItem (
               id INT IDENTITY(1,1) PRIMARY KEY,
               product_id INT NOT NULL REFERENCES Product(id) ON DELETE CASCADE,
               enqueued_at DATETIME2 NOT NULL DEFAULT GETDATE(),
               status NVARCHAR(50) NOT NULL DEFAULT 'pending',
               attempts INT NOT NULL DEFAULT 0,
               assigned_to NVARCHAR(100) NULL,
               result NVARCHAR(MAX) NULL,
               processed_at DATETIME2 NULL))",

        nullptr
    };

    for (int i = 0; ddl[i]; i++) {
        if (!exec_sql(dbc, ddl[i])) {
            std::cerr << "[DB] DDL #" << i << " failed.\n";
            return false;
        }
    }
    return true;
}

// =====================================================================
//  JSON String Escaping
// =====================================================================

std::string json_escape(const std::string& s) {
    std::string res;
    res.reserve(s.size() + 8);
    for (char c : s) {
        switch (c) {
            case '"':  res += "\\\""; break;
            case '\\': res += "\\\\"; break;
            case '\b': res += "\\b";  break;
            case '\f': res += "\\f";  break;
            case '\n': res += "\\n";  break;
            case '\r': res += "\\r";  break;
            case '\t': res += "\\t";  break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    snprintf(buf, sizeof(buf), "\\u%04x", c);
                    res += buf;
                } else {
                    res += c;
                }
        }
    }
    return res;
}

// =====================================================================
//  Entity ID resolution (RAM ID <-> DB IDENTITY via external_code)
// =====================================================================

std::string db_id_expr(const char* table, const std::string& ext, int ram_id) {
    if (ext.empty()) return std::to_string(ram_id);
    return "(SELECT id FROM " + std::string(table) + " WHERE external_code = '" +
           escape_sql(utf8_to_cp1252(ext)) + "')";
}

std::string group_db_id(int ram_id) {
    auto o = get_group(ram_id);
    return db_id_expr("ResearchGroup", o ? o->external_code : "", ram_id);
}

std::string researcher_db_id(int ram_id) {
    auto o = get_researcher(ram_id);
    return db_id_expr("Researcher", o ? o->external_code : "", ram_id);
}

std::string product_db_id(int ram_id) {
    auto o = get_product(ram_id);
    return db_id_expr("Product", o ? o->external_code : "", ram_id);
}

std::string nullable_int(int v) {
    return v > 0 ? std::to_string(v) : "NULL";
}

std::string nullable_date(const std::string& s) {
    return s.empty() ? "NULL" : "'" + escape_sql(utf8_to_cp1252(s)) + "'";
}

// =====================================================================
//  SQL Query Helpers
// =====================================================================

std::vector<std::pair<std::string, int>> query_group_counts(SQLHDBC dbc, const std::string& sql) {
    std::vector<std::pair<std::string, int>> rows;
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS))) {
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
        return rows;
    }
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char label[512]; SQLLEN i1, i2; int count = 0;
        SQLGetData(stmt, 1, SQL_C_CHAR, label, sizeof(label), &i1);
        SQLGetData(stmt, 2, SQL_C_LONG, &count, 0, &i2);
        rows.emplace_back(i1 != SQL_NULL_DATA ? cp1252_to_utf8(label) : "", count);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return rows;
}

void query_catalog(SQLHDBC dbc, const char* sql, bool with_extra, std::string& out) {
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    if (!SQL_SUCCEEDED(SQLExecDirect(stmt, (SQLCHAR*)sql, SQL_NTS))) {
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
        return;
    }
    bool first = true;
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int id = 0, extra = 0; SQLLEN i1, i2, i3;
        char name[512];
        SQLGetData(stmt, 1, SQL_C_LONG, &id, 0, &i1);
        if (with_extra) SQLGetData(stmt, 2, SQL_C_LONG, &extra, 0, &i2);
        SQLGetData(stmt, with_extra ? 3 : 2, SQL_C_CHAR, name, sizeof(name), &i3);
        if (!first) out += ",";
        out += "{\"id\":" + std::to_string(id);
        if (with_extra) out += ",\"family_id\":" + std::to_string(extra);
        out += ",\"name\":\"" + json_escape(i3 != SQL_NULL_DATA ? cp1252_to_utf8(name) : "") + "\"}";
        first = false;
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
}

} // namespace peai
