// core_cpp/src/persistence/db_persistence.cpp
// SQL Server persistence layer using native ODBC.
// Supports all 16 tables of PEA-i master specification.

#include "persistence/db_persistence.h"
#include "persistence/json_persistence.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/validation_queue.h"
#include "services/undo_stack.h"

#ifdef _WIN32
#include <windows.h>
#endif
#include <sql.h>
#include <sqlext.h>

#include <cstdio>
#include <iostream>
#include <string>
#include <utility>
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


#ifdef _WIN32
#include <windows.h>
#endif

static std::string cp1252_to_utf8(const char* str) {
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

static std::string utf8_to_cp1252(const std::string& utf8_str) {
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

static OdbcConnection _activeDbConn;
static std::string    _lastConnStr;

static SQLHDBC get_or_create_dbc(const std::string& connection_string) {
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

static std::string escape_sql(const std::string& str) {
    std::string res;
    res.reserve(str.size() + 16);
    for (char c : str) {
        if (c == '\'') res += "''";
        else res += c;
    }
    return res;
}

static bool exec_sql(SQLHDBC dbc, const std::string& sql) {
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

static bool ensure_schema(SQLHDBC dbc) {
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
//  load_from_db
// =====================================================================

bool load_from_db(const std::string& connection_string) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    if (!ensure_schema(dbc)) return false;

    // Load researchers
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, external_code, identification_type, identification_number, first_names, last_names, nationality, country_of_residence, institutional_email, orcid, highest_education_level, education_records, classification_records, status FROM Researcher ORDER BY id",
            SQL_NTS);
            
        SQLINTEGER db_id;
        SQLCHAR ext[64], idt[64], idn[64], fname[128], lname[128], nat[64], c_res[64], email[128], orcid[64], edu[128], edur[4096], clasr[4096], status[64];
        SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12, i13, i14;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &db_id, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR, ext, sizeof(ext), &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, idt, sizeof(idt), &i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR, idn, sizeof(idn), &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR, fname, sizeof(fname), &i5);
        SQLBindCol(stmt, 6, SQL_C_CHAR, lname, sizeof(lname), &i6);
        SQLBindCol(stmt, 7, SQL_C_CHAR, nat, sizeof(nat), &i7);
        SQLBindCol(stmt, 8, SQL_C_CHAR, c_res, sizeof(c_res), &i8);
        SQLBindCol(stmt, 9, SQL_C_CHAR, email, sizeof(email), &i9);
        SQLBindCol(stmt, 10, SQL_C_CHAR, orcid, sizeof(orcid), &i10);
        SQLBindCol(stmt, 11, SQL_C_CHAR, edu, sizeof(edu), &i11);
        SQLBindCol(stmt, 12, SQL_C_CHAR, edur, sizeof(edur), &i12);
        SQLBindCol(stmt, 13, SQL_C_CHAR, clasr, sizeof(clasr), &i13);
        SQLBindCol(stmt, 14, SQL_C_CHAR, status, sizeof(status), &i14);

        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            Researcher r;
            r.id = (i1 != SQL_NULL_DATA) ? db_id : 0;
            r.external_code = (i2 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ext) : "";
            r.identification_type = (i3 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)idt) : "";
            r.identification_number = (i4 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)idn) : "";
            r.first_names = (i5 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)fname) : "";
            r.last_names = (i6 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)lname) : "";
            r.nationality = (i7 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)nat) : "";
            r.country_of_residence = (i8 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)c_res) : "";
            r.institutional_email = (i9 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)email) : "";
            r.orcid = (i10 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)orcid) : "";
            r.highest_education_level = (i11 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)edu) : "";
            r.education_records = (i12 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)edur) : "";
            r.classification_records = (i13 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)clasr) : "";
            r.status = (i14 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)status) : "active";
            create_researcher(r);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load products
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, external_code, title, description, family_id, subtype_id, quality_category_id, obtained_date, publication_date, validation_status, language, country, doi, isbn, issn, url, evidence, specialized_attributes, status FROM Product ORDER BY id",
            SQL_NTS);
            
        SQLINTEGER db_id, fam_id, sub_id, qc_id;
        SQLCHAR ext[64], title[1024], desc[4096], o_date[64], p_date[64], v_status[64], lang[64], ctry[64], doi[128], isbn[64], issn[64], url[512], evid[4096], spec[4096], status[64];
        SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12, i13, i14, i15, i16, i17, i18, i19;
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
        SQLBindCol(stmt, 11, SQL_C_CHAR, lang, sizeof(lang), &i11);
        SQLBindCol(stmt, 12, SQL_C_CHAR, ctry, sizeof(ctry), &i12);
        SQLBindCol(stmt, 13, SQL_C_CHAR, doi, sizeof(doi), &i13);
        SQLBindCol(stmt, 14, SQL_C_CHAR, isbn, sizeof(isbn), &i14);
        SQLBindCol(stmt, 15, SQL_C_CHAR, issn, sizeof(issn), &i15);
        SQLBindCol(stmt, 16, SQL_C_CHAR, url, sizeof(url), &i16);
        SQLBindCol(stmt, 17, SQL_C_CHAR, evid, sizeof(evid), &i17);
        SQLBindCol(stmt, 18, SQL_C_CHAR, spec, sizeof(spec), &i18);
        SQLBindCol(stmt, 19, SQL_C_CHAR, status, sizeof(status), &i19);

        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            Product p;
            p.id = (i1 != SQL_NULL_DATA) ? db_id : 0;
            p.external_code = (i2 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ext) : "";
            p.title = (i3 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)title) : "";
            p.description = (i4 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)desc) : "";
            p.family_id = (i5 != SQL_NULL_DATA) ? fam_id : 0;
            p.subtype_id = (i6 != SQL_NULL_DATA) ? sub_id : 0;
            p.quality_category_id = (i7 != SQL_NULL_DATA) ? qc_id : 0;
            p.obtained_date = (i8 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)o_date) : "";
            p.publication_date = (i9 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)p_date) : "";
            p.validation_status = (i10 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)v_status) : "pending";
            p.language = (i11 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)lang) : "";
            p.country = (i12 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ctry) : "";
            p.doi = (i13 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)doi) : "";
            p.isbn = (i14 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)isbn) : "";
            p.issn = (i15 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)issn) : "";
            p.url = (i16 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)url) : "";
            p.evidence = (i17 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)evid) : "";
            p.specialized_attributes = (i18 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)spec) : "";
            p.status = (i19 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)status) : "active";
            create_product(p);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load groups
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, external_code, name, acronym, institution, classification, description, mission, vision, declared_creation_date, knowledge_area, knowledge_subarea, city, department, website, email, leader_id, status FROM ResearchGroup ORDER BY id",
            SQL_NTS);

        SQLINTEGER db_id, leader_id;
        SQLCHAR ext[64], gname[512], acr[128], inst[512], clas[512], desc[4096], miss[4096], vis[4096], cdate[64], karea[128], ksub[128], city[128], dep[128], web[256], email[128], status[64];
        SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9, i10, i11, i12, i13, i14, i15, i16, i17, i18;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &db_id, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR,  ext,   sizeof(ext),  &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR,  gname, sizeof(gname),&i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR,  acr,   sizeof(acr),  &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR,  inst,  sizeof(inst), &i5);
        SQLBindCol(stmt, 6, SQL_C_CHAR,  clas,  sizeof(clas), &i6);
        SQLBindCol(stmt, 7, SQL_C_CHAR,  desc,  sizeof(desc), &i7);
        SQLBindCol(stmt, 8, SQL_C_CHAR,  miss,  sizeof(miss), &i8);
        SQLBindCol(stmt, 9, SQL_C_CHAR,  vis,   sizeof(vis),  &i9);
        SQLBindCol(stmt, 10, SQL_C_CHAR, cdate, sizeof(cdate),&i10);
        SQLBindCol(stmt, 11, SQL_C_CHAR, karea, sizeof(karea),&i11);
        SQLBindCol(stmt, 12, SQL_C_CHAR, ksub,  sizeof(ksub), &i12);
        SQLBindCol(stmt, 13, SQL_C_CHAR, city,  sizeof(city), &i13);
        SQLBindCol(stmt, 14, SQL_C_CHAR, dep,   sizeof(dep),  &i14);
        SQLBindCol(stmt, 15, SQL_C_CHAR, web,   sizeof(web),  &i15);
        SQLBindCol(stmt, 16, SQL_C_CHAR, email, sizeof(email),&i16);
        SQLBindCol(stmt, 17, SQL_C_SLONG,&leader_id, 0,       &i17);
        SQLBindCol(stmt, 18, SQL_C_CHAR, status,sizeof(status),&i18);

        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            Group g;
            g.id = (i1 != SQL_NULL_DATA) ? db_id : 0;
            g.external_code = (i2 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ext  ) : "";
            g.name          = (i3 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)gname) : "";
            g.acronym       = (i4 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)acr  ) : "";
            g.institution   = (i5 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)inst ) : "";
            g.classification= (i6 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)clas ) : "";
            g.description   = (i7 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)desc ) : "";
            g.mission       = (i8 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)miss ) : "";
            g.vision        = (i9 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)vis  ) : "";
            g.declared_creation_date = (i10 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)cdate) : "";
            g.knowledge_area = (i11 != SQL_NULL_DATA) ? (char*)karea: "";
            g.knowledge_subarea = (i12 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ksub) : "";
            g.city          = (i13 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)city) : "";
            g.department    = (i14 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)dep ) : "";
            g.website       = (i15 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)web ) : "";
            g.email         = (i16 != SQL_NULL_DATA) ? (char*)email: "";
            g.leader_id     = (i17 != SQL_NULL_DATA) ? leader_id   : 0;
            g.status        = (i18 != SQL_NULL_DATA) ? (char*)status: "active";
            create_group(g);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load group memberships
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT group_id, researcher_id FROM GroupMembership",
            SQL_NTS);
        SQLINTEGER gid, rid;
        SQLLEN i1, i2;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &rid, 0, &i2);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            add_member_to_group(gid, rid);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // Load group product links
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT group_id, product_id FROM GroupProductLink",
            SQL_NTS);
        SQLINTEGER gid, pid;
        SQLLEN i1, i2;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &pid, 0, &i2);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            link_product_to_group(gid, pid);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    
    std::cout << "[DB] Reconstructed " << list_groups().size() << " groups, "
              << list_researchers().size() << " researchers, "
              << list_products().size() << " products, "
              << total_members() << " memberships, "
              << total_product_links() << " product links from SQL Server.\n";
    return true;
}

