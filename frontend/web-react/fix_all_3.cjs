const fs = require('fs');

function replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function fixGroups() {
  const path = 'src/features/groups/detail.tsx';
  let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

  content = replaceAll(content, 
    `<Header>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
            <Link to={isAdmin ? '/admin/groups' : '/groups'}>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <h1 className='text-sm font-medium'>Perfil del Grupo</h1>
        </div>
        {isAdmin && (
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        )}
      </Header>`, 
    `{isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
              <Link to={isAdmin ? '/admin/groups' : '/groups'}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <h1 className='text-sm font-medium'>Perfil del Grupo</h1>
          </div>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
      )}`
  );

  content = replaceAll(content,
    `<Main className='p-0 sm:p-6'>`,
    `<Main className={\`p-0 sm:p-6 \${!isAdmin ? 'max-w-5xl mx-auto' : ''}\`}>`
  );

  content = replaceAll(content,
    `<Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className='w-full sm:w-auto rounded-xl shadow-md'
                >
                  <Save className='mr-2 h-4 w-4' />
                  {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>`,
    `{isAdmin && (
                  <Button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className='w-full sm:w-auto rounded-xl shadow-md'
                  >
                    <Save className='mr-2 h-4 w-4' />
                    {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                )}`
  );

  content = replaceAll(content,
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">`,
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <fieldset disabled={!isAdmin} className="contents">`
  );

  content = replaceAll(content,
    `</form>
          </TabsContent>`,
    `</fieldset>
            </form>
          </TabsContent>`
  );

  const dialogs = ['memberOpen', 'productOpen', 'projectOpen', 'planOpen', 'lineOpen'];
  for (const d of dialogs) {
    const C = d.charAt(0).toUpperCase() + d.slice(1);
    content = replaceAll(content,
      `<Dialog open={${d}} onOpenChange={set${C}}>`,
      `{isAdmin && (\n                <Dialog open={${d}} onOpenChange={set${C}}>`
    );
  }

  content = replaceAll(content,
    `</Dialog>
            </div>
            <DataTable
              columns={[`,
    `</Dialog>
              )}
            </div>
            <DataTable
              columns={[`
  );

  content = replaceAll(content,
    `</Dialog>
            <DataTable
              columns={[`,
    `</Dialog>
              )}
            <DataTable
              columns={[`
  );

  content = replaceAll(content,
    `{
                  key: 'actions',`,
    `isAdmin ? {
                  key: 'actions',`
  );

  content = replaceAll(content,
    `}
              ]}
              data={`,
    `} : null
              ].filter(Boolean) as import('@/components/data-table').DataColumn<any>[]}
              data={`
  );

  fs.writeFileSync(path, content, 'utf8');
}

function fixResearchers() {
  const path = 'src/features/researchers/detail.tsx';
  let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

  content = replaceAll(content, 
    `<Header>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
            <Link to={isAdmin ? '/admin/researchers' : '/researchers'}>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <h1 className='text-sm font-medium'>Perfil del Investigador</h1>
        </div>
        {isAdmin && (
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        )}
      </Header>`, 
    `{isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
              <Link to={isAdmin ? '/admin/researchers' : '/researchers'}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <h1 className='text-sm font-medium'>Perfil del Investigador</h1>
          </div>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
      )}`
  );

  content = replaceAll(content,
    `<Main className='p-0 sm:p-6'>`,
    `<Main className={\`p-0 sm:p-6 \${!isAdmin ? 'max-w-5xl mx-auto' : ''}\`}>`
  );

  content = replaceAll(content,
    `<Button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className='w-full sm:w-auto rounded-xl shadow-md'
                  >
                    <Save className='mr-2 h-4 w-4' />
                    {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>`,
    `{isAdmin && (
                  <Button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className='w-full sm:w-auto rounded-xl shadow-md'
                  >
                    <Save className='mr-2 h-4 w-4' />
                    {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                )}`
  );

  content = replaceAll(content,
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">`,
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <fieldset disabled={!isAdmin} className="contents">`
  );

  content = replaceAll(content,
    `</form>
          </TabsContent>`,
    `</fieldset>
            </form>
          </TabsContent>`
  );

  content = replaceAll(content,
    `<Dialog open={groupOpen} onOpenChange={setGroupOpen}>`,
    `{isAdmin && (
                <Dialog open={groupOpen} onOpenChange={setGroupOpen}>`
  );

  content = replaceAll(content,
    `</Dialog>

            <div className="grid`,
    `</Dialog>
              )}

            <div className="grid`
  );

  content = replaceAll(content,
    `<Button variant="ghost" size="icon" onClick={() => unlinkGroupMutation.mutate(g.id!)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>`,
    `{isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => unlinkGroupMutation.mutate(g.id!)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    )}`
  );

  fs.writeFileSync(path, content, 'utf8');
}


function fixProducts() {
  const path = 'src/features/products/detail.tsx';
  let content = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

  content = replaceAll(content, 
    `<Header>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
            <Link to={isAdmin ? '/admin/products' : '/products'}>
              <ArrowLeft className='h-4 w-4' />
            </Link>
          </Button>
          <h1 className='text-sm font-medium'>Ficha del Producto</h1>
        </div>
        {isAdmin && (
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        )}
      </Header>`, 
    `{isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
              <Link to={isAdmin ? '/admin/products' : '/products'}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <h1 className='text-sm font-medium'>Ficha del Producto</h1>
          </div>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
      )}`
  );

  content = replaceAll(content,
    `<Main className='p-0 sm:p-6'>`,
    `<Main className={\`p-0 sm:p-6 \${!isAdmin ? 'max-w-5xl mx-auto' : ''}\`}>`
  );

  content = replaceAll(content,
    `<Button size='sm' variant='outline' onClick={() => setEditOpen(true)}>
                <Pencil className='mr-2 h-3.5 w-3.5' />
                Editar
              </Button>`,
    `{isAdmin && (
              <Button size='sm' variant='outline' onClick={() => setEditOpen(true)}>
                <Pencil className='mr-2 h-3.5 w-3.5' />
                Editar
              </Button>
            )}`
  );

  content = replaceAll(content,
    `<Button size='sm' variant='outline' onClick={() => setAuthorOpen(true)}>
                <Pencil className='mr-2 h-3.5 w-3.5' /> Editar Autores
              </Button>`,
    `{isAdmin && (
              <Button size='sm' variant='outline' onClick={() => setAuthorOpen(true)}>
                <Pencil className='mr-2 h-3.5 w-3.5' /> Editar Autores
              </Button>
            )}`
  );

  fs.writeFileSync(path, content, 'utf8');
}


fixGroups();
fixResearchers();
fixProducts();
console.log('Done replacement');
