import { useEffect, useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  User as UserIcon,
  BookOpen,
  Users,
  BarChart2,
} from 'lucide-react'

import {
  getResearcher,
  updateResearcher,
  getResearcherProducts,
  getResearcherGroups,
} from '@/lib/api'
import type { Researcher } from '@/lib/types'
import { ActionTooltip } from '@/components/action-tooltip'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

import {
  ResearcherProfileHeader,
  ResearcherProfileTab,
  ResearcherProductsTab,
  ResearcherGroupsTab,
  ResearcherAnalyticsTab,
} from './components'

export function ResearcherDetail({ isAdmin = false }: { isAdmin?: boolean }) {
  const { id } = useParams({ strict: false }) as { id: string }
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

  return (
    <>
      {isAdmin && (
        <Header>
          <div className='flex items-center gap-4'>
            <ActionTooltip label='Volver a investigadores'>
              <Button variant='ghost' size='icon' asChild className='h-8 w-8 rounded-full'>
                <Link to={isAdmin ? '/admin/researchers' : '/researchers'}>
                  <ArrowLeft className='h-4 w-4' />
                </Link>
              </Button>
            </ActionTooltip>
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
        <ResearcherProfileHeader
          researcher={researcher}
          isAdmin={isAdmin}
          onSave={() => handleSubmit()}
          isSaving={mutation.isPending}
        />

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
            <TabsTrigger
              value="estadisticas"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full"
            >
              <BarChart2 className='mr-2 h-4 w-4' /> Estadísticas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="focus-visible:outline-none">
            <ResearcherProfileTab
              researcher={researcher}
              formData={formData}
              setFormData={setFormData}
              isAdmin={isAdmin}
              onSubmit={handleSubmit}
            />
          </TabsContent>

          <TabsContent value="productos" className="focus-visible:outline-none">
            <ResearcherProductsTab
              researcherId={researcherId}
              isAdmin={isAdmin}
              products={products}
              isLoadingProducts={isLoadingProducts}
            />
          </TabsContent>

          <TabsContent value="grupos" className="focus-visible:outline-none">
            <ResearcherGroupsTab
              researcherId={researcherId}
              isAdmin={isAdmin}
              groups={groups}
              isLoadingGroups={isLoadingGroups}
            />
          </TabsContent>

          <TabsContent value="estadisticas" className="focus-visible:outline-none space-y-6">
            <ResearcherAnalyticsTab
              researcherId={researcherId}
              isAdmin={isAdmin}
            />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}
