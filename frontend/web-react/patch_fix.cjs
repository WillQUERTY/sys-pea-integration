const fs = require('fs');
let file = fs.readFileSync('fix_all_3.cjs', 'utf8');
file = file.replace(/\]\.filter\(Boolean\) as any\}/g, "].filter(Boolean) as import('@/components/data-table').DataColumn<any>[]}");
fs.writeFileSync('fix_all_3.cjs', file);
