import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { getGroup, getGroupMembers, getGroupProducts } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function GroupDetail() {
  const { groupId } = useParams({ from: '/_authenticated/groups/$groupId' })
  const id = Number(groupId)

  const group = useQuery({ queryKey: ['groups', id], queryFn: () => getGroup(id) })
  const members = useQuery({ queryKey: ['groups', id, 'members'], queryFn: () => getGroupMembers(id) })
  const products = useQuery({ queryKey: ['groups', id, 'products'], queryFn: () => getGroupProducts(id) })

  return (
    <>
      <Header>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {group.isLoading ? (
          <Skeleton className='mb-4 h-20 w-full' />
        ) : group.data ? (
          <div className='mb-4'>
            <h1 className='text-2xl font-bold tracking-tight'>{group.data.name}</h1>
            <p className='text-muted-foreground'>
              {group.data.institution ?? '—'} · <span className='font-mono text-xs'>{group.data.external_code}</span>
              {group.data.classification && <> · <Badge variant='outline'>{group.data.classification}</Badge></>}
            </p>
          </div>
        ) : (
          <p className='text-muted-foreground'>Grupo no encontrado.</p>
        )}

        <Tabs defaultValue='members' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='members'>Integrantes ({members.data?.length ?? 0})</TabsTrigger>
            <TabsTrigger value='products'>Productos ({products.data?.length ?? 0})</TabsTrigger>
          </TabsList>

          <TabsContent value='members'>
            <Card>
              <CardHeader>
                <CardTitle>Integrantes</CardTitle>
                <CardDescription>Multilista grupo ↔ investigadores.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Apellidos</TableHead>
                      <TableHead>ORCID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.isLoading && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton className='h-5 w-full' />
                        </TableCell>
                      </TableRow>
                    )}
                    {(members.data ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className='font-medium'>{r.first_names}</TableCell>
                        <TableCell>{r.last_names}</TableCell>
                        <TableCell className='font-mono text-xs'>{r.orcid ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='products'>
            <Card>
              <CardHeader>
                <CardTitle>Productos</CardTitle>
                <CardDescription>Multilista grupo ↔ productos.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Validación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.isLoading && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Skeleton className='h-5 w-full' />
                        </TableCell>
                      </TableRow>
                    )}
                    {(products.data ?? []).slice(0, 100).map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className='max-w-[520px] truncate font-medium'>{p.title}</TableCell>
                        <TableCell>{p.year ?? (String(p.publication_date ?? '').slice(0, 4) || '—')}</TableCell>
                        <TableCell>
                          <ValidationBadge status={p.validation_status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

export function ValidationBadge({ status }: { status?: string | null }) {
  if (status === 'valid') return <Badge className='bg-green-600'>Validado</Badge>
  if (status === 'rejected') return <Badge variant='destructive'>Rechazado</Badge>
  return <Badge variant='secondary'>Pendiente</Badge>
}
