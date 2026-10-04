import { useEffect, useMemo, useState } from 'react'
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
  UserPlus,
  Pencil,
  FileDown,
  ClipboardList
} from 'lucide-react'

import {
  getGroup, updateGroup, getGroupMembers, getGroupProducts, getGroupProjects, getGroupResearchLines,
  linkProject, unlinkProject, linkResearchLine, unlinkResearchLine,
  linkMember, unlinkMember, listResearchers,
  linkProduct, unlinkProduct, listProducts,
  getGroupMemberships, updateMember,
  getGroupPlans, createPlan, updatePlan, deletePlan,
  groupReportPdfUrl, getProductCatalogs
} from '@/lib/api'
import type { Researcher } from '@/lib/types'
import type { Group, WorkPlan, Project, Product } from '@/lib/types'
import { parseMincienciasClassification } from '@/lib/utils'
import { MEMBER_ROLES, GRAND_AREAS_OCDE, DEPARTMENTS, citiesOfDepartment } from '@/lib/catalogs'
import { CatalogSelect, CatalogCombobox, toMonthInput } from '@/components/catalog-field'
import { MonthPicker } from '@/components/month-picker'
import { EntityCombobox, type EntityItem } from '@/components/entity-combobox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { ActionTooltip } from '@/components/action-tooltip'
import { ResearcherAvatar } from '@/components/researcher-avatar'

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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DataTable } from '@/components/data-table'
import { isEndorsed, EndorsedBadge } from '@/features/products/endorsed'