// =====================================================================
//  sync_xxx_to_db (Write-Through Implementation)
// =====================================================================

// El id RAM de una entidad creada por API NO coincide necesariamente con el
// id IDENTITY que le asigna SQL Server al insertarla via MERGE. Toda funcion
// *_db debe resolver el id de BD por external_code (que siempre existe: los
// servicios de creacion lo auto-generan si viene vacio). Fallback al id crudo
// solo si no hay external_code (entidad aun no sincronizable).
static std::string db_id_expr(const char* table, const std::string& ext, int ram_id) {
    if (ext.empty()) return std::to_string(ram_id);
    return "(SELECT id FROM " + std::string(table) + " WHERE external_code = '" +
           escape_sql(utf8_to_cp1252(ext)) + "')";
}

static std::string group_db_id(int ram_id) {
    auto o = get_group(ram_id);
    return db_id_expr("ResearchGroup", o ? o->external_code : "", ram_id);
}
static std::string researcher_db_id(int ram_id) {
    auto o = get_researcher(ram_id);
    return db_id_expr("Researcher", o ? o->external_code : "", ram_id);
}
static std::string product_db_id(int ram_id) {
    auto o = get_product(ram_id);
    return db_id_expr("Product", o ? o->external_code : "", ram_id);
}

// Emite NULL para ids de catalogo sin asignar (0 violaria el FK)
static std::string nullable_int(int v) {
    return v > 0 ? std::to_string(v) : "NULL";
}
// Emite NULL para fechas vacias ('' se convertiria a 1900-01-01)
static std::string nullable_date(const std::string& s) {
    return s.empty() ? "NULL" : "'" + escape_sql(utf8_to_cp1252(s)) + "'";
}

