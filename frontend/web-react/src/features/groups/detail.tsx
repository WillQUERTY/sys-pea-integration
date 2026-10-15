import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  UserCircle2,
  Building2,
  Info,
  ClipboardList,
  TrendingUp,
} from 'lucide-react'

import {
  getGroup,
  updateGroup,
  getGroupMembers,
  getGroupProducts,
  getGroupProjects,
  getGroupPlans,
  getGroupResearchLines,
} from '@/lib/api'
import type { Group } from '@/lib/types'
import { GroupsRadarComparison } from '@/components/charts'
import { ActionTooltip } from '@/components/action-tooltip'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

import {
  GroupProfileHeader,
  GroupExportDialog,
  GroupProfileTab,
  GroupMembersTab,
  GroupProductsTab,
  GroupAnalyticsTab,
  GroupProjectsTab,
  GroupPlansTab,
  GroupLinesTab,
} from './components'

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

  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [compareDialogOpen, setCompareDialogOpen] = useState(false)

  const { data: group, isLoading } = useQuery({
    queryKey: ['groups', groupId],
    queryFn: () => getGroup(groupId),
  })

  const { data: members } = useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: () => getGroupMembers(groupId),
  })

  const { data: products } = useQuery({
    queryKey: ['groups', groupId, 'products'],
    queryFn: () => getGroupProducts(groupId),
  })

  const { data: projects } = useQuery({
    queryKey: ['groups', groupId, 'projects'],
    queryFn: () => getGroupProjects(groupId),
  })

  const { data: plans } = useQuery({
    queryKey: ['groups', groupId, 'plans'],
    queryFn: () => getGroupPlans(groupId),
  })

  const { data: researchLines } = useQuery({
    queryKey: ['groups', groupId, 'lines'],
    queryFn: () => getGroupResearchLines(groupId),
  })

  const [formData, setFormData] = useState<Partial<Group>>({})

  useEffect(() => {
    if (group) {
      setFormData(group)
    }
  }, [group])

  const mutation = useMutation({
    mutationFn: (data: Partial<Group>) => updateGroup(groupId, data),
    onSuccess: (updatedGroup) => {
      queryClient.setQueryData(['groups', groupId], updatedGroup)
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Grupo actualizado correctamente')
    },
    onError: (err: any) => {
      toast.error('Error al actualizar el grupo: ' + (err.message || 'Error desconocido'))
    },
  })

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
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
        <GroupProfileHeader
          group={group}
          isAdmin={isAdmin}
          onOpenExport={() => setPdfDialogOpen(true)}
          onSave={() => handleSubmit()}
          isSaving={mutation.isPending}
        />

        {/* Centro de Exportación y Dossier de Gestión */}
        <GroupExportDialog
          open={pdfDialogOpen}
          onOpenChange={setPdfDialogOpen}
          groupId={groupId}
          groupName={group.name}
          groupExternalCode={group.external_code}
        />

        {/* Tabs */}
        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="bg-transparent h-11 sm:h-12 p-0 border-b border-border/50 w-full justify-start rounded-none overflow-x-auto">
            <TabsTrigger 
              value="perfil" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <Info className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Información General
            </TabsTrigger>
            <TabsTrigger 
              value="integrantes" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <UserCircle2 className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Integrantes ({members?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger 
              value="productos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <BookOpen className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Productos ({products?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger 
              value="estadisticas" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <TrendingUp className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Estadísticas e Impacto
            </TabsTrigger>
            <TabsTrigger 
              value="proyectos" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <Building2 className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Proyectos ({projects?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="planes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <ClipboardList className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Planes ({plans?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger
              value="lineas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-5 h-full text-xs sm:text-sm whitespace-nowrap"
            >
              <Info className='mr-1.5 sm:mr-2 h-4 w-4 shrink-0' /> Líneas ({researchLines?.length ?? 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="focus-visible:outline-none">
            <GroupProfileTab
              group={group}
              formData={formData}
              setFormData={setFormData}
              isAdmin={isAdmin}
              onSubmit={handleSubmit}
            />
          </TabsContent>

          <TabsContent value="integrantes" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <GroupMembersTab
              groupId={groupId}
              isAdmin={isAdmin}
              members={members}
            />
          </TabsContent>

          <TabsContent value="productos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <GroupProductsTab
              groupId={groupId}
              isAdmin={isAdmin}
              products={products}
            />
          </TabsContent>

          <TabsContent value="estadisticas" className="focus-visible:outline-none space-y-6">
            <GroupAnalyticsTab
              groupId={groupId}
              groupName={group.name}
              onOpenExport={() => setPdfDialogOpen(true)}
              onOpenCompare={() => setCompareDialogOpen(true)}
            />
          </TabsContent>

          <TabsContent value="proyectos" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <GroupProjectsTab
              groupId={groupId}
              isAdmin={isAdmin}
              projects={projects}
            />
          </TabsContent>

          <TabsContent value="planes" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <GroupPlansTab
              groupId={groupId}
              isAdmin={isAdmin}
              plans={plans}
            />
          </TabsContent>

          <TabsContent value="lineas" className="focus-visible:outline-none bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
            <GroupLinesTab
              groupId={groupId}
              isAdmin={isAdmin}
              researchLines={researchLines}
            />
          </TabsContent>
        </Tabs>

        {/* Modal dedicado de Benchmarking Inter-grupal */}
        <Dialog open={compareDialogOpen} onOpenChange={setCompareDialogOpen}>
          <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[92vh] overflow-y-auto p-2 sm:p-6">
            <DialogHeader className="sr-only">
              <DialogTitle>Benchmarking Inter-grupal</DialogTitle>
            </DialogHeader>
            <GroupsRadarComparison
              initialGroupIds={[groupId, ...(groupId === 10 ? [35] : [10])]}
              showGroupSelector={true}
            />
          </DialogContent>
        </Dialog>
      </Main>
    </>
  )
}
