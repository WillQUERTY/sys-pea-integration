// core_cpp/src/persistence/db/db_loader.cpp
// Reconstructs in-memory data structures from SQL Server tables and handles system initialization.

#include "persistence/db_persistence.h"
#include "persistence/json_persistence.h"
#include "persistence/db/db_common.h"
#include "services/group_service.h"
#include "services/researcher_service.h"
#include "services/product_service.h"
#include "services/validation_queue.h"
#include "services/undo_stack.h"
#include "services/work_plan_service.h"
#include "services/project_service.h"

#include <iostream>

namespace peai {

bool load_from_db(const std::string& connection_string) {
    SQLHDBC dbc = get_or_create_dbc(connection_string);
    if (!dbc) return false;
    if (!ensure_schema(dbc)) return false;

    // 1. Load researchers
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

    // 2. Load products
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

    // 3. Load groups
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
            g.knowledge_area = (i11 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)karea) : "";
            g.knowledge_subarea = (i12 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ksub) : "";
            g.city          = (i13 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)city) : "";
            g.department    = (i14 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)dep ) : "";
            g.website       = (i15 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)web ) : "";
            g.email         = (i16 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)email) : "";
            g.leader_id     = (i17 != SQL_NULL_DATA) ? leader_id   : 0;
            g.status        = (i18 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)status) : "active";
            create_group(g);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // 4. Load group memberships
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT group_id, researcher_id, role, start_date, end_date FROM GroupMembership",
            SQL_NTS);
        SQLINTEGER gid, rid;
        SQLCHAR role[128], sdate[64], edate[64];
        SQLLEN i1, i2, i3, i4, i5;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &rid, 0, &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, role, sizeof(role), &i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR, sdate, sizeof(sdate), &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR, edate, sizeof(edate), &i5);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            std::string r_str = (i3 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)role) : "Investigador";
            std::string s_str = (i4 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)sdate) : "";
            std::string e_str = (i5 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)edate) : "";
            add_member_to_group(gid, rid, r_str, s_str, e_str);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // 5. Load group product links
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

    // 6. Load product authors
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, product_id, researcher_id, author_order, external_author_name, external_author_identifier, match_status FROM ProductAuthor",
            SQL_NTS);
        SQLINTEGER id, pid, rid, ord;
        SQLCHAR ext_name[512], ext_id[256], m_stat[128];
        SQLLEN i1, i2, i3, i4, i5, i6, i7;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &id, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &pid, 0, &i2);
        SQLBindCol(stmt, 3, SQL_C_SLONG, &rid, 0, &i3);
        SQLBindCol(stmt, 4, SQL_C_SLONG, &ord, 0, &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR, ext_name, sizeof(ext_name), &i5);
        SQLBindCol(stmt, 6, SQL_C_CHAR, ext_id, sizeof(ext_id), &i6);
        SQLBindCol(stmt, 7, SQL_C_CHAR, m_stat, sizeof(m_stat), &i7);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            ProductAuthor pa;
            pa.id                       = (i1 != SQL_NULL_DATA) ? id : 0;
            pa.productId                = (i2 != SQL_NULL_DATA) ? pid : 0;
            pa.researcherId             = (i3 != SQL_NULL_DATA) ? rid : 0;
            pa.authorOrder              = (i4 != SQL_NULL_DATA) ? ord : 1;
            pa.externalAuthorName       = (i5 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ext_name) : "";
            pa.externalAuthorIdentifier = (i6 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ext_id) : "";
            pa.matchStatus              = (i7 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)m_stat) : "unverified";
            add_product_author(pa);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // 7. Load work plans (multilista Grupo -> planes, T-08)
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, group_id, title, description, start_date, end_date, status FROM WorkPlan ORDER BY id",
            SQL_NTS);
        SQLINTEGER pid, gid;
        SQLCHAR title[512], descr[4096], sdate[64], edate[64], status[64];
        SQLLEN i1, i2, i3, i4, i5, i6, i7;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &pid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &gid, 0, &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, title, sizeof(title), &i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR, descr, sizeof(descr), &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR, sdate, sizeof(sdate), &i5);
        SQLBindCol(stmt, 6, SQL_C_CHAR, edate, sizeof(edate), &i6);
        SQLBindCol(stmt, 7, SQL_C_CHAR, status, sizeof(status), &i7);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            WorkPlan wp;
            wp.id          = (i1 != SQL_NULL_DATA) ? pid : 0;
            wp.group_id    = (i2 != SQL_NULL_DATA) ? gid : 0;
            wp.title       = (i3 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)title) : "";
            wp.description = (i4 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)descr) : "";
            wp.start_date  = (i5 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)sdate) : "";
            wp.end_date    = (i6 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)edate) : "";
            wp.status      = (i7 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)status) : "active";
            create_work_plan(wp);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // 8. Load projects (lista global de ProjectNode)
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT id, title, summary, project_type, start_date, end_date, status, funding_type, budget, principal_investigator_id FROM Project ORDER BY id",
            SQL_NTS);
        SQLINTEGER pid, pi_id;
        double budget;
        SQLCHAR title[1024], summary[4096], ptype[128], sdate[64], edate[64], status[64], ftype[128];
        SQLLEN i1, i2, i3, i4, i5, i6, i7, i8, i9, i10;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &pid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR, title, sizeof(title), &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, summary, sizeof(summary), &i3);
        SQLBindCol(stmt, 4, SQL_C_CHAR, ptype, sizeof(ptype), &i4);
        SQLBindCol(stmt, 5, SQL_C_CHAR, sdate, sizeof(sdate), &i5);
        SQLBindCol(stmt, 6, SQL_C_CHAR, edate, sizeof(edate), &i6);
        SQLBindCol(stmt, 7, SQL_C_CHAR, status, sizeof(status), &i7);
        SQLBindCol(stmt, 8, SQL_C_CHAR, ftype, sizeof(ftype), &i8);
        SQLBindCol(stmt, 9, SQL_C_DOUBLE, &budget, 0, &i9);
        SQLBindCol(stmt, 10, SQL_C_SLONG, &pi_id, 0, &i10);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            Project p;
            p.id          = (i1 != SQL_NULL_DATA) ? pid : 0;
            p.title       = (i2 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)title) : "";
            p.summary     = (i3 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)summary) : "";
            p.project_type = (i4 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ptype) : "";
            p.start_date  = (i5 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)sdate) : "";
            p.end_date    = (i6 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)edate) : "";
            p.status      = (i7 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)status) : "active";
            p.funding_type = (i8 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)ftype) : "";
            p.budget      = (i9 != SQL_NULL_DATA) ? budget : 0.0;
            p.principal_investigator_id = (i10 != SQL_NULL_DATA) ? pi_id : 0;
            create_project(p);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // 9. Load group-project links (multilista Grupo -> proyectos)
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT group_id, project_id FROM GroupProject",
            SQL_NTS);
        SQLINTEGER gid, pid;
        SQLLEN i1, i2;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &gid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_SLONG, &pid, 0, &i2);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            link_project_to_group(gid, pid);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    // 10. Reconstruir la cola FIFO de validacion desde los items 'pending'
    {
        SQLHSTMT stmt;
        SQLAllocHandle(SQL_HANDLE_STMT, dbc, &stmt);
        SQLExecDirect(stmt, (SQLCHAR*)
            "SELECT product_id, assigned_to, CONVERT(VARCHAR(19), enqueued_at, 120) "
            "FROM ValidationQueueItem WHERE status = 'pending' ORDER BY enqueued_at, id",
            SQL_NTS);
        SQLINTEGER pid;
        SQLCHAR assigned[128], enq[32];
        SQLLEN i1, i2, i3;
        SQLBindCol(stmt, 1, SQL_C_SLONG, &pid, 0, &i1);
        SQLBindCol(stmt, 2, SQL_C_CHAR, assigned, sizeof(assigned), &i2);
        SQLBindCol(stmt, 3, SQL_C_CHAR, enq, sizeof(enq), &i3);
        while (SQL_SUCCEEDED(SQLFetch(stmt))) {
            ValidationQueueItem item;
            item.product_id  = (i1 != SQL_NULL_DATA) ? pid : 0;
            item.assigned_to = (i2 != SQL_NULL_DATA) ? cp1252_to_utf8((char*)assigned) : "";
            item.enqueued_at = (i3 != SQL_NULL_DATA) ? (char*)enq : "";
            item.status      = "pending";
            vq_enqueue(item);
        }
        SQLFreeHandle(SQL_HANDLE_STMT, stmt);
    }

    std::cout << "[DB] Reconstructed " << list_groups().size() << " groups, "
              << list_researchers().size() << " researchers, "
              << list_products().size() << " products, "
              << total_members() << " memberships, "
              << total_product_links() << " product links, "
              << total_work_plans() << " work plans, "
              << total_projects() << " projects, "
              << total_project_links() << " project links, "
              << vq_size() << " pending validations from SQL Server.\n";
    return true;
}

bool initialize(InitMode mode, const std::string& source) {
    if (mode == InitMode::Database) return load_from_db(source);
    if (mode == InitMode::File) return load_from_file(source);
    // InitMode::Empty
    while (!list_groups().empty()) delete_group(list_groups()[0].id);
    while (!list_researchers().empty()) delete_researcher(list_researchers()[0].id);
    while (!list_products().empty()) delete_product(list_products()[0].id);
    while (!list_projects().empty()) delete_project(list_projects()[0].id);
    vq_clear();
    undo_clear();
    return true;
}

} // namespace peai