bool sync_group_to_db(const std::string& connection_string, int group_id) {
    std::optional<Group> g_opt = get_group(group_id);
    if (!g_opt) return false;
    Group g = g_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE ResearchGroup AS target "
        "USING (SELECT '" + escape_sql(utf8_to_cp1252(g.external_code)) + "' AS ext, '" + escape_sql(utf8_to_cp1252(g.name)) + "' AS name, '" + escape_sql(utf8_to_cp1252(g.acronym)) + "' AS acr, '" + escape_sql(utf8_to_cp1252(g.institution)) + "' AS inst, '" + escape_sql(utf8_to_cp1252(g.classification)) + "' AS clas, '" + escape_sql(utf8_to_cp1252(g.description)) + "' AS descr, '" + escape_sql(utf8_to_cp1252(g.mission)) + "' AS miss, '" + escape_sql(utf8_to_cp1252(g.vision)) + "' AS vis, '" + escape_sql(utf8_to_cp1252(g.declared_creation_date)) + "' AS cdate, '" + escape_sql(utf8_to_cp1252(g.knowledge_area)) + "' AS karea, '" + escape_sql(utf8_to_cp1252(g.knowledge_subarea)) + "' AS ksub, '" + escape_sql(utf8_to_cp1252(g.city)) + "' AS city, '" + escape_sql(utf8_to_cp1252(g.department)) + "' AS dep, '" + escape_sql(utf8_to_cp1252(g.website)) + "' AS web, '" + escape_sql(utf8_to_cp1252(g.email)) + "' AS email, " + nullable_int(g.leader_id) + " AS lid, '" + escape_sql(utf8_to_cp1252(g.status)) + "' AS sts) AS source "
        "ON (target.external_code = source.ext) "
        "WHEN MATCHED THEN "
        "  UPDATE SET name = source.name, acronym = source.acr, institution = source.inst, classification = source.clas, description = source.descr, mission = source.miss, vision = source.vis, declared_creation_date = source.cdate, knowledge_area = source.karea, knowledge_subarea = source.ksub, city = source.city, department = source.dep, website = source.web, email = source.email, leader_id = source.lid, status = source.sts, updated_at = GETDATE() "
        "WHEN NOT MATCHED THEN "
        "  INSERT (external_code, name, acronym, institution, classification, description, mission, vision, declared_creation_date, knowledge_area, knowledge_subarea, city, department, website, email, leader_id, status) VALUES (source.ext, source.name, source.acr, source.inst, source.clas, source.descr, source.miss, source.vis, source.cdate, source.karea, source.ksub, source.city, source.dep, source.web, source.email, source.lid, source.sts);";
    
    return exec_sql(dbc, sql);
}

