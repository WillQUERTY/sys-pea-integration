import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  User as UserIcon,
  BookOpen,
  Users,
  Save,
  GraduationCap,
  Mail,
  Fingerprint,
  UserPlus,
  Trash2
} from 'lucide-react'

import { getResearcher, updateResearcher, getResearcherProducts, getResearcherGroups, listGroups, linkMember, unlinkMember } from '@/lib/api'
import type { Researcher } from '@/lib/types'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

import { DataTable } from '@/components/data-table'

export function ResearcherDetail({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams({ strict: false }) as any
  const queryClient = useQueryClient()
  
  const researcherId = Number(id)

  const { data: researcher, isLoading } = useQuery({
    queryKey: ['researcher', researcherId],
    queryFn: () => getResearcher(researcherId),
  })

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['researcher-products', researcherId],
    queryFn: () => getResearcherProducts(researcherId),
  })

  const { data: groups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ['researcher-groups', researcherId],
    queryFn: () => getResearcherGroups(researcherId),
  })

  const [formData, setFormData] = useState<Partial<Researcher>>({})

  // Vinculación a grupos (lado investigador de la multilista — Req. 5)
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupSearch, setGroupSearch] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [memberRole, setMemberRole] = useState('Investigador')
  const [memberStartDate, setMemberStartDate] = useState('')

  const { data: groupResults, isFetching: isSearchingGroups } = useQuery({
    queryKey: ['groups', 'picker', groupSearch],
    queryFn: () => listGroups({ search: groupSearch, limit: 8 }),
    enabled: groupOpen,
  })
  const linkableGroups = (groupResults?.items ?? []).filter(
    (g) => !(groups ?? []).some((gg) => gg.id === g.id)
  )

  const linkGroupMutation = useMutation({
    mutationFn: () =>
      linkMember(selectedGroupId!, researcherId, {
        role: memberRole,
        start_date: memberStartDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher-groups', researcherId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Investigador vinculado al grupo')
      setGroupOpen(false)
      setSelectedGroupId(null)
      setGroupSearch('')
      setMemberRole('Investigador')
      setMemberStartDate('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular')
  })

  const unlinkGroupMutation = useMutation({
    mutationFn: (gid: number) => unlinkMember(gid, researcherId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher-groups', researcherId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Vinculación eliminada')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular')
  })

  // Sync state when researcher loads
  useEffect(() => {
    if (researcher) {
      setFormData({
        first_names: researcher.first_names,
        last_names: researcher.last_names,
        external_code: researcher.external_code,
        highest_education_level: researcher.highest_education_level ?? '',
        institutional_email: researcher.institutional_email ?? '',
        orcid: researcher.orcid ?? '',
      })
    }
  }, [researcher])

  const mutation = useMutation({
    mutationFn: (data: Partial<Researcher>) => updateResearcher(researcherId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['researcher', researcherId] })
      queryClient.invalidateQueries({ queryKey: ['researchers'] })
      toast.success('Perfil actualizado correctamente')
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el perfil')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <>
        {isAdmin && (
          <Header>
            <div className='ms-auto flex items-center space-x-4'>
              <ThemeSwitch />
              <ConfigDrawer />
              <ProfileDropdown />
            </div>
          </Header>
        )}
        <Main className={`p-0 sm:p-6 ${!isAdmin ? 'max-w-5xl mx-auto w-full' : ''}`}>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </Main>
      </>
    )
  }

  if (!researcher) {
    return (
      <Main className={`p-0 sm:p-6 ${!isAdmin ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Investigador no encontrado</h2>
          <Button asChild className="mt-4">
            <Link to={isAdmin ? "/admin/researchers" : "/researchers"}>Volver a Investigadores</Link>
          </Button>
        </div>
      </Main>
    )
  }

  const hue = (researcher.first_names?.charCodeAt(0) ?? 0) * 23 % 360
  const initial = researcher.first_names?.[0]?.toUpperCase() ?? '?'

  return (
    <>
      {isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
              <Link to={isAdmin ? '/admin/researchers' : '/researchers'}>
                <ArrowLeft className='h-4 w-4' />
              </Link>
            </Button>
            <div className='flex items-center gap-2'>
              <h1 className='text-sm font-semibold'>Ficha del Investigador</h1>
              <Badge variant='outline' className='text-[10px] font-normal text-muted-foreground'>
                CvLAC
              </Badge>
            </div>
          </div>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
      )}

      <Main className={`p-0 sm:p-6 ${!isAdmin ? 'max-w-5xl mx-auto w-full' : ''}`}>
        {/* Cover & Profile Header */}
        <div className='relative mb-8 rounded-b-none sm:rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm'>
          <div className='h-32 bg-gradient-to-r from-primary/15 via-background to-secondary/15 relative'>
            <div className='absolute inset-0 bg-radial from-transparent to-card/50' />
          </div>
          
          <div className='px-6 pb-6 pt-0 relative'>
            <div className='flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12'>
              <div 
                className='h-24 w-24 rounded-2xl border-4 border-card flex items-center justify-center text-3xl font-bold text-white shadow-lg shrink-0'
                style={{ background: `hsl(${hue} 50% 45%)` }}
              >
                {initial}
              </div>
              
              <div className='flex-1 pb-1'>
                <h1 className='text-2xl font-bold'>{researcher.first_names} {researcher.last_names}</h1>
                <div className='flex flex-wrap gap-2 mt-2'>
                  {researcher.classification_records && (
                    <Badge variant='outline' className='text-xs font-semibold border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300 max-w-64 truncate'>
                      {researcher.classification_records}
                    </Badge>
                  )}
                  {researcher.highest_education_level && (
                    <Badge variant='outline' className='text-xs font-normal border-primary/30 bg-primary/5 text-primary'>
                      {researcher.highest_education_level}
                    </Badge>
                  )}
                  <Badge variant='outline' className='text-xs font-normal text-muted-foreground'>
                    {researcher.external_code}
                  </Badge>
                </div>
              </div>
              
              <div className='pb-1 w-full sm:w-auto'>
                <Button 
                  onClick={handleSubmit} 
                  disabled={mutation.isPending}
                  className='w-full sm:w-auto rounded-xl shadow-md'
                >
                  <Save className='mr-2 h-4 w-4' />
                  {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="bg-transparent h-12 p-0 border-b border-border/50 w-full justify-start rounded-none overflow-x-auto">
            <TabsTrigger 
              value="perfil" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <UserIcon className='mr-2 h-4 w-4' /> Perfil General
            </TabsTrigger>
            <TabsTrigger
              value="productos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <BookOpen className='mr-2 h-4 w-4' /> Productos ({products?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="grupos"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <Users className='mr-2 h-4 w-4' /> Grupos ({groups?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="focus-visible:outline-none">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Información Personal */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                <div className='flex items-center gap-2 mb-6'>
                  <div className='p-2 bg-primary/10 rounded-lg'>
                    <UserIcon className='h-4 w-4 text-primary' />
                  </div>
                  <h3 className="font-semibold text-lg">Información Personal</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_names">Nombres</Label>
                    <Input
                      id="first_names"
                      value={formData.first_names}
                      onChange={(e) => setFormData({ ...formData, first_names: e.target.value })}
                      required
                      className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_names">Apellidos</Label>
                    <Input
                      id="last_names"
                      value={formData.last_names}
                      onChange={(e) => setFormData({ ...formData, last_names: e.target.value })}
                      required
                      className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="external_code">Código CvLAC / Identificación</Label>
                    <div className='relative'>
                      <Fingerprint className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <Input
                        id="external_code"
                        value={formData.external_code}
                        onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                        required
                        className='pl-9 bg-muted/30 focus-visible:bg-transparent rounded-xl'
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Información Académica y Contacto */}
              <div className="space-y-6">
                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                  <div className='flex items-center gap-2 mb-6'>
                    <div className='p-2 bg-secondary/10 rounded-lg'>
                      <GraduationCap className='h-4 w-4 text-secondary' />
                    </div>
                    <h3 className="font-semibold text-lg">Académico & Contacto</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="highest_education_level">Formación Máxima</Label>
                      <Input
                        id="highest_education_level"
                        value={formData.highest_education_level ?? ''}
                        onChange={(e) => setFormData({ ...formData, highest_education_level: e.target.value })}
                        placeholder="Ej: Doctorado en Ingeniería"
                        className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="institutional_email">Correo Institucional</Label>
                      <div className='relative'>
                        <Mail className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                        <Input
                          id="institutional_email"
                          type="email"
                          value={formData.institutional_email ?? ''}
                          onChange={(e) => setFormData({ ...formData, institutional_email: e.target.value })}
                          className='pl-9 bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="orcid">ORCID</Label>
                      <Input
                        id="orcid"
                        value={formData.orcid ?? ''}
                        onChange={(e) => setFormData({ ...formData, orcid: e.target.value })}
                        placeholder="Ej: 0000-0002-1825-0097"
                        className='bg-muted/30 focus-visible:bg-transparent rounded-xl font-mono text-sm'
                      />
                    </div>
                  </div>
                </div>
              </div>
              
            </form>
          </TabsContent>

          <TabsContent value="productos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Productos del Investigador</h3>
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Título del Producto',
                  cell: (p) => <div className='font-medium text-sm'>{p.title}</div>
                },
                {
                  key: 'date',
                  header: 'Fecha',
                  cell: (p) => <span className='text-muted-foreground'>{p.publication_date || p.obtained_date || '-'}</span>
                },
                {
                  key: 'status',
                  header: 'Estado',
                  cell: (p) => (
                    <Badge variant={p.validation_status === 'valid' ? 'default' : p.validation_status === 'rejected' ? 'destructive' : 'secondary'}>
                      {p.validation_status === 'valid' ? 'Validado' : p.validation_status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                    </Badge>
                  )
                }
              ]}
              data={products ?? []}
              loading={isLoadingProducts}
              rowKey={(p) => p.id!}
              emptyMessage="Este investigador no tiene productos asociados."
              searchPlaceholder="Buscar productos..."
            />
          </TabsContent>

          <TabsContent value="grupos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Grupos de Investigación</h3>
              <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="w-4 h-4 mr-2"/> Vincular a Grupo</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vincular a un Grupo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Buscar grupo</Label>
                      <Input
                        value={groupSearch}
                        onChange={e => { setGroupSearch(e.target.value); setSelectedGroupId(null) }}
                        placeholder="Nombre o sigla del grupo..."
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border/50 p-1">
                      {isSearchingGroups ? (
                        <p className="text-sm text-muted-foreground p-2">Buscando...</p>
                      ) : linkableGroups.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">Sin resultados.</p>
                      ) : (
                        linkableGroups.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => setSelectedGroupId(g.id!)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedGroupId === g.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted/60'
                            }`}
                          >
                            <span className="block truncate">{g.name}</span>
                            {g.acronym && <span className="text-xs text-muted-foreground">{g.acronym}</span>}
                          </button>
                        ))
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Rol en el grupo</Label>
                        <Input value={memberRole} onChange={e => setMemberRole(e.target.value)} placeholder="Ej: Investigador" />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha de vinculación</Label>
                        <Input value={memberStartDate} onChange={e => setMemberStartDate(e.target.value)} placeholder="Ej: 2024-01" />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => linkGroupMutation.mutate()}
                      disabled={!selectedGroupId || linkGroupMutation.isPending}
                    >
                      Vincular
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Nombre del Grupo',
                  cell: (g) => (
                    <Link
                      to="/groups/$id"
                      params={{ id: String(g.id) }}
                      className='font-medium text-sm text-primary hover:underline'
                    >
                      {g.name}
                    </Link>
                  )
                },
                {
                  key: 'acronym',
                  header: 'Sigla',
                  cell: (g) => <span className='text-muted-foreground'>{g.acronym || '-'}</span>
                },
                {
                  key: 'classification',
                  header: 'Clasificación',
                  cell: (g) => g.classification
                    ? <Badge variant='secondary'>{g.classification}</Badge>
                    : <span className='text-muted-foreground'>Sin clasificar</span>
                },
                {
                  key: 'actions',
                  header: '',
                  cell: (g) => (
                    <Button variant="ghost" size="icon" onClick={() => unlinkGroupMutation.mutate(g.id!)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )
                }
              ]}
              data={groups ?? []}
              loading={isLoadingGroups}
              rowKey={(g) => g.id!}
              emptyMessage="Este investigador no está vinculado a ningún grupo."
              searchPlaceholder="Buscar grupos..."
            />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
