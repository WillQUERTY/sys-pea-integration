// core_cpp/src/db_persistence.cpp
// SQL Server persistence layer for PEA-i.
// Implements: load_from_db, save_to_db, sync_group_to_db, initialize.
//
// Uses ODBC API (windows.h + sql.h) — available natively on Windows.
// On Linux, install unixODBC + msodbcsql17.
//
// The key idea: SQL Server is the SOURCE OF TRUTH.
// On startup we read the DB and BUILD the multilista in memory.
// On every mutation we SYNC back to the DB.

#include "core.h"

#ifdef _WIN32
#include <windows.h>
#endif
#include <sql.h>
#include <sqlext.h>

#include <iostream>
#include <string>
#include <vector>
#include <cstring>

namespace peai {

// =====================================================================
//  ODBC helpers (internal)
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
        if (!ok) {
            std::cerr << "[DB] Connection failed for: " << conn_str << "\n";
        }
        return ok;
    }

    void disconnect() {
        if (dbc != SQL_NULL_HDBC) { SQLDisconnect(dbc); SQLFreeHandle(SQL_HANDLE_DBC, dbc); }
        if (env != SQL_NULL_HENV) { SQLFreeHandle(SQL_HANDLE_ENV, env); }
        dbc = SQL_NULL_HDBC;
        env = SQL_NULL_HENV;
        ok = false;
    }

    ~OdbcConnection() { disconnect(); }
};

static bool exec_sql(SQLHDBC dbc, const std::string& sql) {
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLRETURN ret = SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return SQL_SUCCEEDED(ret);
}

// =====================================================================
//  Schema creation (idempotent — IF NOT EXISTS)
// =====================================================================

static bool ensure_schema(SQLHDBC dbc) {
    const char* ddl[] = {
        R"(
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchGroup' AND xtype='U')
        CREATE TABLE ResearchGroup (
            id             INT IDENTITY(1,1) PRIMARY KEY,
            external_code  NVARCHAR(50)  NOT NULL,
            name           NVARCHAR(200) NOT NULL,
            acronym        NVARCHAR(50)  NULL,
            description    NVARCHAR(MAX) NULL
        )
        )",
        R"(
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMembership' AND xtype='U')
        CREATE TABLE GroupMembership (
            id             INT IDENTITY(1,1) PRIMARY KEY,
            group_id       INT NOT NULL,
            researcher_id  INT NOT NULL,
            CONSTRAINT FK_Membership_Group FOREIGN KEY (group_id)
                REFERENCES ResearchGroup(id) ON DELETE CASCADE
        )
        )",
        R"(
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProductLink' AND xtype='U')
        CREATE TABLE GroupProductLink (
            id             INT IDENTITY(1,1) PRIMARY KEY,
            group_id       INT NOT NULL,
            product_id     INT NOT NULL,
            CONSTRAINT FK_ProductLink_Group FOREIGN KEY (group_id)
                REFERENCES ResearchGroup(id) ON DELETE CASCADE
        )
        )",
        nullptr
    };

    for (int i = 0; ddl[i]; i++) {
        if (!exec_sql(dbc, ddl[i])) {
            std::cerr << "[DB] Failed to execute DDL #" << i << "\n";
            return false;
        }
    }
    return true;
}

// =====================================================================
//  load_from_db:  SQL Server → multilista in memory
// =====================================================================

bool load_from_db(const std::string& connection_string) {
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;

    // Make sure tables exist
    if (!ensure_schema(conn.dbc)) return false;

    // --- Clear current in-memory state ---
    // (We reuse the existing delete_group which frees nodes properly)
    while (true) {
        auto groups = list_groups();
        if (groups.empty()) break;
        delete_group(groups[0].id);
    }

    // --- Load groups ---
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)"SELECT id, external_code, name, acronym, description FROM ResearchGroup ORDER BY id", SQL_NTS);

        SQLINTEGER db_id;
        SQLCHAR ext_code[64], gname[256], acronym[64], desc[4096];
        SQLLEN ind1, ind2, ind3, ind4, ind5;

        SQLBindCol(stmt, 1, SQL_C_SLONG,  &db_id,   0,            &ind1);
        SQLBindCol(stmt, 2, SQL_C_CHAR,   ext_code,  sizeof(ext_code), &ind2);
        SQLBindCol(stmt, 3, SQL_C_CHAR,   gname,     sizeof(gname),    &ind3);
        SQLBindCol(stmt, 4, SQL_C_CHAR,   acronym,   sizeof(acronym),  &ind4);
        SQLBindCol(stmt, 5, SQL_C_CHAR,   desc,      sizeof(desc),     &ind5);

        while (SQLFetch(stmt) == SQL_SUCCESS) {
            Group g;
            g.id            = 0; // create_group will assign
            g.external_code = (ind2 != SQL_NULL_DATA) ? (char*)ext_code : "";
            g.name          = (ind3 != SQL_NULL_DATA) ? (char*)gname    : "";
            g.acronym       = (ind4 != SQL_NULL_DATA) ? (char*)acronym  : "";
            g.description   = (ind5 != SQL_NULL_DATA) ? (char*)desc     : "";
            // NOTE: create_group assigns a new in-memory id.
            // We keep a map db_id → memory_id for linking.
            create_group(g);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // --- Load memberships ---
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)"SELECT group_id, researcher_id FROM GroupMembership", SQL_NTS);

        SQLINTEGER gid, rid;
        SQLLEN ig, ir;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &ig);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &rid, 0, &ir);

        while (SQLFetch(stmt) == SQL_SUCCESS) {
            add_member_to_group(gid, rid);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // --- Load product links ---
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)"SELECT group_id, product_id FROM GroupProductLink", SQL_NTS);

        SQLINTEGER gid, pid;
        SQLLEN ig, ip;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &ig);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &pid, 0, &ip);

        while (SQLFetch(stmt) == SQL_SUCCESS) {
            link_product_to_group(gid, pid);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::cout << "[DB] Loaded " << total_groups() << " groups, "
              << total_members() << " memberships, "
              << total_product_links() << " product links from database.\n";
    return true;
}