bool sync_researcher_to_db(const std::string& connection_string, int res_id) {
    std::optional<Researcher> r_opt = get_researcher(res_id);
    if (!r_opt) return false;
    Researcher r = r_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE Researcher AS target "
        "USING (SELECT '" + escape_sql(utf8_to_cp1252(r.external_code)) + "' AS ext, '" + escape_sql(utf8_to_cp1252(r.identification_type)) + "' AS idt, '" + escape_sql(utf8_to_cp1252(r.identification_number)) + "' AS idn, '" + escape_sql(utf8_to_cp1252(r.first_names)) + "' AS fname, '" + escape_sql(utf8_to_cp1252(r.last_names)) + "' AS lname, '" + escape_sql(utf8_to_cp1252(r.nationality)) + "' AS nat, '" + escape_sql(utf8_to_cp1252(r.country_of_residence)) + "' AS cres, '" + escape_sql(utf8_to_cp1252(r.institutional_email)) + "' AS email, '" + escape_sql(utf8_to_cp1252(r.orcid)) + "' AS orcid, '" + escape_sql(utf8_to_cp1252(r.highest_education_level)) + "' AS edu, '" + escape_sql(utf8_to_cp1252(r.education_records)) + "' AS edur, '" + escape_sql(utf8_to_cp1252(r.classification_records)) + "' AS clasr, '" + escape_sql(utf8_to_cp1252(r.status)) + "' AS sts) AS source "
        "ON (target.external_code = source.ext) "
        "WHEN MATCHED THEN "
        "  UPDATE SET identification_type = source.idt, identification_number = source.idn, first_names = source.fname, last_names = source.lname, nationality = source.nat, country_of_residence = source.cres, institutional_email = source.email, orcid = source.orcid, highest_education_level = source.edu, education_records = source.edur, classification_records = source.clasr, status = source.sts, updated_at = GETDATE() "
        "WHEN NOT MATCHED THEN "
        "  INSERT (external_code, identification_type, identification_number, first_names, last_names, nationality, country_of_residence, institutional_email, orcid, highest_education_level, education_records, classification_records, status) VALUES (source.ext, source.idt, source.idn, source.fname, source.lname, source.nat, source.cres, source.email, source.orcid, source.edu, source.edur, source.clasr, source.sts);";
    
    return exec_sql(dbc, sql);
}

bool sync_product_to_db(const std::string& connection_string, int prod_id) {
    std::optional<Product> p_opt = get_product(prod_id);
    if (!p_opt) return false;
    Product p = p_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE Product AS target "
        "USING (SELECT '" + escape_sql(utf8_to_cp1252(p.external_code)) + "' AS ext, '" + escape_sql(utf8_to_cp1252(p.title)) + "' AS title, '" + escape_sql(utf8_to_cp1252(p.description)) + "' AS descr, " + nullable_int(p.family_id) + " AS fam, " + nullable_int(p.subtype_id) + " AS sub, " + nullable_int(p.quality_category_id) + " AS qc, " + nullable_date(p.obtained_date) + " AS odate, " + nullable_date(p.publication_date) + " AS pdate, '" + escape_sql(utf8_to_cp1252(p.validation_status)) + "' AS vsts, '" + escape_sql(utf8_to_cp1252(p.language)) + "' AS lang, '" + escape_sql(utf8_to_cp1252(p.country)) + "' AS ctry, '" + escape_sql(utf8_to_cp1252(p.doi)) + "' AS doi, '" + escape_sql(utf8_to_cp1252(p.isbn)) + "' AS isbn, '" + escape_sql(utf8_to_cp1252(p.issn)) + "' AS issn, '" + escape_sql(utf8_to_cp1252(p.url)) + "' AS url, '" + escape_sql(utf8_to_cp1252(p.evidence)) + "' AS evid, '" + escape_sql(utf8_to_cp1252(p.specialized_attributes)) + "' AS spec, '" + escape_sql(utf8_to_cp1252(p.status)) + "' AS sts, " + std::to_string(p.year) + " AS yr) AS source "
        "ON (target.external_code = source.ext) "
        "WHEN MATCHED THEN "
        "  UPDATE SET title = source.title, description = source.descr, family_id = source.fam, subtype_id = source.sub, quality_category_id = source.qc, obtained_date = source.odate, publication_date = source.pdate, validation_status = source.vsts, language = source.lang, country = source.ctry, doi = source.doi, isbn = source.isbn, issn = source.issn, url = source.url, evidence = source.evid, specialized_attributes = source.spec, status = source.sts, year = source.yr, updated_at = GETDATE() "
        "WHEN NOT MATCHED THEN "
        "  INSERT (external_code, title, description, family_id, subtype_id, quality_category_id, obtained_date, publication_date, validation_status, language, country, doi, isbn, issn, url, evidence, specialized_attributes, status, year) VALUES (source.ext, source.title, source.descr, source.fam, source.sub, source.qc, source.odate, source.pdate, source.vsts, source.lang, source.ctry, source.doi, source.isbn, source.issn, source.url, source.evid, source.spec, source.sts, source.yr);";
    
    return exec_sql(dbc, sql);
}

bool sync_membership_details_to_db(const std::string& connection_string, int group_id, int researcher_id, const std::string& role, const std::string& start_date, const std::string& end_date) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    auto g_opt = get_group(group_id);
    auto r_opt = get_researcher(researcher_id);
    std::string g_ext = g_opt ? escape_sql(utf8_to_cp1252(g_opt->external_code)) : "";
    std::string r_ext = r_opt ? escape_sql(utf8_to_cp1252(r_opt->external_code)) : "";

    std::string g_clause = g_ext.empty() ? ("g.id = " + std::to_string(group_id)) : ("g.external_code = '" + g_ext + "'");
    std::string r_clause = r_ext.empty() ? ("r.id = " + std::to_string(researcher_id)) : ("r.external_code = '" + r_ext + "'");

    std::string sql = 
        "IF EXISTS (SELECT 1 FROM GroupMembership m, ResearchGroup g, Researcher r WHERE m.group_id = g.id AND m.researcher_id = r.id AND " + g_clause + " AND " + r_clause + ") "
        "  UPDATE m SET role = '" + escape_sql(utf8_to_cp1252(role)) + "', start_date = '" + escape_sql(utf8_to_cp1252(start_date)) + "', end_date = '" + escape_sql(utf8_to_cp1252(end_date)) + "' "
        "  FROM GroupMembership m, ResearchGroup g, Researcher r "
        "  WHERE m.group_id = g.id AND m.researcher_id = r.id AND " + g_clause + " AND " + r_clause + " "
        "ELSE "
        "  INSERT INTO GroupMembership (group_id, researcher_id, role, start_date, end_date, status) "
        "  SELECT g.id, r.id, '" + escape_sql(utf8_to_cp1252(role)) + "', '" + escape_sql(utf8_to_cp1252(start_date)) + "', '" + escape_sql(utf8_to_cp1252(end_date)) + "', 'active' "
        "  FROM ResearchGroup g, Researcher r "
        "  WHERE (" + g_clause + ") AND (" + r_clause + ");";
    return exec_sql(dbc, sql);
}