function Field({ label, value, mono = false }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  if (!value) return null
  return (
    <div className='flex flex-col gap-1.5'>
      <span className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>{label}</span>
      <span className={`text-sm text-foreground leading-relaxed ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}

export function ValidationBadge({ status }: { status?: string | null }) {
  if (status === 'valid') {
    return (
      <Badge variant='outline' className='border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs'>
        Validado
      </Badge>
    )
  }
  if (status === 'rejected') {
    return (
      <Badge variant='outline' className='border-rose-500/40 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold text-xs'>
        Rechazado
      </Badge>
    )
  }
  return (
    <Badge variant='outline' className='border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-xs'>
      Pendiente
    </Badge>
  )
}

export function GroupDetail({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams({ strict: false }) as any
  const queryClient = useQueryClient()

  const groupId = Number(id)

  // Ventana de observación del informe PDF (Requerimiento 10): presets o rango
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [reportWindow, setReportWindow] = useState('all')
  const [reportStart, setReportStart] = useState('')
  const [reportEnd, setReportEnd] = useState('')
  const reportWindowParams = useMemo(
    () =>
      reportWindow === 'custom'
        ? {
            start_year: Number(reportStart) || undefined,
            end_year: Number(reportEnd) || undefined,
          }
        : reportWindow !== 'all'
          ? { window_years: Number(reportWindow) }
          : undefined,
    [reportWindow, reportStart, reportEnd]
  )

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

  // Catálogo 2024: resolver la tipología por id en la tabla de productos
  const { data: catalogs } = useQuery({
    queryKey: ['product-catalogs'],
    queryFn: getProductCatalogs,
  })
  const subtypeById = useMemo(
    () => new Map((catalogs?.subtypes ?? []).map((s) => [s.id, s])),
    [catalogs]
  )

  const { data: projects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['groups', groupId, 'projects'],
    queryFn: () => getGroupProjects(groupId),
  })

  const { data: researchLines, isLoading: isLoadingLines } = useQuery({
    queryKey: ['groups', groupId, 'researchLines'],
    queryFn: () => getGroupResearchLines(groupId),
  })

  // Planes de trabajo (T-08)
  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['groups', groupId, 'plans'],
    queryFn: () => getGroupPlans(groupId),
  })

  const [formData, setFormData] = useState<Partial<Group>>({})
  const [newProject, setNewProject] = useState({ title: '', start_date: '', status: 'Activo' })
  const [newLine, setNewLine] = useState('')
  const [projectOpen, setProjectOpen] = useState(false)
  const [lineOpen, setLineOpen] = useState(false)

  // Planes de trabajo: diálogo de creación/edición (T-08)
  const emptyPlanForm = { title: '', description: '', start_date: '', end_date: '', status: 'active' }
  const [planOpen, setPlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<WorkPlan | null>(null)
  const [planForm, setPlanForm] = useState(emptyPlanForm)

  const openCreatePlan = () => {
    setEditingPlan(null)
    setPlanForm(emptyPlanForm)
    setPlanOpen(true)
  }
  const openEditPlan = (p: WorkPlan) => {
    setEditingPlan(p)
    setPlanForm({
      title: p.title,
      description: p.description ?? '',
      start_date: toMonthInput(p.start_date),
      end_date: toMonthInput(p.end_date),
      status: p.status ?? 'active',
    })
    setPlanOpen(true)
  }

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
  const linkableResearchers = (researcherResults?.items ?? []).filter(
    (r) => !(members ?? []).some((m) => m.id === r.id)
  )

  // Vinculación de productos (multilista — Req. 6-7)
  const [productOpen, setProductOpen] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)

  const { data: productResults, isFetching: isSearchingProducts } = useQuery({
    queryKey: ['products', 'picker', productSearch],
    queryFn: () => listProducts({ search: productSearch, limit: 8 }),
    enabled: productOpen,
  })
  const linkableProducts = (productResults?.items ?? []).filter(
    (p) => !(products ?? []).some((gp) => gp.id === p.id)
  )

  // Estados para diálogos de confirmación destructiva
  const [unlinkingMember, setUnlinkingMember] = useState<Researcher | null>(null)
  const [unlinkingProduct, setUnlinkingProduct] = useState<Product | null>(null)
  const [unlinkingProject, setUnlinkingProject] = useState<Project | null>(null)
  const [deactivatingPlan, setDeactivatingPlan] = useState<WorkPlan | null>(null)
  const [unlinkingLine, setUnlinkingLine] = useState<string | null>(null)

  const researcherItems = useMemo<EntityItem[]>(() => {
    return linkableResearchers.map((r) => ({
      id: r.id!,
      label: `${r.first_names} ${r.last_names}`,
      subLabel: r.orcid ? `ORCID: ${r.orcid}` : r.institutional_email ?? null,
      badge: r.highest_education_level ?? null,
    }))
  }, [linkableResearchers])

  const productItems = useMemo<EntityItem[]>(() => {
    return linkableProducts.map((p) => ({
      id: p.id!,
      label: p.title,
      subLabel: p.year ? `Año ${p.year}` : (String(p.publication_date ?? '').slice(0, 4) || 's/f'),
      badge: p.validation_status ?? null,
    }))
  }, [linkableProducts])

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
        declared_creation_date: toMonthInput(group.declared_creation_date),
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

  const savePlanMutation = useMutation({
    mutationFn: () =>
      editingPlan
        ? updatePlan(editingPlan.id!, { ...planForm, group_id: groupId })
        : createPlan(groupId, planForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'plans'] })
      toast.success(editingPlan ? 'Plan actualizado' : 'Plan creado correctamente')
      setPlanOpen(false)
      setEditingPlan(null)
      setPlanForm(emptyPlanForm)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al guardar el plan')
  })

  const deletePlanMutation = useMutation({
    mutationFn: (pid: number) => deletePlan(pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'plans'] })
      toast.success('Plan desactivado')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desactivar el plan')
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
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'memberships'] })
      toast.success('Investigador desvinculado del grupo')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al desvincular')
  })

  // Edición de membresía (rol y fechas sin desvincular)
  const { data: memberships } = useQuery({
    queryKey: ['groups', groupId, 'memberships'],
    queryFn: () => getGroupMemberships(groupId),
  })
  const [editingMember, setEditingMember] = useState<Researcher | null>(null)
  const [editRole, setEditRole] = useState('Investigador')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')

  const openEditMember = (r: Researcher) => {
    const ms = (memberships ?? []).find((m) => m.researcher_id === r.id)
    setEditingMember(r)
    setEditRole(ms?.role || 'Investigador')
    setEditStartDate(toMonthInput(ms?.start_date))
    setEditEndDate(toMonthInput(ms?.end_date))
  }

  const updateMemberMutation = useMutation({
    mutationFn: () =>
      updateMember(groupId, editingMember!.id!, {
        role: editRole,
        start_date: editStartDate,
        end_date: editEndDate,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'memberships'] })
      toast.success('Membresía actualizada')
      setEditingMember(null)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al actualizar membresía')
  })

  const linkProductMutation = useMutation({
    mutationFn: () => linkProduct(groupId, selectedProductId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'products'] })
      toast.success('Producto vinculado al grupo')
      setProductOpen(false)
      setSelectedProductId(null)
      setProductSearch('')
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al vincular')
  })

  const unlinkProductMutation = useMutation({
    mutationFn: (pid: number) => unlinkProduct(groupId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'products'] })
      toast.success('Producto desvinculado del grupo')
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

  if (!group) {
    return (
      <Main className={`p-0 sm:p-6 ${!isAdmin ? 'max-w-5xl mx-auto w-full' : ''}`}>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Grupo no encontrado</h2>
          <Button asChild className="mt-4">
            <Link to={isAdmin ? "/admin/groups" : "/groups"}>Volver a Grupos</Link>
          </Button>
        </div>
      </Main>
    )
  }

  const hue = (group.name?.charCodeAt(0) ?? 0) * 45 % 360
  const initial = group.name?.[0]?.toUpperCase() ?? 'G'

  return (
    <>
      {isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <ActionTooltip label='Volver a grupos'>
              <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
                <Link to={isAdmin ? '/admin/groups' : '/groups'}>
                  <ArrowLeft className='h-4 w-4' />
                </Link>
              </Button>
            </ActionTooltip>
            <h1 className='text-sm font-medium'>Perfil del Grupo</h1>
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
                className='h-24 w-24 rounded-2xl border-4 border-card flex items-center justify-center text-4xl font-bold text-white shadow-lg shrink-0'
                style={{ background: `hsl(${hue} 60% 50%)` }}
              >
                {initial}
              </div>
              
              <div className='flex-1 pb-1'>
                <h1 className='text-2xl font-bold line-clamp-1'>{group.name}</h1>
                <div className='flex flex-wrap items-center gap-2 mt-2'>
                  {group.classification && (() => {
                    const classInfo = parseMincienciasClassification(group.classification)
                    return (
                      <ActionTooltip label={group.classification}>
                        <Badge
                          variant='outline'
                          className={`text-xs font-bold px-2.5 py-0.5 cursor-default ${classInfo.badgeVariant}`}
                        >
                          {classInfo.badgeText} · {classInfo.tier}
                        </Badge>
                      </ActionTooltip>
                    )
                  })()}
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
              
              <div className='pb-1 w-full sm:w-auto flex items-center gap-2.5'>
                <ActionTooltip label='Configurar ventana de observación y generar informe PDF oficial'>
                  <Button
                    variant='outline'
                    onClick={() => setPdfDialogOpen(true)}
                    className='rounded-xl shadow-sm border-primary/20 hover:border-primary/40 bg-card/60 backdrop-blur-sm'
                  >
                    <FileDown className='mr-2 h-4 w-4 text-primary' />
                    Informe PDF
                  </Button>
                </ActionTooltip>
                {isAdmin && (
                  <Button
                    onClick={handleSubmit}
                    disabled={mutation.isPending}
                    className='w-full sm:w-auto rounded-xl shadow-md'
                  >
                    <Save className='mr-2 h-4 w-4' />
                    {mutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dialog para Configurar y Generar Informe PDF (Requerimiento 10) */}
        <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
          <DialogContent className='sm:max-w-[520px] rounded-2xl'>
            <DialogHeader>
              <div className='flex items-center gap-2.5 mb-1'>
                <div className='p-2.5 rounded-xl bg-primary/10 text-primary'>
                  <FileDown className='h-5 w-5' />
                </div>
                <div>
                  <DialogTitle className='text-lg font-bold'>Informe Ejecutivo GrupLAC</DialogTitle>
                  <p className='text-xs text-muted-foreground'>Ventana de Observación Temporal</p>
                </div>
              </div>
              <DialogDescription className='text-xs text-muted-foreground pt-1'>
                Genera el reporte institucional en PDF para <span className='font-semibold text-foreground'>{group.name}</span> ({group.external_code}), delimitando la producción científica y proyectos según los lineamientos de Minciencias.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-2'>
              <div className='space-y-2'>
                <Label className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
                  Ventana de observación de la producción
                </Label>
                <Select value={reportWindow} onValueChange={setReportWindow}>
                  <SelectTrigger className='w-full rounded-xl'>
                    <SelectValue placeholder='Seleccione una ventana...' />
                  </SelectTrigger>
                  <SelectContent className='rounded-xl'>
                    <SelectItem value='all'>
                      <div className='py-0.5 text-left'>
                        <span className='font-medium block'>Toda la producción</span>
                        <span className='text-[11px] text-muted-foreground block'>Histórico completo sin restricciones de año</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='2'>
                      <div className='py-0.5 text-left'>
                        <span className='font-medium block'>Últimos 2 años</span>
                        <span className='text-[11px] text-muted-foreground block'>Monitoreo de producción reciente</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='5'>
                      <div className='py-0.5 text-left'>
                        <span className='font-medium block'>Últimos 5 años</span>
                        <span className='text-[11px] text-muted-foreground block'>Ventana estándar de convocatorias Minciencias</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='10'>
                      <div className='py-0.5 text-left'>
                        <span className='font-medium block'>Últimos 10 años</span>
                        <span className='text-[11px] text-muted-foreground block'>Trayectoria científica consolidada</span>
                      </div>
                    </SelectItem>
                    <SelectItem value='custom'>
                      <div className='py-0.5 text-left'>
                        <span className='font-medium block'>Rango de años personalizado…</span>
                        <span className='text-[11px] text-muted-foreground block'>Definir año inicial y final manualmente</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {reportWindow === 'custom' && (
                <div className='p-4 rounded-xl border border-border/60 bg-muted/30 space-y-3 animate-in fade-in-50 duration-200'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold text-foreground'>
                      Definir Rango de Años (Desde – Hasta)
                    </Label>
                    <span className='text-[10px] text-muted-foreground'>Ej. 2018 a 2024</span>
                  </div>
                  <div className='grid grid-cols-2 gap-3'>
                    <div className='space-y-1.5'>
                      <Label htmlFor='report-start' className='text-xs text-muted-foreground'>
                        Año inicial (Desde)
                      </Label>
                      <Input
                        id='report-start'
                        type='number'
                        inputMode='numeric'
                        placeholder='Ej. 2018'
                        min='1970'
                        max={new Date().getFullYear()}
                        value={reportStart}
                        onChange={(e) => setReportStart(e.target.value)}
                        className='rounded-lg'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='report-end' className='text-xs text-muted-foreground'>
                        Año final (Hasta)
                      </Label>
                      <Input
                        id='report-end'
                        type='number'
                        inputMode='numeric'
                        placeholder='Ej. 2024'
                        min='1970'
                        max={new Date().getFullYear()}
                        value={reportEnd}
                        onChange={(e) => setReportEnd(e.target.value)}
                        className='rounded-lg'
                      />
                    </div>
                  </div>
                  {reportStart && reportEnd && Number(reportStart) > Number(reportEnd) && (
                    <p className='text-xs font-medium text-destructive flex items-center gap-1.5'>
                      ⚠️ El año inicial ({reportStart}) no puede ser mayor que el año final ({reportEnd}).
                    </p>
                  )}
                  {(!reportStart || !reportEnd) && (
                    <p className='text-[11px] text-muted-foreground'>
                      * Complete ambos años para filtrar la producción por este rango exacto.
                    </p>
                  )}
                </div>
              )}

              {/* Resumen del alcance del reporte */}
              <div className='p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs space-y-1.5'>
                <div className='font-semibold text-foreground flex items-center justify-between'>
                  <span>Alcance del reporte a descargar:</span>
                  <Badge
                    variant='outline'
                    className={`text-[11px] font-medium ${
                      reportWindow === 'custom' && reportStart && reportEnd && Number(reportStart) > Number(reportEnd)
                        ? 'border-destructive/40 text-destructive bg-destructive/10'
                        : 'border-primary/30 text-primary'
                    }`}
                  >
                    {reportWindow === 'all'
                      ? 'Histórico completo'
                      : reportWindow === 'custom'
                        ? reportStart && reportEnd
                          ? Number(reportStart) > Number(reportEnd)
                            ? 'Rango inválido'
                            : `${reportStart} – ${reportEnd}`
                          : 'Rango pendiente'
                        : `Últimos ${reportWindow} años`}
                  </Badge>
                </div>
                <p className='text-muted-foreground text-[11px] leading-relaxed'>
                  El archivo PDF contendrá la ficha técnica, categorización Minciencias, integrantes y producción científica filtrada por la ventana de observación seleccionada.
                </p>
              </div>
            </div>

            <DialogFooter className='gap-2 sm:gap-0'>
              <Button
                variant='outline'
                onClick={() => setPdfDialogOpen(false)}
                className='rounded-xl'
              >
                Cancelar
              </Button>
              <Button
                disabled={
                  reportWindow === 'custom' &&
                  (!reportStart || !reportEnd || Number(reportStart) > Number(reportEnd))
                }
                onClick={() => {
                  window.open(groupReportPdfUrl(groupId, reportWindowParams), '_blank')
                  setPdfDialogOpen(false)
                }}
                className='rounded-xl shadow-md'
              >
                <FileDown className='mr-2 h-4 w-4' />
                Descargar Informe PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
              value="planes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <ClipboardList className='mr-2 h-4 w-4' /> Planes ({plans?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="lineas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <Info className='mr-2 h-4 w-4' /> Líneas de Inv. ({researchLines?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="focus-visible:outline-none">
            {isAdmin ? (
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
                          {/* Departamento primero: la ciudad se filtra por sus municipios. */}
                          <div className='flex-1 min-w-0'>
                            <CatalogCombobox
                              options={DEPARTMENTS}
                              value={formData.department ?? ''}
                              onChange={(v) => setFormData({ ...formData, department: v })}
                              placeholder='Departamento'
                            />
                          </div>
                          <div className='flex-1 min-w-0'>
                            <CatalogCombobox
                              options={citiesOfDepartment(formData.department ?? '')}
                              value={formData.city ?? ''}
                              onChange={(v) => setFormData({ ...formData, city: v })}
                              placeholder={formData.department ? 'Ciudad' : 'Ciudad (elige depto)'}
                              emptyMessage='Elige un departamento para ver sus municipios, o escribe la ciudad libre.'
                            />
                          </div>
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
                      <CatalogCombobox
                        label="Área de Conocimiento (OCDE)"
                        options={GRAND_AREAS_OCDE}
                        value={formData.knowledge_area ?? ''}
                        onChange={(v) => setFormData({ ...formData, knowledge_area: v })}
                        placeholder='Ej: Ingeniería y Tecnología'
                      />
                      <div className="space-y-2">
                        <Label htmlFor="declared_creation_date">Año / Mes de Formación</Label>
                        <MonthPicker
                          id="declared_creation_date"
                          value={formData.declared_creation_date ?? ''}
                          onChange={(v) => setFormData({ ...formData, declared_creation_date: v })}
                          placeholder='Mes y año...'
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
                  {/* Nota: el Área de Conocimiento se edita en "Información Básica"
                      (antes estaba duplicada aquí y en esa tarjeta). */}
                </div>
              </div>
              
            </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='p-2 bg-blue-500/10 rounded-lg'>
                        <GroupIcon className='h-4 w-4 text-blue-500' />
                      </div>
                      <h3 className="font-semibold text-lg">Información Básica</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Field label="Nombre del Grupo" value={group.name} />
                      <Field label="Sigla" value={group.acronym} />
                      <Field label="Código GrupLAC" value={group.external_code} mono />
                      <Field label="Institución" value={group.institution} />
                      <Field label="Ciudad / Depto" value={[group.city, group.department].filter(Boolean).join(' / ')} />
                      <Field label="Página Web" value={group.website} />
                      <Field label="Año / Mes de Formación" value={group.declared_creation_date} />
                      <Field label="Área de Conocimiento" value={group.knowledge_area} />
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className='flex items-center gap-2 mb-2'>
                    <div className='p-2 bg-purple-500/10 rounded-lg'>
                      <Trophy className='h-4 w-4 text-purple-500' />
                    </div>
                    <h3 className="font-semibold text-lg">Misión y Visión</h3>
                  </div>
                  <div className="space-y-6">
                    <Field label="Misión" value={group.mission} />
                    <Field label="Visión" value={group.vision} />
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="integrantes" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Investigadores vinculados</h3>
              {isAdmin && (
              <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><UserPlus className="w-4 h-4 mr-2"/> Vincular Investigador</Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-md'>
                  <DialogHeader>
                    <DialogTitle>Vincular Investigador al Grupo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <EntityCombobox
                      label="Investigador a vincular"
                      items={researcherItems}
                      value={selectedResearcherId}
                      onChange={(id) => setSelectedResearcherId(id)}
                      onSearchChange={setMemberSearch}
                      isLoading={isSearchingResearchers}
                      placeholder="Seleccionar o buscar investigador..."
                      searchPlaceholder="Nombre, apellido u ORCID..."
                      emptyMessage="No se encontraron investigadores disponibles."
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <CatalogSelect
                        label="Rol en el grupo"
                        options={MEMBER_ROLES}
                        value={memberRole}
                        onChange={setMemberRole}
                        allowClear={false}
                      />
                      <div className="space-y-2">
                        <Label>Fecha de vinculación</Label>
                        <MonthPicker
                          value={memberStartDate}
                          onChange={setMemberStartDate}
                          placeholder="Mes y año..."
                        />
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
              )}
            </div>
            <DataTable
              columns={[
                {
                  key: 'name',
                  header: 'Nombre',
                  searchable: (r: Researcher) => `${r.first_names} ${r.last_names}`,
                  cell: (r: Researcher) => (
                    <div className='flex items-center gap-2.5'>
                      <ResearcherAvatar
                        firstName={r.first_names}
                        lastName={r.last_names}
                        size='sm'
                      />
                      <Link to={isAdmin ? '/admin/researchers/$id' : '/researchers/$id'} params={{ id: String(r.id) }} className="font-medium text-primary hover:underline">
                        {r.first_names} {r.last_names}
                      </Link>
                    </div>
                  )
                },
                {
                  key: 'orcid',
                  header: 'ORCID',
                  cell: (r: Researcher) => <span className='text-muted-foreground font-mono text-xs'>{r.orcid || '-'}</span>
                },
                {
                  key: 'role',
                  header: 'Rol y Periodo',
                  cell: (r: Researcher) => {
                    const ms = (memberships ?? []).find((m) => m.researcher_id === r.id)
                    if (!ms) return '-'
                    const period = ms.start_date
                      ? `${ms.start_date} – ${ms.is_current ? 'Actual' : (ms.end_date || '')}`
                      : ''
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{ms.role}</span>
                        {period && <span className="text-xs text-muted-foreground">{period}</span>}
                      </div>
                    )
                  }
                },
                {
                  key: 'education',
                  header: 'Formación',
                  cell: (r: Researcher) => r.highest_education_level ? <Badge variant="outline">{r.highest_education_level}</Badge> : '-'
                },
                isAdmin ? {
                  key: 'actions',
                  header: '',
                  cell: (r: Researcher) => (
                    <div className="flex items-center gap-1">
                      <ActionTooltip label="Editar membresía">
                        <Button variant="ghost" size="icon" onClick={() => openEditMember(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </ActionTooltip>
                      <ActionTooltip label="Desvincular integrante">
                        <Button variant="ghost" size="icon" onClick={() => setUnlinkingMember(r)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </ActionTooltip>
                    </div>
                  )
                } : null
              ].filter(Boolean) as any}
              data={members ?? []}
              loading={isLoadingMembers}
              rowKey={(r) => r.id!}
              emptyMessage="No hay integrantes vinculados a este grupo."
              searchPlaceholder="Buscar por nombre..."
            />

            {/* Diálogo: editar membresía */}
            <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Membresía</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <p className="text-sm text-muted-foreground">
                    {editingMember ? `${editingMember.first_names} ${editingMember.last_names}` : ''}
                  </p>
                  <CatalogSelect
                    label="Rol en el grupo"
                    options={MEMBER_ROLES}
                    value={editRole}
                    onChange={setEditRole}
                    allowClear={false}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fecha de vinculación</Label>
                      <MonthPicker
                        value={editStartDate}
                        onChange={setEditStartDate}
                        placeholder="Mes y año..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha de retiro</Label>
                      <MonthPicker
                        value={editEndDate}
                        onChange={setEditEndDate}
                        placeholder="Vigente (sin retiro)"
                        allowClear
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => updateMemberMutation.mutate()}
                    disabled={updateMemberMutation.isPending}
                  >
                    {updateMemberMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="productos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Productos del Grupo</h3>
              {isAdmin && (
              <Dialog open={productOpen} onOpenChange={setProductOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="w-4 h-4 mr-2"/> Vincular Producto</Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-md'>
                  <DialogHeader>
                    <DialogTitle>Vincular Producto al Grupo</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <EntityCombobox
                      label="Producto a vincular"
                      items={productItems}
                      value={selectedProductId}
                      onChange={(id) => setSelectedProductId(id)}
                      onSearchChange={setProductSearch}
                      isLoading={isSearchingProducts}
                      placeholder="Seleccionar o buscar producto..."
                      searchPlaceholder="Título del producto..."
                      emptyMessage="No se encontraron productos disponibles."
                    />
                    <Button
                      className="w-full"
                      onClick={() => linkProductMutation.mutate()}
                      disabled={!selectedProductId || linkProductMutation.isPending}
                    >
                      Vincular
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Título del Producto',
                  searchable: (p: Product) => p.title,
                  className: 'max-w-[400px]',
                  cell: (p: Product) => (
                    <div className='flex items-center gap-2'>
                      <Link
                        to={isAdmin ? '/admin/products/$id' : '/products/$id'}
                        params={{ id: String(p.id) }}
                        className='block truncate font-medium text-sm text-primary hover:underline'
                      >
                        {p.title}
                      </Link>
                      {isEndorsed(p) && <EndorsedBadge />}
                    </div>
                  )
                },
                {
                  key: 'year',
                  header: 'Año',
                  cell: (p: Product) => <span className='text-muted-foreground'>{p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '-')}</span>
                },
                {
                  key: 'subtype',
                  header: 'Tipología 2024',
                  cell: (p: Product) => {
                    const s = p.subtype_id ? subtypeById.get(p.subtype_id) : undefined
                    return s ? (
                      <Badge variant='outline' className='font-mono text-xs' title={s.name}>
                        {s.code ?? s.name}
                      </Badge>
                    ) : (
                      <span className='text-xs text-muted-foreground'>sin clasificar</span>
                    )
                  }
                },
                {
                  key: 'status',
                  header: 'Estado',
                  cell: (p: Product) => <ValidationBadge status={p.validation_status} />
                },
                isAdmin ? {
                  key: 'actions',
                  header: '',
                  cell: (p: Product) => (
                    <ActionTooltip label="Desvincular producto del grupo">
                      <Button variant="ghost" size="icon" onClick={() => setUnlinkingProduct(p)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </ActionTooltip>
                  )
                } : null
              ].filter(Boolean) as any}
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
              {isAdmin && (
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
                      <Label>Año de Inicio</Label>
                      <Input type="number" min={1900} max={2100} value={newProject.start_date} onChange={e => setNewProject({...newProject, start_date: e.target.value})} placeholder="Ej: 2024" />
                    </div>
                    <Button className="w-full" onClick={() => linkProjMutation.mutate()} disabled={!newProject.title || linkProjMutation.isPending}>
                      Guardar Proyecto
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Título del Proyecto',
                  searchable: (p: Project) => p.title,
                  className: 'max-w-[400px]',
                  cell: (p: Project) => (
                    <Link
                      to={isAdmin ? '/admin/projects/$id' : '/projects/$id'}
                      params={{ id: String(p.id) }}
                      className='block truncate font-medium text-sm text-primary hover:underline'
                    >
                      {p.title}
                    </Link>
                  )
                },
                {
                  key: 'start_date',
                  header: 'Fecha de Inicio',
                  cell: (p: Project) => <span className='text-muted-foreground'>{p.start_date || '-'}</span>
                },
                {
                  key: 'status',
                  header: 'Estado',
                  cell: (p: Project) => <Badge variant='secondary'>{p.status || 'Activo'}</Badge>
                },
                isAdmin ? {
                  key: 'actions',
                  header: '',
                  cell: (p: Project) => (
                    <ActionTooltip label="Desvincular proyecto del grupo">
                      <Button variant="ghost" size="icon" onClick={() => setUnlinkingProject(p)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </ActionTooltip>
                  )
                } : null
              ].filter(Boolean) as any}
              data={projects ?? []}
              loading={isLoadingProjects}
              rowKey={(p) => p.id!}
              emptyMessage="Este grupo no tiene proyectos asociados."
              searchPlaceholder="Buscar por título de proyecto..."
            />
          </TabsContent>

          <TabsContent value="planes" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Planes de Trabajo del Grupo</h3>
              {isAdmin && (
              <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openCreatePlan}><Plus className="w-4 h-4 mr-2"/> Añadir Plan</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Editar Plan de Trabajo' : 'Añadir Plan de Trabajo'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Título del Plan</Label>
                      <Input value={planForm.title} onChange={e => setPlanForm({...planForm, title: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Textarea
                        value={planForm.description}
                        onChange={e => setPlanForm({...planForm, description: e.target.value})}
                        rows={3}
                        className='bg-muted/30 focus-visible:bg-transparent rounded-xl resize-none'
                        placeholder="Objetivos y actividades del plan..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha de Inicio</Label>
                        <MonthPicker
                          value={planForm.start_date}
                          onChange={(v) => setPlanForm({ ...planForm, start_date: v })}
                          placeholder="Mes de inicio..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha de Fin</Label>
                        <MonthPicker
                          value={planForm.end_date}
                          onChange={(v) => setPlanForm({ ...planForm, end_date: v })}
                          placeholder="Mes de fin..."
                          allowClear
                        />
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => savePlanMutation.mutate()} disabled={!planForm.title || savePlanMutation.isPending}>
                      {savePlanMutation.isPending ? 'Guardando...' : editingPlan ? 'Guardar Cambios' : 'Guardar Plan'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
            <DataTable
              columns={[
                {
                  key: 'title',
                  header: 'Título del Plan',
                  searchable: (p: WorkPlan) => p.title,
                  className: 'max-w-[300px]',
                  cell: (p: WorkPlan) => <span className='block truncate font-medium text-sm'>{p.title}</span>
                },
                {
                  key: 'period',
                  header: 'Periodo',
                  cell: (p: WorkPlan) => (
                    <span className='text-muted-foreground'>
                      {p.start_date || '—'} → {p.end_date || '—'}
                    </span>
                  )
                },
                {
                  key: 'status',
                  header: 'Estado',
                  cell: (p: WorkPlan) => p.status === 'active'
                    ? <Badge className='bg-green-600 text-white hover:bg-green-700'>Activo</Badge>
                    : <Badge variant='secondary'>{p.status || 'Inactivo'}</Badge>
                },
                isAdmin ? {
                  key: 'actions',
                  header: '',
                  cell: (p: WorkPlan) => (
                    <div className="flex items-center gap-1">
                      <ActionTooltip label="Editar plan">
                        <Button variant="ghost" size="icon" onClick={() => openEditPlan(p)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </ActionTooltip>
                      {p.status === 'active' && (
                        <ActionTooltip label="Desactivar plan">
                          <Button variant="ghost" size="icon" onClick={() => setDeactivatingPlan(p)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </ActionTooltip>
                      )}
                    </div>
                  )
                } : null
              ].filter(Boolean) as any}
              data={plans ?? []}
              loading={isLoadingPlans}
              rowKey={(p) => p.id!}
              emptyMessage="Este grupo no tiene planes de trabajo registrados."
              searchPlaceholder="Buscar por título del plan..."
            />
          </TabsContent>

          <TabsContent value="lineas" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Líneas de Investigación Declaradas</h3>
              {isAdmin && (
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
              )}
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
                    {isAdmin && (
                      <ActionTooltip label="Eliminar línea de investigación">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUnlinkingLine(line)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </ActionTooltip>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">No se encontraron líneas de investigación.</p>
            )}
          </TabsContent>
        </Tabs>

        {/* Confirmación: desvincular integrante */}
        <ConfirmDialog
          open={unlinkingMember !== null}
          onOpenChange={(open) => !open && setUnlinkingMember(null)}
          title="¿Desvincular integrante?"
          desc={`¿Estás seguro de que deseas desvincular a «${unlinkingMember?.first_names ?? ''} ${unlinkingMember?.last_names ?? ''}» de este grupo? Esta acción se puede revertir volviendo a vincular al investigador.`}
          confirmText="Desvincular"
          cancelBtnText="Cancelar"
          destructive
          isLoading={unlinkMemberMutation.isPending}
          handleConfirm={() => {
            if (unlinkingMember?.id != null) {
              unlinkMemberMutation.mutate(unlinkingMember.id, {
                onSettled: () => setUnlinkingMember(null),
              })
            }
          }}
        />

        {/* Confirmación: desvincular producto */}
        <ConfirmDialog
          open={unlinkingProduct !== null}
          onOpenChange={(open) => !open && setUnlinkingProduct(null)}
          title="¿Desvincular producto?"
          desc={`¿Estás seguro de que deseas desvincular el producto «${unlinkingProduct?.title ?? ''}» de este grupo?`}
          confirmText="Desvincular"
          cancelBtnText="Cancelar"
          destructive
          isLoading={unlinkProductMutation.isPending}
          handleConfirm={() => {
            if (unlinkingProduct?.id != null) {
              unlinkProductMutation.mutate(unlinkingProduct.id, {
                onSettled: () => setUnlinkingProduct(null),
              })
            }
          }}
        />

        {/* Confirmación: desvincular proyecto */}
        <ConfirmDialog
          open={unlinkingProject !== null}
          onOpenChange={(open) => !open && setUnlinkingProject(null)}
          title="¿Desvincular proyecto?"
          desc={`¿Estás seguro de que deseas desvincular el proyecto «${unlinkingProject?.title ?? ''}» de este grupo?`}
          confirmText="Desvincular"
          cancelBtnText="Cancelar"
          destructive
          isLoading={unlinkProjMutation.isPending}
          handleConfirm={() => {
            if (unlinkingProject?.id != null) {
              unlinkProjMutation.mutate(unlinkingProject.id, {
                onSettled: () => setUnlinkingProject(null),
              })
            }
          }}
        />

        {/* Confirmación: desactivar plan de trabajo */}
        <ConfirmDialog
          open={deactivatingPlan !== null}
          onOpenChange={(open) => !open && setDeactivatingPlan(null)}
          title="¿Desactivar plan de trabajo?"
          desc={`¿Estás seguro de que deseas desactivar el plan «${deactivatingPlan?.title ?? ''}»? Su estado pasará a inactivo.`}
          confirmText="Desactivar"
          cancelBtnText="Cancelar"
          destructive
          isLoading={deletePlanMutation.isPending}
          handleConfirm={() => {
            if (deactivatingPlan?.id != null) {
              deletePlanMutation.mutate(deactivatingPlan.id, {
                onSettled: () => setDeactivatingPlan(null),
              })
            }
          }}
        />

        {/* Confirmación: eliminar línea de investigación */}
        <ConfirmDialog
          open={unlinkingLine !== null}
          onOpenChange={(open) => !open && setUnlinkingLine(null)}
          title="¿Eliminar línea de investigación?"
          desc={`¿Estás seguro de que deseas eliminar la línea de investigación «${unlinkingLine ?? ''}» de este grupo?`}
          confirmText="Eliminar"
          cancelBtnText="Cancelar"
          destructive
          isLoading={unlinkLineMutation.isPending}
          handleConfirm={() => {
            if (unlinkingLine) {
              unlinkLineMutation.mutate(unlinkingLine, {
                onSettled: () => setUnlinkingLine(null),
              })
            }
          }}
        />
      </Main>
    </>
  )
}
