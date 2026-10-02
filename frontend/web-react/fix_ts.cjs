const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\]\.filter\(Boolean\) as any\}/g, "].filter(Boolean) as import('@/components/data-table').DataColumn<any>[]}");
  fs.writeFileSync(path, content, 'utf8');
}

fix('src/features/groups/detail.tsx');
fix('src/features/researchers/detail.tsx');
fix('src/features/products/detail.tsx');
