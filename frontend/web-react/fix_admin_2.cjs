const fs = require('fs');

function fixGroupDetail() {
  const path = 'src/features/groups/detail.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Guardar Cambios
  content = content.replace(
    `<Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className='w-full sm:w-auto rounded-xl shadow-md'`,
    `{isAdmin && (
                <Button
                  onClick={handleSubmit}
                  disabled={mutation.isPending}
                  className='w-full sm:w-auto rounded-xl shadow-md'`
  );
  content = content.replace(
    `{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>`,
    `{mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              )}`
  );

  // Form fieldset
  content = content.replace(
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">`,
    `<form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <fieldset disabled={!isAdmin} className="contents">`
  );
  content = content.replace(
    `</form>
          </TabsContent>`,
    `</fieldset>
            </form>
          </TabsContent>`
  );

  // Dialogs
  const dialogStates = ['memberOpen', 'productOpen', 'projectOpen', 'planOpen', 'lineOpen'];
  for (const state of dialogStates) {
    const CapState = state.charAt(0).toUpperCase() + state.slice(1);
    
    // Replace opening
    content = content.replace(
      `<Dialog open={${state}} onOpenChange={set${CapState}}>`,
      `{isAdmin && (<Dialog open={${state}} onOpenChange={set${CapState}}>`
    );
    
    // Find the NEXT </Dialog> after the <Dialog ...>
    // Since we know the structure is exactly </Dialog> followed by <DataTable or <div
    // We will do a generic replace but only the first match after the opening.
    // Wait, simpler: replace `</Dialog>\n            </div>\n            <DataTable`
    // And `</Dialog>\n          </TabsContent>`
  }

  // We can just replace all `</Dialog>\n            </div>\n            <DataTable`
  content = content.replace(/<\/Dialog>\s*<\/div>\s*<DataTable/g, '</Dialog>\n              )}\n            </div>\n            <DataTable');
  // For planOpen and lineOpen there is no </div> before <DataTable
  content = content.replace(/<\/Dialog>\s*<DataTable/g, '</Dialog>\n              )}\n            <DataTable');
  // For memberOpen there is a </div>
  // Wait, I will just manually edit the file using replace_file_content. It's safer.

}

fixGroupDetail();
