const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/cell: \(r\) =>/g, "cell: (r: any) =>");
  content = content.replace(/cell: \(p\) =>/g, "cell: (p: any) =>");
  content = content.replace(/cell: \(g\) =>/g, "cell: (g: any) =>");
  fs.writeFileSync(path, content, 'utf8');
}

fix('src/features/groups/detail.tsx');
fix('src/features/researchers/detail.tsx');
fix('src/features/products/detail.tsx');
