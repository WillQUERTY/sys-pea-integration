// core_cpp/src/persistence/db_persistence.cpp
// SQL Server persistence layer using native ODBC.
// Supports all 16 tables of PEA-i master specification.

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
            r.external_code = (i2 != SQL_NULL_DATA) ? (char*)ext : "";
            r.identification_type = (i3 != SQL_NULL_DATA) ? (char*)idt : "";
            r.identification_number = (i4 != SQL_NULL_DATA) ? (char*)idn : "";
            r.first_names = (i5 != SQL_NULL_DATA) ? (char*)fname : "";
            r.last_names = (i6 != SQL_NULL_DATA) ? (char*)lname : "";
            r.nationality = (i7 != SQL_NULL_DATA) ? (char*)nat : "";
            r.country_of_residence = (i8 != SQL_NULL_DATA) ? (char*)c_res : "";
            r.institutional_email = (i9 != SQL_NULL_DATA) ? (char*)email : "";
            r.orcid = (i10 != SQL_NULL_DATA) ? (char*)orcid : "";
            r.highest_education_level = (i11 != SQL_NULL_DATA) ? (char*)edu : "";
            r.education_records = (i12 != SQL_NULL_DATA) ? (char*)edur : "";
            r.classification_records = (i13 != SQL_NULL_DATA) ? (char*)clasr : "";
            r.status = (i14 != SQL_NULL_DATA) ? (char*)status : "active";
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
            p.external_code = (i2 != SQL_NULL_DATA) ? (char*)ext : "";
            p.title = (i3 != SQL_NULL_DATA) ? (char*)title : "";
            p.description = (i4 != SQL_NULL_DATA) ? (char*)desc : "";
            p.family_id = (i5 != SQL_NULL_DATA) ? fam_id : 0;
            p.subtype_id = (i6 != SQL_NULL_DATA) ? sub_id : 0;
            p.quality_category_id = (i7 != SQL_NULL_DATA) ? qc_id : 0;
            p.obtained_date = (i8 != SQL_NULL_DATA) ? (char*)o_date : "";
            p.publication_date = (i9 != SQL_NULL_DATA) ? (char*)p_date : "";
            p.validation_status = (i10 != SQL_NULL_DATA) ? (char*)v_status : "pending";
            p.language = (i11 != SQL_NULL_DATA) ? (char*)lang : "";
            p.country = (i12 != SQL_NULL_DATA) ? (char*)ctry : "";
            p.doi = (i13 != SQL_NULL_DATA) ? (char*)doi : "";
            p.isbn = (i14 != SQL_NULL_DATA) ? (char*)isbn : "";
            p.issn = (i15 != SQL_NULL_DATA) ? (char*)issn : "";
            p.url = (i16 != SQL_NULL_DATA) ? (char*)url : "";
            p.evidence = (i17 != SQL_NULL_DATA) ? (char*)evid : "";
            p.specialized_attributes = (i18 != SQL_NULL_DATA) ? (char*)spec : "";
            p.status = (i19 != SQL_NULL_DATA) ? (char*)status : "active";
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
            g.external_code = (i2 != SQL_NULL_DATA) ? (char*)ext   : "";
            g.name          = (i3 != SQL_NULL_DATA) ? (char*)gname : "";
            g.acronym       = (i4 != SQL_NULL_DATA) ? (char*)acr   : "";
            g.institution   = (i5 != SQL_NULL_DATA) ? (char*)inst  : "";
            g.classification= (i6 != SQL_NULL_DATA) ? (char*)clas  : "";
            g.description   = (i7 != SQL_NULL_DATA) ? (char*)desc  : "";
            g.mission       = (i8 != SQL_NULL_DATA) ? (char*)miss  : "";
            g.vision        = (i9 != SQL_NULL_DATA) ? (char*)vis   : "";
            g.declared_creation_date = (i10 != SQL_NULL_DATA) ? (char*)cdate : "";
            g.knowledge_area = (i11 != SQL_NULL_DATA) ? (char*)karea: "";
            g.knowledge_subarea = (i12 != SQL_NULL_DATA) ? (char*)ksub : "";
            g.city          = (i13 != SQL_NULL_DATA) ? (char*)city : "";
            g.department    = (i14 != SQL_NULL_DATA) ? (char*)dep  : "";
            g.website       = (i15 != SQL_NULL_DATA) ? (char*)web  : "";
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