// =====================================================================
//  save_to_db:  multilista in memory → SQL Server (full overwrite)
// =====================================================================

bool save_to_db(const std::string& connection_string) {
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    // Clear existing data (order matters for FK)
    exec_sql(conn.dbc, "DELETE FROM GroupProductLink");
    exec_sql(conn.dbc, "DELETE FROM GroupMembership");
    exec_sql(conn.dbc, "DELETE FROM ResearchGroup");

    // Insert groups
    auto groups = list_groups();
    for (const auto& g : groups) {
        // Use parameterized insert via prepared statement
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);

        std::string sql =
            "SET IDENTITY_INSERT ResearchGroup ON; "
            "INSERT INTO ResearchGroup (id, external_code, name, acronym, description) "
            "VALUES (" + std::to_string(g.id) + ", "
            "'" + g.external_code + "', "
            "'" + g.name + "', "
            "'" + g.acronym + "', "
            "'" + g.description + "'); "
            "SET IDENTITY_INSERT ResearchGroup OFF;";

        exec_sql(conn.dbc, sql);
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);

        // Insert memberships for this group
        auto mems = members_of_group(g.id);
        for (int rid : mems) {
            std::string msql =
                "INSERT INTO GroupMembership (group_id, researcher_id) VALUES ("
                + std::to_string(g.id) + ", " + std::to_string(rid) + ")";
            exec_sql(conn.dbc, msql);
        }

        // Insert product links for this group
        auto prods = products_of_group(g.id);
        for (int pid : prods) {
            std::string psql =
                "INSERT INTO GroupProductLink (group_id, product_id) VALUES ("
                + std::to_string(g.id) + ", " + std::to_string(pid) + ")";
            exec_sql(conn.dbc, psql);
        }
    }

    std::cout << "[DB] Saved " << groups.size() << " groups to database.\n";
    return true;
}

// =====================================================================
//  sync_group_to_db:  sync a single group (upsert)
// =====================================================================

bool sync_group_to_db(const std::string& connection_string, int group_id) {
    auto opt = get_group(group_id);
    if (!opt) return false;

    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    const Group& g = *opt;

    // Upsert group using MERGE
    std::string sql =
        "MERGE ResearchGroup AS target "
        "USING (SELECT " + std::to_string(g.id) + " AS id) AS source "
        "ON target.id = source.id "
        "WHEN MATCHED THEN UPDATE SET "
        "  external_code = '" + g.external_code + "', "
        "  name = '" + g.name + "', "
        "  acronym = '" + g.acronym + "', "
        "  description = '" + g.description + "' "
        "WHEN NOT MATCHED THEN INSERT (external_code, name, acronym, description) "
        "VALUES ('" + g.external_code + "', '" + g.name + "', "
        "'" + g.acronym + "', '" + g.description + "');";
    exec_sql(conn.dbc, sql);

    // Re-sync memberships: delete old, insert current
    exec_sql(conn.dbc, "DELETE FROM GroupMembership WHERE group_id = " + std::to_string(group_id));
    for (int rid : members_of_group(group_id)) {
        exec_sql(conn.dbc, "INSERT INTO GroupMembership (group_id, researcher_id) VALUES ("
                 + std::to_string(group_id) + ", " + std::to_string(rid) + ")");
    }

    // Re-sync product links
    exec_sql(conn.dbc, "DELETE FROM GroupProductLink WHERE group_id = " + std::to_string(group_id));
    for (int pid : products_of_group(group_id)) {
        exec_sql(conn.dbc, "INSERT INTO GroupProductLink (group_id, product_id) VALUES ("
                 + std::to_string(group_id) + ", " + std::to_string(pid) + ")");
    }

    return true;
}

// =====================================================================
//  initialize:  matches spec section 33.3
//    1. Database   → load_from_db
//    2. File       → load_from_file
//    3. Empty      → clear everything
// =====================================================================

bool initialize(InitMode mode, const std::string& source) {
    switch (mode) {
        case InitMode::Database:
            std::cout << "[INIT] Loading from SQL Server...\n";
            return load_from_db(source);

        case InitMode::File:
            std::cout << "[INIT] Loading from JSON file: " << source << "\n";
            return load_from_file(source);

        case InitMode::Empty:
            std::cout << "[INIT] Starting with empty state.\n";
            // Clear all groups (and their linked memberships/products)
            while (true) {
                auto groups = list_groups();
                if (groups.empty()) break;
                delete_group(groups[0].id);
            }
            return true;
    }
    return false;
}

} // namespace peai
