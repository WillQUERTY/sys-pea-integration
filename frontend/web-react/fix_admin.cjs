const fs = require('fs');

function fixGroupDetail() {
  const path = 'src/features/groups/detail.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Dialogs
  const dialogStates = ['productOpen', 'projectOpen', 'planOpen', 'lineOpen'];
  for (const state of dialogStates) {
    content = content.replace(
      new RegExp(`<Dialog open=\\{${state}\\} onOpenChange=\\{set${state.charAt(0).toUpperCase() + state.slice(1)}\\}>`),
      `{isAdmin && (\n                <Dialog open={${state}} onOpenChange={set${state.charAt(0).toUpperCase() + state.slice(1)}}>`
    );
    // Find the immediate </Dialog> before the next <DataTable
    content = content.replace(
      /<\/Dialog>\s*<DataTable/g,
      `</Dialog>\n              )}\n            <DataTable`
    );
  }

  // Action columns
  content = content.replace(
    /\{\s*key:\s*'actions',([\s\S]*?)\n\s*\}\n\s*\]\}/g,
    `isAdmin ? {\n                  key: 'actions',$1\n                } : null\n              ].filter(Boolean) as any}`
  );

  fs.writeFileSync(path, content, 'utf8');
}

function fixResearcherDetail() {
  const path = 'src/features/researchers/detail.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Guardar Cambios
  content = content.replace(
    /<Button\n\s*onClick=\{handleSubmit\}\n\s*disabled=\{mutation\.isPending\}/,
    `{isAdmin && (\n                  <Button\n                    onClick={handleSubmit}\n                    disabled={mutation.isPending}`
  );
  content = content.replace(
    /\{mutation\.isPending \? 'Guardando\.\.\.' : 'Guardar Cambios'\}\n\s*<\/Button>/,
    `{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}\n                  </Button>\n                  )}`
  );

  // Form
  content = content.replace(
    /<form onSubmit=\{handleSubmit\} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">/,
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">\n              <fieldset disabled={!isAdmin} className="contents">`
  );
  content = content.replace(
    /<\/form>\n\s*<\/TabsContent>/,
    `</fieldset>\n            </form>\n          </TabsContent>`
  );

  // Dialog
  content = content.replace(
    /<Dialog open=\{groupOpen\} onOpenChange=\{setGroupOpen\}>/,
    `{isAdmin && (\n                <Dialog open={groupOpen} onOpenChange={setGroupOpen}>`
  );
  content = content.replace(
    /<\/Dialog>\n\n\s*<div className="grid/g,
    `</Dialog>\n              )}\n\n            <div className="grid`
  );

  // Unlink group button
  content = content.replace(
    /<Button variant="ghost" size="icon" onClick=\{\(\) => unlinkGroupMutation\.mutate\(g\.id!\)\}>/,
    `{isAdmin && (\n                      <Button variant="ghost" size="icon" onClick={() => unlinkGroupMutation.mutate(g.id!)}>`
  );
  content = content.replace(
    /<Trash2 className="w-4 h-4 text-red-500" \/>\n\s*<\/Button>/g,
    `<Trash2 className="w-4 h-4 text-red-500" />\n                      </Button>\n                    )}`
  );

  // Header & Main layout
  content = content.replace(
    /<Header>\n\s*<div className='flex items-center gap-4'>\n\s*<Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>\n\s*<Link to=\{isAdmin \? '\/admin\/researchers' : '\/researchers'\}>\n\s*<ArrowLeft className='h-4 w-4' \/>\n\s*<\/Link>\n\s*<\/Button>\n\s*<h1 className='text-sm font-medium'>Perfil del Investigador<\/h1>\n\s*<\/div>\n\s*\{isAdmin && \(\n\s*<div className='ms-auto flex items-center space-x-4'>\n\s*<ThemeSwitch \/>\n\s*<ConfigDrawer \/>\n\s*<ProfileDropdown \/>\n\s*<\/div>\n\s*\)\}\n\s*<\/Header>/,
    `{isAdmin && (\n        <Header>\n          <div className='flex items-center gap-4'>\n            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>\n              <Link to={isAdmin ? '/admin/researchers' : '/researchers'}>\n                <ArrowLeft className='h-4 w-4' />\n              </Link>\n            </Button>\n            <h1 className='text-sm font-medium'>Perfil del Investigador</h1>\n          </div>\n          <div className='ms-auto flex items-center space-x-4'>\n            <ThemeSwitch />\n            <ConfigDrawer />\n            <ProfileDropdown />\n          </div>\n        </Header>\n      )}`
  );
  
  content = content.replace(
    /<Main className='p-0 sm:p-6'>/,
    `<Main className={\`p-0 sm:p-6 \${!isAdmin ? 'max-w-5xl mx-auto' : ''}\`}>`
  );

  fs.writeFileSync(path, content, 'utf8');
}