bool sync_membership_to_db(const std::string& connection_string, int group_id, int researcher_id) {
    return sync_membership_details_to_db(connection_string, group_id, researcher_id, "Investigador", "", "");
}

bool sync_product_link_to_db(const std::string& connection_string, int group_id, int product_id) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    auto g_opt = get_group(group_id);
    auto p_opt = get_product(product_id);
    std::string g_ext = g_opt ? escape_sql(utf8_to_cp1252(g_opt->external_code)) : "";
    std::string p_ext = p_opt ? escape_sql(utf8_to_cp1252(p_opt->external_code)) : "";

    std::string g_clause = g_ext.empty() ? ("g.id = " + std::to_string(group_id)) : ("g.external_code = '" + g_ext + "'");
    std::string p_clause = p_ext.empty() ? ("p.id = " + std::to_string(product_id)) : ("p.external_code = '" + p_ext + "'");

    std::string sql = 
        "INSERT INTO GroupProductLink (group_id, product_id) "
        "SELECT g.id, p.id "
        "FROM ResearchGroup g, Product p "
        "WHERE (" + g_clause + ") "
        "  AND (" + p_clause + ") "
        "  AND NOT EXISTS (SELECT 1 FROM GroupProductLink l WHERE l.group_id = g.id AND l.product_id = p.id);";
    return exec_sql(dbc, sql);
}

bool sync_product_author_to_db(const std::string& connection_string, int product_id, int researcher_id, int author_order) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    auto p_opt = get_product(product_id);
    auto r_opt = get_researcher(researcher_id);
    std::string p_ext = p_opt ? escape_sql(utf8_to_cp1252(p_opt->external_code)) : "";
    std::string r_ext = r_opt ? escape_sql(utf8_to_cp1252(r_opt->external_code)) : "";

    std::string p_clause = p_ext.empty() ? ("p.id = " + std::to_string(product_id)) : ("p.external_code = '" + p_ext + "'");
    std::string r_clause = r_ext.empty() ? ("r.id = " + std::to_string(researcher_id)) : ("r.external_code = '" + r_ext + "'");

    std::string sql = 
        "INSERT INTO ProductAuthor (product_id, researcher_id, author_order) "
        "SELECT p.id, r.id, " + std::to_string(author_order) + " "
        "FROM Product p, Researcher r "
        "WHERE (" + p_clause + ") "
        "  AND (" + r_clause + ") "
        "  AND NOT EXISTS (SELECT 1 FROM ProductAuthor a WHERE a.product_id = p.id AND a.researcher_id = r.id);";
    return exec_sql(dbc, sql);
}



bool save_to_db(const std::string& connection_string) {
    bool ok = true;
    for (const auto& g : list_groups()) {
        ok &= sync_group_to_db(connection_string, g.id);
        for (int rid : members_of_group(g.id)) {
            ok &= sync_membership_to_db(connection_string, g.id, rid);
        }
        for (int pid : products_of_group(g.id)) {
            ok &= sync_product_link_to_db(connection_string, g.id, pid);
        }
    }
    for (const auto& r : list_researchers()) ok &= sync_researcher_to_db(connection_string, r.id);
    for (const auto& p : list_products()) ok &= sync_product_to_db(connection_string, p.id);
    return ok;
}

bool initialize(InitMode mode, const std::string& source) {
    if (mode == InitMode::Database) return load_from_db(source);
    if (mode == InitMode::File) return load_from_file(source);
    // InitMode::Empty
    while (!list_groups().empty()) delete_group(list_groups()[0].id);
    while (!list_researchers().empty()) delete_researcher(list_researchers()[0].id);
    while (!list_products().empty()) delete_product(list_products()[0].id);
    vq_clear();
    undo_clear();
    return true;
}


// =====================================================================
//  OPTION A: SQL Refactor to C++
// =====================================================================

