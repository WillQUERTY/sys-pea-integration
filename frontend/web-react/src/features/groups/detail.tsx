import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  ArrowLeft, 
  Users as GroupIcon, 
  BookOpen, 
  UserCircle2, 
  Save,
  Building2,
  Trophy,
  Info,
  Trash2,
  Plus,
  UserPlus
} from 'lucide-react'

import {
  getGroup, updateGroup, getGroupMembers, getGroupProducts, getGroupProjects, getGroupResearchLines,
  linkProject, unlinkProject, linkResearchLine, unlinkResearchLine,
  linkMember, unlinkMember, listResearchers
} from '@/lib/api'
import type { Group } from '@/lib/types'

import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

import { DataTable } from '@/components/data-table'

export function ValidationBadge({ status }: { status?: string | null }) {
  if (status === 'valid') return <Badge className='bg-green-600 text-white hover:bg-green-700'>Validado</Badge>
  if (status === 'rejected') return <Badge variant='destructive'>Rechazado</Badge>
  return <Badge variant='secondary'>Pendiente</Badge>
}

export function GroupDetail() {
  const { id } = useParams({ from: '/_authenticated/groups/$id' })
  const queryClient = useQueryClient()
  
  const groupId = Number(id)

  const { data: group, isLoading } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => getGroup(groupId),
  })

  const { data: members, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => getGroupMembers(groupId),
  })

  const { data: products, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['groups', groupId, 'products'],
    queryFn: () => getGroupProducts(groupId),
  })

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['groups', groupId, 'projects'],
    queryFn: () => getGroupProjects(groupId),
  })

  const { data: researchLines, isLoading: isLoadingLines } = useQuery({
    queryKey: ['groups', groupId, 'researchLines'],
    queryFn: () => getGroupResearchLines(groupId),
  })

  const [formData, setFormData] = useState<Partial<Group>>({})
  const [newProject, setNewProject] = useState({ title: '', start_date: '', status: 'Activo' })
  const [newLine, setNewLine] = useState('')
  const [projectOpen, setProjectOpen] = useState(false)
  const [lineOpen, setLineOpen] = useState(false)

  // Vinculación de investigadores (multilista — Req. 5)
  const [memberOpen, setMemberOpen] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedResearcherId, setSelectedResearcherId] = useState<number | null>(null)
  const [memberRole, setMemberRole] = useState('Investigador')
  const [memberStartDate, setMemberStartDate] = useState('')

  const { data: researcherResults, isFetching: isSearchingResearchers } = useQuery({
    queryKey: ['researchers', 'picker', memberSearch],
    queryFn: () => listResearchers({ search: memberSearch, limit: 8 }),
    enabled: memberOpen,
  })
  const linkableResearchers = (researcherResults ?? []).filter(
    (r) => !(members ?? []).some((m) => m.id === r.id)
  )

  // Sync state when group loads
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        external_code: group.external_code,
        acronym: group.acronym ?? '',
        institution: group.institution ?? '',
        classification: group.classification ?? '',
        description: group.description ?? '',
        mission: group.mission ?? '',
        vision: group.vision ?? '',
        knowledge_area: group.knowledge_area ?? '',
        city: group.city ?? '',
        department: group.department ?? '',
        email: group.email ?? '',
        website: group.website ?? '',
        declared_creation_date: group.declared_creation_date ?? '',
      })
    }
  }, [group])

  const mutation = useMutation({
    mutationFn: (data: Partial<Group>) => updateGroup(groupId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Información del grupo actualizada correctamente')
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : 'Error al guardar el grupo')
    },
  })

  const linkProjMutation = useMutation({
    mutationFn: () => linkProject(groupId, newProject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'projects'] })
      toast.success('Proyecto añadido correctamente')
      setProjectOpen(false)
      setNewProject({ title: '', start_date: '', status: 'Activo' })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al añadir')
  })

  const unlinkProjMutation = useMutation({
    mutationFn: (pid: number) => unlinkProject(groupId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'projects'] })
      toast.success('Proyecto desvinculado')
    }
  })

  const linkLineMutation = useMutation({
    mutationFn: () => linkResearchLine(groupId, newLine),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'researchLines'] })
      toast.success('Línea añadida correctamente')
      setLineOpen(false)
      setNewLine('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al añadir')
  })

  const unlinkLineMutation = useMutation({
    mutationFn: (name: string) => unlinkResearchLine(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'researchLines'] })
      toast.success('Línea desvinculada')
    }
  })

  const linkMemberMutation = useMutation({
    mutationFn: () =>
      linkMember(groupId, selectedResearcherId!, {
        role: memberRole,
        start_date: memberStartDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['researcher-groups'] })
      toast.success('Investigador vinculado al grupo')
      setMemberOpen(false)
      setSelectedResearcherId(null)
      setMemberSearch('')
      setMemberRole('Investigador')
      setMemberStartDate('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular')
  })

  const unlinkMemberMutation = useMutation({
    mutationFn: (rid: number) => unlinkMember(groupId, rid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'members'] })
      queryClient.invalidateQueries({ queryKey: ['researcher-groups'] })
      toast.success('Investigador desvinculado del grupo')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular')
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate(formData)
  }

  if (isLoading) {
    return (
      <>
        <Header>
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ConfigDrawer />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <div className="space-y-6">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-[400px] w-full rounded-xl" />
          </div>
        </Main>
      </>
    )
  }

  if (!group) {
    return (
      <Main>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Grupo no encontrado</h2>
          <Button asChild className="mt-4">
            <Link to="/groups">Volver a Grupos</Link>
          </Button>
        </div>
      </Main>
    )
  }

  const hue = (group.name?.charCodeAt(0) ?? 0) * 45 % 360
  const initial = group.name?.[0]?.toUpperCase() ?? 'G'

  return (
    <>
      <Header>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
            <Link to="/groups">
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

      <Main className='p-0 sm:p-6'>
        {/* Cover & Profile Header */}
        <div className='relative mb-8 rounded-b-none sm:rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm'>
          <div className='h-32 bg-gradient-to-r from-blue-500/20 to-purple-500/20 relative'>
            <div className='absolute inset-0 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] opacity-10' />
          </div>
          
          <div className='px-6 pb-6 pt-0 relative'>
            <div className='flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12'>
              <div 
                className='h-24 w-24 rounded-2xl border-4 border-card flex items-center justify-center text-4xl font-bold text-white shadow-lg shrink-0'
                style={{ background: `hsl(${hue} 60% 50%)` }}
              >
                {initial}
              </div>
              
              <div className='flex-1 pb-1'>
                <h1 className='text-2xl font-bold line-clamp-1'>{group.name}</h1>
                <div className='flex flex-wrap items-center gap-2 mt-2'>
                  {group.classification && (
                    <Badge variant='secondary' className='text-xs font-semibold bg-primary/10 text-primary'>
                      Categoría {group.classification}
                    </Badge>
                  )}
                  {group.institution && (
                    <span className='text-sm text-muted-foreground font-medium flex items-center gap-1'>
                      <Building2 className="h-3 w-3" />
                      {group.institution}
                    </span>
                  )}
                  <Badge variant='outline' className='text-xs font-mono text-muted-foreground ml-auto sm:ml-2'>
                    {group.external_code}
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
              <Info className='mr-2 h-4 w-4' /> Información General
            </TabsTrigger>
            <TabsTrigger 
              value="integrantes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <UserCircle2 className='mr-2 h-4 w-4' /> Integrantes ({members?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger 
              value="productos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <BookOpen className='mr-2 h-4 w-4' /> Productos ({products?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger 
              value="proyectos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <Building2 className='mr-2 h-4 w-4' /> Proyectos ({projects?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger 
              value="lineas" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <Info className='mr-2 h-4 w-4' /> Líneas de Inv. ({researchLines?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="focus-visible:outline-none">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Información Básica */}
              <div className="space-y-6">
                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                  <div className='flex items-center gap-2 mb-6'>
                    <div className='p-2 bg-blue-500/10 rounded-lg'>
                      <GroupIcon className='h-4 w-4 text-blue-500' />
                    </div>
                    <h3 className="font-semibold text-lg">Información Básica</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre del Grupo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="acronym">Sigla</Label>
                        <Input
                          id="acronym"
                          value={formData.acronym ?? ''}
                          onChange={(e) => setFormData({ ...formData, acronym: e.target.value })}
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="external_code">Código GrupLAC</Label>
                        <Input
                          id="external_code"
                          value={formData.external_code}
                          onChange={(e) => setFormData({ ...formData, external_code: e.target.value })}
                          required
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl font-mono text-sm'
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="institution">Institución</Label>
                        <Input
                          id="institution"
                          value={formData.institution ?? ''}
                          onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Ciudad / Depto</Label>
                        <div className="flex gap-2">
                          <Input
                            id="city"
                            placeholder="Ciudad"
                            value={formData.city ?? ''}
                            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                          />
                          <Input
                            id="department"
                            placeholder="Departamento"
                            value={formData.department ?? ''}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          value={formData.email ?? ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="website">Página Web</Label>
                        <Input
                          id="website"
                          value={formData.website ?? ''}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="knowledge_area">Área de Conocimiento</Label>
                        <Input
                          id="knowledge_area"
                          value={formData.knowledge_area ?? ''}
                          onChange={(e) => setFormData({ ...formData, knowledge_area: e.target.value })}
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="declared_creation_date">Año / Mes de Formación</Label>
                        <Input
                          id="declared_creation_date"
                          value={formData.declared_creation_date ?? ''}
                          onChange={(e) => setFormData({ ...formData, declared_creation_date: e.target.value })}
                          className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Misión y Visión */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                <div className='flex items-center gap-2 mb-6'>
                  <div className='p-2 bg-purple-500/10 rounded-lg'>
                    <Trophy className='h-4 w-4 text-purple-500' />
                  </div>
                  <h3 className="font-semibold text-lg">Misión y Visión</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mission">Misión</Label>
                    <Textarea
                      id="mission"
                      value={formData.mission ?? ''}
                      onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                      rows={4}
                      className='bg-muted/30 focus-visible:bg-transparent rounded-xl resize-none'
                      placeholder="Misión del grupo..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vision">Visión</Label>
                    <Textarea
                      id="vision"
                      value={formData.vision ?? ''}
                      onChange={(e) => setFormData({ ...formData, vision: e.target.value })}
                      rows={4}
                      className='bg-muted/30 focus-visible:bg-transparent rounded-xl resize-none'
                      placeholder="Visión del grupo..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="knowledge_area">Área de Conocimiento</Label>
                    <Input
                      id="knowledge_area"
                      value={formData.knowledge_area ?? ''}
                      onChange={(e) => setFormData({ ...formData, knowledge_area: e.target.value })}
                      className='bg-muted/30 focus-visible:bg-transparent rounded-xl'
                    />
                  </div>
                </div>
              </div>
              
            </form>
          </TabsContent>

          <TabsContent value="integrantes" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Investigadores vinculados</h3>
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="w-4 h-4 mr-2"/> Vincular Investigador</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vincular Investigador al Grupo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Buscar investigador</Label>
                      <Input
                        value={memberSearch}
                        onChange={e => { setMemberSearch(e.target.value); setSelectedResearcherId(null) }}
                        placeholder="Nombre, apellido u ORCID..."
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border/50 p-1">
                      {isSearchingResearchers ? (
                        <p className="text-sm text-muted-foreground p-2">Buscando...</p>
                      ) : linkableResearchers.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">Sin resultados.</p>
                      ) : (
                        linkableResearchers.map((r) => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setSelectedResearcherId(r.id!)}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                              selectedResearcherId === r.id
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'hover:bg-muted/60'
                            }`}
                          >
                            {r.first_names} {r.last_names}
                            {r.orcid && <span className="ml-2 text-xs text-muted-foreground font-mono">{r.orcid}</span>}
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
                      onClick={() => linkMemberMutation.mutate()}
                      disabled={!selectedResearcherId || linkMemberMutation.isPending}
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
                  header: 'Nombre',
                  searchable: (r) => `${r.first_names} ${r.last_names}`,
                  cell: (r) => (
                    <Link to="/researchers/$id" params={{ id: String(r.id) }} className="font-medium text-primary hover:underline">
                      {r.first_names} {r.last_names}
                    </Link>
                  )
                },
                {
                  key: 'orcid',
                  header: 'ORCID',
                  cell: (r) => <span className='text-muted-foreground font-mono text-xs'>{r.orcid || '-'}</span>
                },
                {
                  key: 'education',
                  header: 'Formación',
                  cell: (r) => r.highest_education_level ? <Badge variant="outline">{r.highest_education_level}</Badge> : '-'
                },
                {
                  key: 'actions',
                  header: '',
                  cell: (r) => (
                    <Button variant="ghost" size="icon" onClick={() => unlinkMemberMutation.mutate(r.id!)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )
                }
              ]}
              data={members ?? []}
              loading={isLoadingMembers}
              rowKey={(r) => r.id!}
              emptyMessage="No hay integrantes vinculados a este grupo."
              searchPlaceholder="Buscar por nombre..."
            />
          </TabsContent>

          <TabsContent value="productos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg mb-4">Productos del Grupo</h3>
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Título del Producto',
                  searchable: (p) => p.title,
                  className: 'max-w-[400px]',
                  cell: (p) => <span className='block truncate font-medium text-sm'>{p.title}</span>
                },
                {
                  key: 'year',
                  header: 'Año',
                  cell: (p) => <span className='text-muted-foreground'>{p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '-')}</span>
                },
                {
                  key: 'status',
                  header: 'Estado',
                  cell: (p) => <ValidationBadge status={p.validation_status} />
                }
              ]}
              data={products ?? []}
              loading={isLoadingProducts}
              rowKey={(p) => p.id!}
              emptyMessage="Este grupo no tiene productos asociados."
              searchPlaceholder="Buscar por título del producto..."
            />
          </TabsContent>
          <TabsContent value="proyectos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Proyectos del Grupo</h3>
              <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Añadir Proyecto</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Nuevo Proyecto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Título del Proyecto</Label>
                      <Input value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de Inicio</Label>
                      <Input value={newProject.start_date} onChange={e => setNewProject({...newProject, start_date: e.target.value})} placeholder="Ej: 2024" />
                    </div>
                    <Button className="w-full" onClick={() => linkProjMutation.mutate()} disabled={!newProject.title || linkProjMutation.isPending}>
                      Guardar Proyecto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Título del Proyecto',
                  searchable: (p) => p.title,
                  className: 'max-w-[400px]',
                  cell: (p) => <span className='block truncate font-medium text-sm'>{p.title}</span>
                },
                {
                  key: 'start_date',
                  header: 'Fecha de Inicio',
                  cell: (p) => <span className='text-muted-foreground'>{p.start_date || '-'}</span>
                },
                {
                  key: 'status',
                  header: 'Estado',
                  cell: (p) => <Badge variant='secondary'>{p.status || 'Activo'}</Badge>
                },
                {
                  key: 'actions',
                  header: '',
                  cell: (p) => (
                    <Button variant="ghost" size="icon" onClick={() => unlinkProjMutation.mutate(p.id!)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )
                }
              ]}
              data={projects ?? []}
              loading={isLoadingProjects}
              rowKey={(p) => p.id!}
              emptyMessage="Este grupo no tiene proyectos asociados."
              searchPlaceholder="Buscar por título de proyecto..."
            />
          </TabsContent>

          <TabsContent value="lineas" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Líneas de Investigación Declaradas</h3>
              <Dialog open={lineOpen} onOpenChange={setLineOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Añadir Línea</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir Línea de Investigación</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Nombre de la Línea</Label>
                      <Input value={newLine} onChange={e => setNewLine(e.target.value)} />
                    </div>
                    <Button className="w-full" onClick={() => linkLineMutation.mutate()} disabled={!newLine || linkLineMutation.isPending}>
                      Guardar Línea
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {isLoadingLines ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : researchLines?.length ? (
              <ul className="space-y-2">
                {researchLines.map((line, idx) => (
                  <li key={idx} className="bg-muted/30 p-3 rounded-lg border border-border/50 flex items-center justify-between text-sm font-medium">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-primary mr-3" />
                      {line}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => unlinkLineMutation.mutate(line)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No se encontraron líneas de investigación.</p>
            )}
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
