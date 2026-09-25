import pyodbc

conn = pyodbc.connect('Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;')
cur = conn.cursor()
cur.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")
tables = [r[0] for r in cur.fetchall()]

print("=================================================================")
print("          PEA-i SQL SERVER DATABASE VERIFICATION REPORT          ")
print("=================================================================")
total_all = 0
for t in tables:
    cnt = cur.execute(f"SELECT COUNT(*) FROM [{t}]").fetchone()[0]
    total_all += cnt
    print(f"  {t:24} : {cnt:>6} rows")
print("-----------------------------------------------------------------")
print(f"  TOTAL TABLAS: {len(tables)} | TOTAL REGISTROS: {total_all}")
print("=================================================================")
