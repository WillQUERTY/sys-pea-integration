const fs = require('fs');

function fix(path) {
  let content = fs.readFileSync(path, 'utf8');

  // Fix the array closing
  content = content.replace(/\s*\]\.filter\(Boolean\) as import\('@\/components\/data-table'\)\.DataColumn<any>\[\]\}/g, "\n              ]}");

  // Fix the isAdmin conditional
  content = content.replace(/isAdmin \? {\n\s*key: 'actions',/g, "...(isAdmin ? [{\n                  key: 'actions',");

  // Close the conditional array
  // We look for the closing of the actions object. It usually looks like:
  //                 } : null
  content = content.replace(/\n\s*\} : null/g, "\n                }] : [])");

  fs.writeFileSync(path, content, 'utf8');
}

fix('src/features/groups/detail.tsx');
fix('src/features/researchers/detail.tsx');
