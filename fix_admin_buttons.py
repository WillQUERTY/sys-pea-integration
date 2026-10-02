import re
import os

def fix_group_detail():
    path = r'src/features/groups/detail.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Guardar Cambios button
    content = content.replace(
        "<Button\n                  onClick={handleSubmit}\n                  disabled={mutation.isPending}",
        "{isAdmin && (\n                <Button\n                  onClick={handleSubmit}\n                  disabled={mutation.isPending}"
    )
    content = content.replace(
        "{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}\n                </Button>",
        "{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}\n                </Button>\n                )}"
    )

    # 2. Form fieldset
    content = content.replace(
        '<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">',
        '<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">\n              <fieldset disabled={!isAdmin} className="contents">'
    )
    content = content.replace(
        '</form>\n          </TabsContent>',
        '</fieldset>\n            </form>\n          </TabsContent>'
    )

    # 3. Vincular buttons (Dialog wrapping)
    for dialog_state in ["memberOpen", "productOpen", "projectOpen", "planOpen", "lineOpen"]:
        content = content.replace(
            f'<Dialog open={{{dialog_state}}}',
            f'{{isAdmin && <Dialog open={{{dialog_state}}}'
        )
        content = content.replace(
            f'</Dialog>\n\n            <DataTable\n              columns={{[\n',
            f'</Dialog>}}\n\n            <DataTable\n              columns={{[\n'
        )

    # 4. Action columns
    content = re.sub(
        r"\{\s*key:\s*'actions',([\s\S]*?)\n\s*\}\n\s*\]\}",
        r"isAdmin ? {\n                  key: 'actions',\1\n                } : null\n              ].filter(Boolean) as any}",
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def fix_researcher_detail():
    path = r'src/features/researchers/detail.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Guardar Cambios
    content = content.replace(
        "<Button\n                    onClick={handleSubmit}\n                    disabled={mutation.isPending}",
        "{isAdmin && (\n                  <Button\n                    onClick={handleSubmit}\n                    disabled={mutation.isPending}"
    )
    content = content.replace(
        "{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}\n                  </Button>",
        "{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}\n                  </Button>\n                  )}"
    )
    
    # Form
    content = content.replace(
        '<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">',
        '<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">\n              <fieldset disabled={!isAdmin} className="contents">'
    )
    content = content.replace(
        '</form>\n          </TabsContent>',
        '</fieldset>\n            </form>\n          </TabsContent>'
    )

    # Dialog
    content = content.replace('<Dialog open={groupOpen}', '{isAdmin && <Dialog open={groupOpen}')
    content = content.replace('</Dialog>\n\n            <div className="grid', '</Dialog>}\n\n            <div className="grid')

    # Unlink group button
    content = content.replace('<Button variant="ghost" size="icon" onClick={() => unlinkGroupMutation.mutate(g.id!)}>', '{isAdmin && <Button variant="ghost" size="icon" onClick={() => unlinkGroupMutation.mutate(g.id!)}>')
    content = content.replace('<Trash2 className="w-4 h-4 text-red-500" />\n                    </Button>', '<Trash2 className="w-4 h-4 text-red-500" />\n                    </Button>}')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)


def fix_product_detail():
    path = r'src/features/products/detail.tsx'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Edit Button in Cover
    content = content.replace('<Button size=\'sm\' variant=\'outline\' onClick={() => setEditOpen(true)}>', '{isAdmin && <Button size=\'sm\' variant=\'outline\' onClick={() => setEditOpen(true)}>')
    content = content.replace('<Pencil className=\'mr-2 h-3.5 w-3.5\' />\n                Editar\n              </Button>', '<Pencil className=\'mr-2 h-3.5 w-3.5\' />\n                Editar\n              </Button>}')
    
    # Edit authors button
    content = content.replace('<Button size=\'sm\' variant=\'outline\' onClick={() => setAuthorOpen(true)}>', '{isAdmin && <Button size=\'sm\' variant=\'outline\' onClick={() => setAuthorOpen(true)}>')
    content = content.replace('<Pencil className=\'mr-2 h-3.5 w-3.5\' /> Editar Autores\n              </Button>', '<Pencil className=\'mr-2 h-3.5 w-3.5\' /> Editar Autores\n              </Button>}')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_group_detail()
fix_researcher_detail()
fix_product_detail()

print("Done patching detail views.")
