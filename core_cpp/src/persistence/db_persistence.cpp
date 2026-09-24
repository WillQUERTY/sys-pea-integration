// core_cpp/src/persistence/db_persistence.cpp
// SQL Server persistence layer using native ODBC.

#include "persistence/db_persistence.h"
#include "persistence/json_persistence.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"

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
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Researcher' AND xtype='U')
           CREATE TABLE Researcher (
               id INT IDENTITY(1,1) PRIMARY KEY,
               external_code NVARCHAR(50) NOT NULL,
               identification_type NVARCHAR(50) NULL,
               identification_number NVARCHAR(50) NULL,
               first_names NVARCHAR(100) NOT NULL,
               last_names NVARCHAR(100) NOT NULL,
               nationality NVARCHAR(50) NULL,
               country_of_residence NVARCHAR(50) NULL,
               institutional_email NVARCHAR(100) NULL,
               orcid NVARCHAR(50) NULL,
               highest_education_level NVARCHAR(100) NULL,
               status NVARCHAR(50) NULL))",
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Product' AND xtype='U')
           CREATE TABLE Product (
               id INT IDENTITY(1,1) PRIMARY KEY,
               external_code NVARCHAR(50) NOT NULL,
               title NVARCHAR(250) NOT NULL,
               description NVARCHAR(MAX) NULL,
               family_id INT NULL,
               subtype_id INT NULL,
               quality_category_id INT NULL,
               obtained_date NVARCHAR(50) NULL,
               publication_date NVARCHAR(50) NULL,
               validation_status NVARCHAR(50) NULL,
               status NVARCHAR(50) NULL))",
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupMembership' AND xtype='U')
           CREATE TABLE GroupMembership (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL,
               researcher_id INT NOT NULL,
               CONSTRAINT FK_Membership_Group FOREIGN KEY (group_id)
                   REFERENCES ResearchGroup(id) ON DELETE CASCADE,
               CONSTRAINT FK_Membership_Researcher FOREIGN KEY (researcher_id)
                   REFERENCES Researcher(id) ON DELETE CASCADE))",
        R"(IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='GroupProductLink' AND xtype='U')
           CREATE TABLE GroupProductLink (
               id INT IDENTITY(1,1) PRIMARY KEY,
               group_id INT NOT NULL,
               product_id INT NOT NULL,
               CONSTRAINT FK_ProductLink_Group FOREIGN KEY (group_id)
                   REFERENCES ResearchGroup(id) ON DELETE CASCADE,
               CONSTRAINT FK_ProductLink_Product FOREIGN KEY (product_id)
                   REFERENCES Product(id) ON DELETE CASCADE))",
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
    while (!list_researchers().empty()) delete_researcher(list_researchers()[0].id);
    while (!list_products().empty()) delete_product(list_products()[0].id);

    // Load researchers
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, external_code, identification_type, identification_number, first_names, last_names, nationality, country_of_residence, institutional_email, orcid, highest_education_level, status FROM Researcher ORDER BY id",
            SQL_NTS);
            
        SQLINTEGER db_id;
        SQLCHAR ext[64], id_t[64], id_n[64], fname[128], lname[128], nat[64], c_res[64], email[128], orcid[64], edu[128], status[64];
        SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &db_id, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR, ext, sizeof(ext), &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, id_t, sizeof(id_t), &i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR, id_n, sizeof(id_n), &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR, fname, sizeof(fname), &i5);
        SQLBindCol(stmt, 6, SQL_C_CHAR, lname, sizeof(lname), &i6);
        SQLBindCol(stmt, 7, SQL_C_CHAR, nat, sizeof(nat), &i7);
        SQLBindCol(stmt, 8, SQL_C_CHAR, c_res, sizeof(c_res), &i8);
        SQLBindCol(stmt, 9, SQL_C_CHAR, email, sizeof(email), &i9);
        SQLBindCol(stmt, 10, SQL_C_CHAR, orcid, sizeof(orcid), &i10);
        SQLBindCol(stmt, 11, SQL_C_CHAR, edu, sizeof(edu), &i11);
        SQLBindCol(stmt, 12, SQL_C_CHAR, status, sizeof(status), &i12);

        while (SQLFetch(stmt) == SQL_SUCCESS) {
            Researcher r;
            r.external_code = (i2 != SQL_NULL_DATA) ? (char*)ext : "";
            r.identification_type = (i3 != SQL_NULL_DATA) ? (char*)id_t : "";
            r.identification_number = (i4 != SQL_NULL_DATA) ? (char*)id_n : "";
            r.first_names = (i5 != SQL_NULL_DATA) ? (char*)fname : "";
            r.last_names = (i6 != SQL_NULL_DATA) ? (char*)lname : "";
            r.nationality = (i7 != SQL_NULL_DATA) ? (char*)nat : "";
            r.country_of_residence = (i8 != SQL_NULL_DATA) ? (char*)c_res : "";
            r.institutional_email = (i9 != SQL_NULL_DATA) ? (char*)email : "";
            r.orcid = (i10 != SQL_NULL_DATA) ? (char*)orcid : "";
            r.highest_education_level = (i11 != SQL_NULL_DATA) ? (char*)edu : "";
            r.status = (i12 != SQL_NULL_DATA) ? (char*)status : "active";
            create_researcher(r);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load products
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, conn.dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, external_code, title, description, family_id, subtype_id, quality_category_id, obtained_date, publication_date, validation_status, status FROM Product ORDER BY id",
            SQL_NTS);
            
        SQLINTEGER db_id, fam_id, sub_id, qc_id;
        SQLCHAR ext[64], title[256], desc[4096], o_date[64], p_date[64], v_status[64], status[64];
        SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &db_id, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR, ext, sizeof(ext), &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, title, sizeof(title), &i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR, desc, sizeof(desc), &i4);
        SQLBindCol(stmt, 5, SQL_C_SLONG, &fam_id, 0, &i5);
        SQLBindCol(stmt, 6, SQL_C_SLONG, &sub_id, 0, &i6);
        SQLBindCol(stmt, 7, SQL_C_SLONG, &qc_id, 0, &i7);
        SQLBindCol(stmt, 8, SQL_C_CHAR, o_date, sizeof(o_date), &i8);
        SQLBindCol(stmt, 9, SQL_C_CHAR, p_date, sizeof(p_date), &i9);
        SQLBindCol(stmt, 10, SQL_C_CHAR, v_status, sizeof(v_status), &i10);
        SQLBindCol(stmt, 11, SQL_C_CHAR, status, sizeof(status), &i11);

        while (SQLFetch(stmt) == SQL_SUCCESS) {
            Product p;
            p.external_code = (i2 != SQL_NULL_DATA) ? (char*)ext : "";
            p.title = (i3 != SQL_NULL_DATA) ? (char*)title : "";
            p.description = (i4 != SQL_NULL_DATA) ? (char*)desc : "";
            p.family_id = (i5 != SQL_NULL_DATA) ? fam_id : 0;
            p.subtype_id = (i6 != SQL_NULL_DATA) ? sub_id : 0;
            p.quality_category_id = (i7 != SQL_NULL_DATA) ? qc_id : 0;
            p.obtained_date = (i8 != SQL_NULL_DATA) ? (char*)o_date : "";
            p.publication_date = (i9 != SQL_NULL_DATA) ? (char*)p_date : "";
            p.validation_status = (i10 != SQL_NULL_DATA) ? (char*)v_status : "pending";
            p.status = (i11 != SQL_NULL_DATA) ? (char*)status : "active";
            create_product(p);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

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

    std::cout << "[DB] Loaded " << total_groups() << " groups, " << total_researchers() << " researchers, " << total_products() << " products.\n";
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
    exec_sql(conn.dbc, "DELETE FROM Researcher");
    exec_sql(conn.dbc, "DELETE FROM Product");

    // Save Researchers
    for (const auto& r : list_researchers()) {
        std::string sql =
            "SET IDENTITY_INSERT Researcher ON; "
            "INSERT INTO Researcher (id, external_code, identification_type, identification_number, first_names, last_names, nationality, country_of_residence, institutional_email, orcid, highest_education_level, status) VALUES ("
            + std::to_string(r.id) + ", '" + r.external_code + "', '" + r.identification_type + "', '" + r.identification_number + "', '"
            + r.first_names + "', '" + r.last_names + "', '" + r.nationality + "', '" + r.country_of_residence + "', '"
            + r.institutional_email + "', '" + r.orcid + "', '" + r.highest_education_level + "', '" + r.status + "'); "
            "SET IDENTITY_INSERT Researcher OFF;";
        exec_sql(conn.dbc, sql);
    }

    // Save Products
    for (const auto& p : list_products()) {
        std::string sql =
            "SET IDENTITY_INSERT Product ON; "
            "INSERT INTO Product (id, external_code, title, description, family_id, subtype_id, quality_category_id, obtained_date, publication_date, validation_status, status) VALUES ("
            + std::to_string(p.id) + ", '" + p.external_code + "', '" + p.title + "', '" + p.description + "', "
            + std::to_string(p.family_id) + ", " + std::to_string(p.subtype_id) + ", " + std::to_string(p.quality_category_id) + ", '"
            + p.obtained_date + "', '" + p.publication_date + "', '" + p.validation_status + "', '" + p.status + "'); "
            "SET IDENTITY_INSERT Product OFF;";
        exec_sql(conn.dbc, sql);
    }

    // Save Groups & Links
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

    std::cout << "[DB] Saved " << total_groups() << " groups, " << total_researchers() << " researchers, " << total_products() << " products.\n";
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
//  sync_researcher_to_db
// =====================================================================

bool sync_researcher_to_db(const std::string& connection_string, int res_id) {
    auto opt = get_researcher(res_id);
    if (!opt) return false;
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    const Researcher& r = *opt;
    std::string sql =
        "SET IDENTITY_INSERT Researcher ON; "
        "MERGE Researcher AS t USING (SELECT " + std::to_string(r.id) + " AS id) AS s "
        "ON t.id = s.id "
        "WHEN MATCHED THEN UPDATE SET external_code='" + r.external_code + "', identification_type='" + r.identification_type
        + "', identification_number='" + r.identification_number + "', first_names='" + r.first_names + "', last_names='" + r.last_names
        + "', nationality='" + r.nationality + "', country_of_residence='" + r.country_of_residence + "', institutional_email='" + r.institutional_email
        + "', orcid='" + r.orcid + "', highest_education_level='" + r.highest_education_level + "', status='" + r.status + "' "
        "WHEN NOT MATCHED THEN INSERT (id, external_code, identification_type, identification_number, first_names, last_names, nationality, country_of_residence, institutional_email, orcid, highest_education_level, status) VALUES ("
        + std::to_string(r.id) + ", '" + r.external_code + "','" + r.identification_type + "','" + r.identification_number + "','" + r.first_names + "','"
        + r.last_names + "','" + r.nationality + "','" + r.country_of_residence + "','" + r.institutional_email + "','" + r.orcid + "','"
        + r.highest_education_level + "','" + r.status + "'); "
        "SET IDENTITY_INSERT Researcher OFF;";
    return exec_sql(conn.dbc, sql);
}

// =====================================================================
//  sync_product_to_db
// =====================================================================

bool sync_product_to_db(const std::string& connection_string, int prod_id) {
    auto opt = get_product(prod_id);
    if (!opt) return false;
    OdbcConnection conn;
    if (!conn.connect(connection_string)) return false;
    if (!ensure_schema(conn.dbc)) return false;

    const Product& p = *opt;
    std::string sql =
        "SET IDENTITY_INSERT Product ON; "
        "MERGE Product AS t USING (SELECT " + std::to_string(p.id) + " AS id) AS s "
        "ON t.id = s.id "
        "WHEN MATCHED THEN UPDATE SET external_code='" + p.external_code + "', title='" + p.title + "', description='" + p.description
        + "', family_id=" + std::to_string(p.family_id) + ", subtype_id=" + std::to_string(p.subtype_id) + ", quality_category_id=" + std::to_string(p.quality_category_id)
        + ", obtained_date='" + p.obtained_date + "', publication_date='" + p.publication_date + "', validation_status='" + p.validation_status + "', status='" + p.status + "' "
        "WHEN NOT MATCHED THEN INSERT (id, external_code, title, description, family_id, subtype_id, quality_category_id, obtained_date, publication_date, validation_status, status) VALUES ("
        + std::to_string(p.id) + ", '" + p.external_code + "','" + p.title + "','" + p.description + "'," + std::to_string(p.family_id) + ","
        + std::to_string(p.subtype_id) + "," + std::to_string(p.quality_category_id) + ",'" + p.obtained_date + "','" + p.publication_date + "','"
        + p.validation_status + "','" + p.status + "'); "
        "SET IDENTITY_INSERT Product OFF;";
    return exec_sql(conn.dbc, sql);
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
            while (!list_researchers().empty()) delete_researcher(list_researchers()[0].id);
            while (!list_products().empty()) delete_product(list_products()[0].id);
            return true;
    }
    return false;
}

} // namespace peai
