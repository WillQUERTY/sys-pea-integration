// core_cpp/src/persistence/db_persistence.cpp
// SQL Server persistence layer using native ODBC.
// Implements: load_from_db, save_to_db, sync_group_to_db, initialize.

#include "persistence/db_persistence.h"
#include "persistence/json_persistence.h"
#include "services/group_service.h"

#ifdef _WIN32
#include <windows.h>
#endif
#include <sql.h>
#include <sqlext.h>

#include <iostream>
#include <string>
#include <vector>

namespace peai {

// =====================================================================
//  ODBC helpers
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

static bool exec_sql(SQLHDBC dbc, const std::string& sql) {
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLRETURN ret = SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return SQL_SUCCEEDED(ret);
}

// =====================================================================
//  Schema creation
// =====================================================================

static bool ensure_schema(SQLHDBC dbc) {
    const char* ddl[] = {
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='ResearchGroup' AND xtype='U')
           CREATE TABLE ResearchGroup (
               id INT IDENTITY(1,1) PRIMARY KEY,
               external_code NVARCHAR(50) NOT NULL,
               name NVARCHAR(200) NOT NULL,
               acronym NVARCHAR(50) NULL,
               description NVARCHAR(MAX) NULL))",
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMembership' AND xtype='U')
           CREATE TABLE GroupMembership (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL,
               researcher_id INT NOT NULL,
               CONSTRAINT FK_Membership_Group FOREIGN KEY (group_id)
                   REFERENCES ResearchGroup(id) ON DELETE CASCADE))",
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProductLink' AND xtype='U')
           CREATE TABLE GroupProductLink (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL,
               product_id INT NOT NULL,
               CONSTRAINT FK_ProductLink_Group FOREIGN KEY (group_id)
                   REFERENCES ResearchGroup(id) ON DELETE CASCADE))",
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
//  load_from_db
// =====================================================================

bool load_from_db(const std::string& connection_string) {
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    // Clear memory
    while (!list_groups().empty()) delete_group(list_groups()[0].id);

    // Load groups
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, external_code, name, acronym, description FROM ResearchGroup ORDER BY id",
            SQL_NTS);

        SQLINTEGER db_id;
        SQLCHAR ext[64], gname[256], acr[64], desc[4096];
        SQLLEN i1, i2, i3, i4, i5;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &db_id, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR,  ext,   sizeof(ext),  &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR,  gname, sizeof(gname),&i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR,  acr,   sizeof(acr),  &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR,  desc,  sizeof(desc), &i5);

        while (SQLFetch(stmt) == SQL_SUCCESS) {
            Group g;
            g.external_code = (i2 != SQL_NULL_DATA) ? (char*)ext   : "";
            g.name          = (i3 != SQL_NULL_DATA) ? (char*)gname : "";
            g.acronym       = (i4 != SQL_NULL_DATA) ? (char*)acr   : "";
            g.description   = (i5 != SQL_NULL_DATA) ? (char*)desc  : "";
            create_group(g);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load memberships
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)"SELECT group_id, researcher_id FROM GroupMembership", SQL_NTS);
        SQLINTEGER gid, rid; SQLLEN ig, ir;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &ig);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &rid, 0, &ir);
        while (SQLFetch(stmt) == SQL_SUCCESS) add_member_to_group(gid, rid);
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load product links
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)"SELECT group_id, product_id FROM GroupProductLink", SQL_NTS);
        SQLINTEGER gid, pid; SQLLEN ig, ip;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &ig);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &pid, 0, &ip);
        while (SQLFetch(stmt) == SQL_SUCCESS) link_product_to_group(gid, pid);
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::cout << "[DB] Loaded " << total_groups() << " groups.\n";
    return true;
}

// =====================================================================
//  save_to_db
// =====================================================================

bool save_to_db(const std::string& connection_string) {
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    exec_sql(conn.dbc, "DELETE FROM GroupProductLink");
    exec_sql(conn.dbc, "DELETE FROM GroupMembership");
    exec_sql(conn.dbc, "DELETE FROM ResearchGroup");

    for (const auto& g : list_groups()) {
        std::string sql =
            "SET IDENTITY_INSERT ResearchGroup ON; "
            "INSERT INTO ResearchGroup (id, external_code, name, acronym, description) VALUES ("
            + std::to_string(g.id) + ", '" + g.external_code + "', '" + g.name + "', '"
            + g.acronym + "', '" + g.description + "'); "
            "SET IDENTITY_INSERT ResearchGroup OFF;";
        exec_sql(conn.dbc, sql);

        for (int rid : members_of_group(g.id))
            exec_sql(conn.dbc, "INSERT INTO GroupMembership (group_id, researcher_id) VALUES ("
                     + std::to_string(g.id) + "," + std::to_string(rid) + ")");

        for (int pid : products_of_group(g.id))
            exec_sql(conn.dbc, "INSERT INTO GroupProductLink (group_id, product_id) VALUES ("
                     + std::to_string(g.id) + "," + std::to_string(pid) + ")");
    }

    std::cout << "[DB] Saved " << total_groups() << " groups.\n";
    return true;
}

// =====================================================================
//  sync_group_to_db
// =====================================================================

bool sync_group_to_db(const std::string& connection_string, int group_id) {
    auto opt = get_group(group_id);
    if (!opt) return false;
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    const Group& g = *opt;
    std::string sql =
        "MERGE ResearchGroup AS t USING (SELECT " + std::to_string(g.id) + " AS id) AS s "
        "ON t.id = s.id "
        "WHEN MATCHED THEN UPDATE SET external_code='" + g.external_code + "', name='" + g.name
        + "', acronym='" + g.acronym + "', description='" + g.description + "' "
        "WHEN NOT MATCHED THEN INSERT (external_code,name,acronym,description) VALUES ('"
        + g.external_code + "','" + g.name + "','" + g.acronym + "','" + g.description + "');";
    exec_sql(conn.dbc, sql);

    exec_sql(conn.dbc, "DELETE FROM GroupMembership WHERE group_id=" + std::to_string(group_id));
    for (int rid : members_of_group(group_id))
        exec_sql(conn.dbc, "INSERT INTO GroupMembership (group_id,researcher_id) VALUES ("
                 + std::to_string(group_id) + "," + std::to_string(rid) + ")");

    exec_sql(conn.dbc, "DELETE FROM GroupProductLink WHERE group_id=" + std::to_string(group_id));
    for (int pid : products_of_group(group_id))
        exec_sql(conn.dbc, "INSERT INTO GroupProductLink (group_id,product_id) VALUES ("
                 + std::to_string(group_id) + "," + std::to_string(pid) + ")");

    return true;
}

// =====================================================================
//  initialize (spec section 33.3)
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
            while (!list_groups().empty()) delete_group(list_groups()[0].id);
            return true;
    }
    return false;
}

} // namespace peai