function fixProductDetail() {
  const path = 'src/features/products/detail.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Edit Button in Cover
  content = content.replace(
    /<Button size='sm' variant='outline' onClick=\{\(\) => setEditOpen\(true\)\}>/,
    `{isAdmin && (\n              <Button size='sm' variant='outline' onClick={() => setEditOpen(true)}>`
  );
  content = content.replace(
    /<Pencil className='mr-2 h-3\.5 w-3\.5' \/>\n\s*Editar\n\s*<\/Button>/,
    `<Pencil className='mr-2 h-3.5 w-3.5' />\n                Editar\n              </Button>\n            )}`
  );

  // Edit authors button
  content = content.replace(
    /<Button size='sm' variant='outline' onClick=\{\(\) => setAuthorOpen\(true\)\}>/,
    `{isAdmin && (\n              <Button size='sm' variant='outline' onClick={() => setAuthorOpen(true)}>`
  );
  content = content.replace(
    /<Pencil className='mr-2 h-3\.5 w-3\.5' \/> Editar Autores\n\s*<\/Button>/,
    `<Pencil className='mr-2 h-3.5 w-3.5' /> Editar Autores\n              </Button>\n            )}`
  );
  
  // Header & Main layout
  content = content.replace(
    /<Header>\n\s*<div className='flex items-center gap-4'>\n\s*<Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>\n\s*<Link to=\{isAdmin \? '\/admin\/products' : '\/products'\}>\n\s*<ArrowLeft className='h-4 w-4' \/>\n\s*<\/Link>\n\s*<\/Button>\n\s*<h1 className='text-sm font-medium'>Ficha del Producto<\/h1>\n\s*<\/div>\n\s*\{isAdmin && \(\n\s*<div className='ms-auto flex items-center space-x-4'>\n\s*<ThemeSwitch \/>\n\s*<ConfigDrawer \/>\n\s*<ProfileDropdown \/>\n\s*<\/div>\n\s*\)\}\n\s*<\/Header>/,
    `{isAdmin && (\n        <Header>\n          <div className='flex items-center gap-4'>\n            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>\n              <Link to={isAdmin ? '/admin/products' : '/products'}>\n                <ArrowLeft className='h-4 w-4' />\n              </Link>\n            </Button>\n            <h1 className='text-sm font-medium'>Ficha del Producto</h1>\n          </div>\n          <div className='ms-auto flex items-center space-x-4'>\n            <ThemeSwitch />\n            <ConfigDrawer />\n            <ProfileDropdown />\n          </div>\n        </Header>\n      )}`
  );
  
  content = content.replace(
    /<Main className='p-0 sm:p-6'>/,
    `<Main className={\`p-0 sm:p-6 \${!isAdmin ? 'max-w-5xl mx-auto' : ''}\`}>`
  );

  fs.writeFileSync(path, content, 'utf8');
}

fixGroupDetail();
fixResearcherDetail();
fixProductDetail();

console.log('Done!');