bool sync_group_to_db(const std::string& connection_string, int group_id) {
    std::optional<Group> g_opt = get_group(group_id);
    if (!g_opt) return false;
    Group g = g_opt.value();
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;

    std::string sql = 
        "MERGE ResearchGroup AS target "
        "USING (SELECT '" + escape_sql(g.external_code) + "' AS ext, '" + escape_sql(g.name) + "' AS name, '" + escape_sql(g.acronym) + "' AS acr, '" + escape_sql(g.institution) + "' AS inst, '" + escape_sql(g.classification) + "' AS clas, '" + escape_sql(g.description) + "' AS descr, '" + escape_sql(g.mission) + "' AS miss, '" + escape_sql(g.vision) + "' AS vis, '" + escape_sql(g.declared_creation_date) + "' AS cdate, '" + escape_sql(g.knowledge_area) + "' AS karea, '" + escape_sql(g.knowledge_subarea) + "' AS ksub, '" + escape_sql(g.city) + "' AS city, '" + escape_sql(g.department) + "' AS dep, '" + escape_sql(g.website) + "' AS web, '" + escape_sql(g.email) + "' AS email, " + std::to_string(g.leader_id) + " AS lid, '" + escape_sql(g.status) + "' AS sts) AS source "
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
        "USING (SELECT '" + escape_sql(r.external_code) + "' AS ext, '" + escape_sql(r.identification_type) + "' AS idt, '" + escape_sql(r.identification_number) + "' AS idn, '" + escape_sql(r.first_names) + "' AS fname, '" + escape_sql(r.last_names) + "' AS lname, '" + escape_sql(r.nationality) + "' AS nat, '" + escape_sql(r.country_of_residence) + "' AS cres, '" + escape_sql(r.institutional_email) + "' AS email, '" + escape_sql(r.orcid) + "' AS orcid, '" + escape_sql(r.highest_education_level) + "' AS edu, '" + escape_sql(r.education_records) + "' AS edur, '" + escape_sql(r.classification_records) + "' AS clasr, '" + escape_sql(r.status) + "' AS sts) AS source "
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
        "USING (SELECT '" + escape_sql(p.external_code) + "' AS ext, '" + escape_sql(p.title) + "' AS title, '" + escape_sql(p.description) + "' AS descr, " + std::to_string(p.family_id) + " AS fam, " + std::to_string(p.subtype_id) + " AS sub, " + std::to_string(p.quality_category_id) + " AS qc, '" + escape_sql(p.obtained_date) + "' AS odate, '" + escape_sql(p.publication_date) + "' AS pdate, '" + escape_sql(p.validation_status) + "' AS vsts, '" + escape_sql(p.language) + "' AS lang, '" + escape_sql(p.country) + "' AS ctry, '" + escape_sql(p.doi) + "' AS doi, '" + escape_sql(p.isbn) + "' AS isbn, '" + escape_sql(p.issn) + "' AS issn, '" + escape_sql(p.url) + "' AS url, '" + escape_sql(p.evidence) + "' AS evid, '" + escape_sql(p.specialized_attributes) + "' AS spec, '" + escape_sql(p.status) + "' AS sts, " + std::to_string(p.year) + " AS yr) AS source "
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
    std::string g_ext = g_opt ? escape_sql(g_opt->external_code) : "";
    std::string r_ext = r_opt ? escape_sql(r_opt->external_code) : "";

    std::string g_clause = g_ext.empty() ? ("g.id = " + std::to_string(group_id)) : ("g.external_code = '" + g_ext + "'");
    std::string r_clause = r_ext.empty() ? ("r.id = " + std::to_string(researcher_id)) : ("r.external_code = '" + r_ext + "'");

    std::string sql = 
        "IF EXISTS (SELECT 1 FROM GroupMembership m, ResearchGroup g, Researcher r WHERE m.group_id = g.id AND m.researcher_id = r.id AND " + g_clause + " AND " + r_clause + ") "
        "  UPDATE m SET role = '" + escape_sql(role) + "', start_date = '" + escape_sql(start_date) + "', end_date = '" + escape_sql(end_date) + "' "
        "  FROM GroupMembership m, ResearchGroup g, Researcher r "
        "  WHERE m.group_id = g.id AND m.researcher_id = r.id AND " + g_clause + " AND " + r_clause + " "
        "ELSE "
        "  INSERT INTO GroupMembership (group_id, researcher_id, role, start_date, end_date, status) "
        "  SELECT g.id, r.id, '" + escape_sql(role) + "', '" + escape_sql(start_date) + "', '" + escape_sql(end_date) + "', 'active' "
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
    std::string g_ext = g_opt ? escape_sql(g_opt->external_code) : "";
    std::string p_ext = p_opt ? escape_sql(p_opt->external_code) : "";

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
    std::string p_ext = p_opt ? escape_sql(p_opt->external_code) : "";
    std::string r_ext = r_opt ? escape_sql(r_opt->external_code) : "";

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
    return true;
}

} // namespace peai