static std::string json_escape(const std::string& s) {
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

// Runs a "SELECT <label>, COUNT(*) ... GROUP BY <label>" query and returns
// the rows as (label, count) pairs.
static std::vector<std::pair<std::string, int>> query_group_counts(SQLHDBC dbc, const std::string& sql) {
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

std::string get_dashboard_stats_json(const std::string& connection_string) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return "{}";

    int total_groups = 0, total_researchers = 0, total_products = 0;
    SQLHSTMT stmt;

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT COUNT(*) FROM ResearchGroup WHERE status != 'inactive'", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) { SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &total_groups, 0, &ind); }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT COUNT(*) FROM Researcher WHERE status != 'inactive'", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) { SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &total_researchers, 0, &ind); }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)"SELECT COUNT(*) FROM Product WHERE status != 'inactive'", SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) { SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &total_products, 0, &ind); }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    std::string json = "{\"total_groups\":" + std::to_string(total_groups) +
           ",\"total_researchers\":" + std::to_string(total_researchers) +
           ",\"total_products\":" + std::to_string(total_products);

    // Productos por estado de validacion
    json += ",\"validation\":{";
    bool first = true;
    for (auto& row : query_group_counts(dbc,
            "SELECT ISNULL(validation_status, 'pending'), COUNT(*) FROM Product WHERE status != 'inactive' GROUP BY ISNULL(validation_status, 'pending')")) {
        if (!first) json += ",";
        json += "\"" + json_escape(row.first) + "\":" + std::to_string(row.second);
        first = false;
    }
    json += "}";

    // Productos por anio (publication_date con fallback a obtained_date)
    json += ",\"by_year\":[";
    first = true;
    for (auto& row : query_group_counts(dbc,
            "SELECT ISNULL(YEAR(publication_date), YEAR(obtained_date)), COUNT(*) FROM Product WHERE status != 'inactive' GROUP BY ISNULL(YEAR(publication_date), YEAR(obtained_date)) ORDER BY 1")) {
        if (row.first.empty()) continue;
        if (!first) json += ",";
        json += "{\"year\":\"" + json_escape(row.first) + "\",\"count\":" + std::to_string(row.second) + "}";
        first = false;
    }
    json += "]";

    // Grupos por clasificacion
    json += ",\"groups_by_classification\":{";
    first = true;
    for (auto& row : query_group_counts(dbc,
            "SELECT ISNULL(NULLIF(LTRIM(RTRIM(classification)), ''), 'Sin clasificar'), COUNT(*) FROM ResearchGroup WHERE status != 'inactive' GROUP BY ISNULL(NULLIF(LTRIM(RTRIM(classification)), ''), 'Sin clasificar')")) {
        if (!first) json += ",";
        json += "\"" + json_escape(row.first) + "\":" + std::to_string(row.second);
        first = false;
    }
    json += "}}";

    return json;
}

int link_project_to_group_db(const std::string& conn, int group_id, const Project& p) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return 0;
    
    int project_id = 0;
    std::string sql = "SELECT id FROM Project WHERE title = '" + escape_sql(p.title) + "'";
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &project_id, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (project_id == 0) {
        std::string ins = "INSERT INTO Project (title, summary, start_date, end_date, status, project_type, funding_type, budget, principal_investigator_id) OUTPUT INSERTED.id VALUES ('" + escape_sql(p.title) + "', '" + escape_sql(p.summary) + "', '" + escape_sql(p.start_date) + "', '" + escape_sql(p.end_date) + "', '" + escape_sql(p.status) + "', '" + escape_sql(p.project_type) + "', '" + escape_sql(p.funding_type) + "', " + std::to_string(p.budget) + ", " + std::to_string(p.principal_investigator_id) + ")";
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)ins.c_str(), SQL_NTS);
        if (SQLFetch(stmt) == SQL_SUCCESS) {
            SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &project_id, 0, &ind);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::string gid = group_db_id(group_id);
    std::string link_chk = "SELECT 1 FROM GroupProject WHERE group_id=" + gid + " AND project_id=" + std::to_string(project_id);
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    bool exists = false;
    SQLExecDirect(stmt, (SQLCHAR*)link_chk.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) exists = true;
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (!exists) {
        std::string link_ins = "INSERT INTO GroupProject (group_id, project_id) VALUES (" + gid + ", " + std::to_string(project_id) + ")";
        exec_sql(dbc, link_ins);
    }
    return project_id;
}

bool unlink_project_from_group_db(const std::string& conn, int group_id, int project_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc, "DELETE FROM GroupProject WHERE group_id=" + group_db_id(group_id) + " AND project_id=" + std::to_string(project_id));
}

int link_research_line_to_group_db(const std::string& conn, int group_id, const std::string& name) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return 0;
    
    int line_id = 0;
    std::string sql = "SELECT id FROM ResearchLine WHERE name = '" + escape_sql(name) + "'";
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) {
        SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &line_id, 0, &ind);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (line_id == 0) {
        std::string ins = "INSERT INTO ResearchLine (name) OUTPUT INSERTED.id VALUES ('" + escape_sql(name) + "')";
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)ins.c_str(), SQL_NTS);
        if (SQLFetch(stmt) == SQL_SUCCESS) {
            SQLLEN ind; SQLGetData(stmt, 1, SQL_C_LONG, &line_id, 0, &ind);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::string gid = group_db_id(group_id);
    std::string link_chk = "SELECT 1 FROM GroupResearchLine WHERE group_id=" + gid + " AND line_id=" + std::to_string(line_id);
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    bool exists = false;
    SQLExecDirect(stmt, (SQLCHAR*)link_chk.c_str(), SQL_NTS);
    if (SQLFetch(stmt) == SQL_SUCCESS) exists = true;
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);

    if (!exists) {
        std::string link_ins = "INSERT INTO GroupResearchLine (group_id, line_id) VALUES (" + gid + ", " + std::to_string(line_id) + ")";
        exec_sql(dbc, link_ins);
    }
    return line_id;
}

