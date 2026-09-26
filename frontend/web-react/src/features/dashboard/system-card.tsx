// features/dashboard/system-card.tsx
// Tarjeta "Sistema y Persistencia" — expone los endpoints /system/* del backend:
// inicializar la RAM del núcleo C++ (vacía / desde archivo / desde SQL Server),
// guardar a SQL Server y exportar el estado a JSON (notas 9 y 10 del taller).

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Database, FileJson, FileUp, Trash2, Save } from 'lucide-react'

import {
  initializeEmpty,
  initializeFromFile,
  initializeFromDatabase,
  saveToDatabase,
  exportToFile,
} from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/confirm-dialog'

// Mismo connection string con el que arranca el backend (app/main.py).
const DEFAULT_CONN =
  'Driver={ODBC Driver 17 for SQL Server};Server=localhost;Database=peai;Trusted_Connection=yes;'

type PendingInit = 'empty' | 'file' | 'database' | null

export function SystemCard() {
  const queryClient = useQueryClient()
  const [filePath, setFilePath] = useState('pea_data.json')
  const [connString, setConnString] = useState(DEFAULT_CONN)
  const [pendingInit, setPendingInit] = useState<PendingInit>(null)

  // Inicializar reemplaza toda la RAM del núcleo: hay que recargar todo.
  const onInitSuccess = (method: string) => {
    toast.success(`Memoria reinicializada (${method})`)
    queryClient.invalidateQueries()
  }
  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : 'Error en la operación')

  const initEmpty = useMutation({
    mutationFn: initializeEmpty,
    onSuccess: () => onInitSuccess('vacía'),
    onError,
  })
  const initFile = useMutation({
    mutationFn: () => initializeFromFile(filePath),
    onSuccess: () => onInitSuccess(`archivo ${filePath}`),
    onError,
  })
  const initDb = useMutation({
    mutationFn: () => initializeFromDatabase(connString),
    onSuccess: () => onInitSuccess('SQL Server'),
    onError,
  })
  const saveDb = useMutation({
    mutationFn: () => saveToDatabase(connString),
    onSuccess: () => toast.success('Estado guardado en SQL Server'),
    onError,
  })
  const exportJson = useMutation({
    mutationFn: () => exportToFile(filePath),
    onSuccess: (data) => toast.success(`Estado exportado a ${data.export ?? filePath}`),
    onError,
  })

  const confirmInit = () => {
    if (pendingInit === 'empty') initEmpty.mutate()
    else if (pendingInit === 'file') initFile.mutate()
    else if (pendingInit === 'database') initDb.mutate()
    setPendingInit(null)
  }

  const busy =
    initEmpty.isPending || initFile.isPending || initDb.isPending ||
    saveDb.isPending || exportJson.isPending

  return (
    <Card className='border-border/50 shadow-sm'>
      <CardHeader>
        <CardTitle className='text-lg'>Sistema y Persistencia</CardTitle>
        <CardDescription>
          Estado en memoria del núcleo C++: inicializar, guardar en SQL Server o exportar a JSON.
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-4'>
        <div className='grid gap-3 sm:grid-cols-2'>
          <div className='space-y-1.5'>
            <Label htmlFor='sys-file' className='text-xs'>Archivo JSON</Label>
            <Input
              id='sys-file'
              value={filePath}
              onChange={(e) => setFilePath(e.target.value)}
              className='font-mono text-xs'
            />
          </div>
          <div className='space-y-1.5'>
            <Label htmlFor='sys-conn' className='text-xs'>Cadena de conexión SQL Server</Label>
            <Input
              id='sys-conn'
              value={connString}
              onChange={(e) => setConnString(e.target.value)}
              className='font-mono text-xs'
            />
          </div>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Button variant='outline' size='sm' disabled={busy} onClick={() => setPendingInit('file')}>
            <FileUp className='mr-2 h-4 w-4' /> Cargar desde archivo
          </Button>
          <Button variant='outline' size='sm' disabled={busy} onClick={() => setPendingInit('database')}>
            <Database className='mr-2 h-4 w-4' /> Recargar desde SQL Server
          </Button>
          <Button variant='outline' size='sm' disabled={busy} onClick={() => setPendingInit('empty')}>
            <Trash2 className='mr-2 h-4 w-4' /> Inicializar vacío
          </Button>
          <Button variant='secondary' size='sm' disabled={busy} onClick={() => saveDb.mutate()}>
            <Save className='mr-2 h-4 w-4' /> Guardar en SQL Server
          </Button>
          <Button variant='secondary' size='sm' disabled={busy} onClick={() => exportJson.mutate()}>
            <FileJson className='mr-2 h-4 w-4' /> Exportar JSON
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={pendingInit !== null}
        onOpenChange={(open) => { if (!open) setPendingInit(null) }}
        title='Reinicializar memoria'
        desc='Esta acción reemplaza TODO el estado en memoria del núcleo (grupos, investigadores, productos, cola y pila). Los cambios no guardados se perderán. ¿Continuar?'
        destructive
        confirmText='Sí, reinicializar'
        isLoading={initEmpty.isPending || initFile.isPending || initDb.isPending}
        handleConfirm={confirmInit}
      />
    </Card>
  )
}