bool unlink_research_line_from_group_db(const std::string& conn, int group_id, const std::string& name) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc, "DELETE grl FROM GroupResearchLine grl JOIN ResearchLine rl ON grl.line_id = rl.id WHERE grl.group_id=" + group_db_id(group_id) + " AND rl.name='" + escape_sql(utf8_to_cp1252(name)) + "'");
}


std::vector<Project> get_group_projects_db(const std::string& conn, int group_id) {
    std::vector<Project> res;
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return res;
    
    std::string sql = "SELECT p.id, p.title, p.summary, p.start_date, p.end_date, p.status, p.project_type, p.funding_type, p.budget, p.principal_investigator_id FROM Project p JOIN GroupProject gp ON p.id = gp.project_id WHERE gp.group_id=" + group_db_id(group_id);
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        Project p;
        SQLLEN ind;
        char buf[1024];
        
        SQLGetData(stmt, 1, SQL_C_LONG, &p.id, 0, &ind);
        
        SQLGetData(stmt, 2, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.title = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 3, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.summary = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 4, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.start_date = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 5, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.end_date = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 6, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.status = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 7, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.project_type = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 8, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) p.funding_type = cp1252_to_utf8(buf);
        
        SQLGetData(stmt, 9, SQL_C_DOUBLE, &p.budget, 0, &ind);
        SQLGetData(stmt, 10, SQL_C_LONG, &p.principal_investigator_id, 0, &ind);
        
        res.push_back(p);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return res;
}

std::vector<std::string> get_group_research_lines_db(const std::string& conn, int group_id) {
    std::vector<std::string> res;
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return res;
    
    std::string sql = "SELECT rl.name FROM ResearchLine rl JOIN GroupResearchLine grl ON rl.id = grl.line_id WHERE grl.group_id=" + group_db_id(group_id);
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        char buf[1024]; SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_CHAR, buf, sizeof(buf), &ind);
        if (ind != SQL_NULL_DATA) res.push_back(cp1252_to_utf8(buf));
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return res;
}

// =====================================================================
//  Architectural consolidation: the core owns ALL SQL
//  (previously scattered as pyodbc calls in backend/app/repository.py)
// =====================================================================

static bool delete_entity_from_db(const std::string& conn, const std::string& id_expr, const char* table, bool hard) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string sql = hard
        ? "DELETE FROM " + std::string(table) + " WHERE id = " + id_expr + ";"
        : "UPDATE " + std::string(table) + " SET status = 'inactive', updated_at = GETDATE() WHERE id = " + id_expr + ";";
    return exec_sql(dbc, sql);
}

bool delete_group_from_db(const std::string& conn, int group_id, bool hard) {
    return delete_entity_from_db(conn, group_db_id(group_id), "ResearchGroup", hard);
}

bool delete_researcher_from_db(const std::string& conn, int res_id, bool hard) {
    return delete_entity_from_db(conn, researcher_db_id(res_id), "Researcher", hard);
}

bool delete_product_from_db(const std::string& conn, int prod_id, bool hard) {
    return delete_entity_from_db(conn, product_db_id(prod_id), "Product", hard);
}

bool delete_membership_from_db(const std::string& conn, int group_id, int researcher_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc,
        "DELETE FROM GroupMembership WHERE group_id = " + group_db_id(group_id) +
        " AND researcher_id = " + researcher_db_id(researcher_id) + ";");
}

bool delete_product_link_from_db(const std::string& conn, int group_id, int product_id) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc,
        "DELETE FROM GroupProductLink WHERE group_id = " + group_db_id(group_id) +
        " AND product_id = " + product_db_id(product_id) + ";");
}

bool insert_audit_log_db(const std::string& conn, const std::string& entity_type, int entity_id,
                         const std::string& action, const std::string& changed_by, const std::string& details) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    return exec_sql(dbc,
        "INSERT INTO AuditLog (entity_type, entity_id, action, changed_by, change_details) VALUES ('" +
        escape_sql(utf8_to_cp1252(entity_type)) + "', " + std::to_string(entity_id) + ", '" +
        escape_sql(utf8_to_cp1252(action)) + "', '" + escape_sql(utf8_to_cp1252(changed_by)) + "', '" +
        escape_sql(utf8_to_cp1252(details)) + "');");
}

bool set_product_validation_db(const std::string& conn, int product_id, const std::string& validation_status,
                               int quality_category_id, const std::string& reason) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;

    // Operacion compuesta: las 4 escrituras van en una sola transaccion ODBC
    // para preservar la atomicidad que tenia el bloque pyodbc original.
    SQLSetConnectAttr(dbc, SQL_ATTR_AUTOCOMMIT, (SQLPOINTER)SQL_AUTOCOMMIT_OFF, 0);

    std::string qc = nullable_int(quality_category_id);
    std::string pid = product_db_id(product_id);
    std::string gpl_status = validation_status == "valid" ? "approved"
                           : validation_status == "rejected" ? "rejected" : "pending_validation";

    bool ok = true;
    ok &= exec_sql(dbc,
        "UPDATE Product SET validation_status = '" + escape_sql(utf8_to_cp1252(validation_status)) +
        "', quality_category_id = COALESCE(" + qc + ", quality_category_id), updated_at = GETDATE() " +
        "WHERE id = " + pid + ";");

    ok &= exec_sql(dbc,
        "UPDATE GroupProductLink SET status = '" + gpl_status + "', validation_reason = '" +
        escape_sql(utf8_to_cp1252(reason)) + "', authorized_at = CASE WHEN '" + gpl_status +
        "' IN ('approved', 'rejected') THEN GETDATE() ELSE NULL END " +
        "WHERE product_id = " + pid + ";");

    ok &= exec_sql(dbc,
        "UPDATE ValidationQueueItem SET status = 'processed', result = '" +
        escape_sql(utf8_to_cp1252(validation_status)) + "', processed_at = GETDATE() " +
        "WHERE product_id = " + pid + " AND status = 'pending';");

    ok &= insert_audit_log_db(conn, "Product", product_id, "VALIDATE_PRODUCT", "api_user",
        "Validación cambiada a " + validation_status + " (" + reason + ")");

    SQLEndTran(SQL_HANDLE_DBC, dbc, ok ? SQL_COMMIT : SQL_ROLLBACK);
    SQLSetConnectAttr(dbc, SQL_ATTR_AUTOCOMMIT, (SQLPOINTER)SQL_AUTOCOMMIT_ON, 0);
    return ok;
}

bool insert_import_record_db(const std::string& conn, int job_id, const std::string& entity_type,
                             const std::string& external_identifier, const std::string& action_taken,
                             const std::string& summary, const std::string& details) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string trimmed_summary = summary.substr(0, 500);
    return exec_sql(dbc,
        "INSERT INTO ImportRecord (job_id, entity_type, external_identifier, action_taken, source_data_summary, resolution_details, created_at) VALUES (" +
        std::to_string(job_id) + ", '" + escape_sql(utf8_to_cp1252(entity_type)) + "', '" +
        escape_sql(utf8_to_cp1252(external_identifier)) + "', '" + escape_sql(utf8_to_cp1252(action_taken)) + "', '" +
        escape_sql(utf8_to_cp1252(trimmed_summary)) + "', '" + escape_sql(utf8_to_cp1252(details)) + "', GETDATE());");
}

bool upsert_product_group_link_db(const std::string& conn, int group_id, int product_id,
                                  const std::string& status, const std::string& source, const std::string& reason) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string gid = group_db_id(group_id);
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "IF EXISTS (SELECT 1 FROM GroupProductLink WHERE group_id = " + gid +
        " AND product_id = " + pid + ") "
        "BEGIN "
        "  UPDATE GroupProductLink SET status = '" + escape_sql(utf8_to_cp1252(status)) +
        "', source = '" + escape_sql(utf8_to_cp1252(source)) + "', validation_reason = '" +
        escape_sql(utf8_to_cp1252(reason)) + "' "
        "  WHERE group_id = " + gid + " AND product_id = " + pid +
        " AND (source = 'system' OR source IS NULL); "
        "END "
        "ELSE "
        "BEGIN "
        "  INSERT INTO GroupProductLink (group_id, product_id, status, source, requested_at, validation_reason) VALUES (" +
        gid + ", " + pid + ", '" + escape_sql(utf8_to_cp1252(status)) +
        "', '" + escape_sql(utf8_to_cp1252(source)) + "', GETDATE(), '" + escape_sql(utf8_to_cp1252(reason)) + "'); "
        "END");
}

bool insert_external_product_author_db(const std::string& conn, int product_id, int author_order,
                                       const std::string& name, const std::string& identifier, const std::string& match_status) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "IF NOT EXISTS (SELECT 1 FROM ProductAuthor WHERE product_id = " + pid +
        " AND external_author_name = '" + escape_sql(utf8_to_cp1252(name)) + "') "
        "BEGIN "
        "  INSERT INTO ProductAuthor (product_id, researcher_id, author_order, external_author_name, external_author_identifier, match_status) VALUES (" +
        pid + ", NULL, " + std::to_string(author_order) + ", '" +
        escape_sql(utf8_to_cp1252(name)) + "', '" + escape_sql(utf8_to_cp1252(identifier)) + "', '" +
        escape_sql(utf8_to_cp1252(match_status)) + "'); "
        "END");
}

std::vector<int> products_of_researcher_db(const std::string& conn, int researcher_id) {
    std::vector<int> res;
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return res;

    std::string sql = "SELECT product_id FROM ProductAuthor WHERE researcher_id = " + researcher_db_id(researcher_id);
    SQLHSTMT stmt;
    SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
    SQLExecDirect(stmt, (SQLCHAR*)sql.c_str(), SQL_NTS);
    while (SQLFetch(stmt) == SQL_SUCCESS) {
        int pid = 0; SQLLEN ind;
        SQLGetData(stmt, 1, SQL_C_LONG, &pid, 0, &ind);
        if (ind != SQL_NULL_DATA) res.push_back(pid);
    }
    SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    return res;
}

bool vq_enqueue_db(const std::string& conn, int product_id, const std::string& assigned_to) {
    SQLHDBC dbc = get_or_create_dbc(conn);
    if (!dbc) return false;
    std::string pid = product_db_id(product_id);
    return exec_sql(dbc,
        "IF NOT EXISTS (SELECT 1 FROM ValidationQueueItem WHERE product_id = " + pid +
        " AND status = 'pending') "
        "BEGIN "
        "  INSERT INTO ValidationQueueItem (product_id, status, assigned_to, enqueued_at) VALUES (" +
        pid + ", 'pending', '" + escape_sql(utf8_to_cp1252(assigned_to)) + "', GETDATE()); "
        "END");
}
} // namespace peai
