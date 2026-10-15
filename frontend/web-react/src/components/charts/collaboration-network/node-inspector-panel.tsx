import { Link } from '@tanstack/react-router'
import { ExternalLink, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { NetworkNode } from '@/lib/api'
import { getNodeColor } from './layout'

interface CollaboratorItem {
  node: NetworkNode
  weight: number
}

interface NodeInspectorPanelProps {
  activeNode: NetworkNode | null
  collaborators: CollaboratorItem[]
  onSelectNode: (id: number | null) => void
}

export function NodeInspectorPanel({
  activeNode,
  collaborators,
  onSelectNode,
}: NodeInspectorPanelProps) {
  return (
    <div className='w-full xl:w-80 border-t xl:border-t-0 xl:border-l border-border/60 bg-card p-4 flex flex-col justify-between'>
      {activeNode ? (
        <div className='space-y-4'>
          <div>
            <div className='flex items-start justify-between gap-2'>
              <Badge
                variant='secondary'
                className='text-[10px] py-0.5 font-medium'
                style={{
                  backgroundColor: `${getNodeColor(activeNode.education)}20`,
                  color: getNodeColor(activeNode.education),
                  borderColor: `${getNodeColor(activeNode.education)}40`,
                }}
              >
                {activeNode.education}
              </Badge>
              <Button
                variant='ghost'
                size='sm'
                className='h-5 text-[10px] px-1 text-muted-foreground'
                onClick={() => onSelectNode(null)}
              >
                Cerrar foco
              </Button>
            </div>
            <h4 className='text-sm font-bold mt-1 text-foreground'>{activeNode.name}</h4>
            <p className='text-xs text-muted-foreground'>{activeNode.role}</p>
          </div>

          <div className='grid grid-cols-2 gap-2 text-xs'>
            <div className='p-2.5 rounded-lg bg-muted/30 border border-border/50'>
              <div className='text-muted-foreground text-[10px]'>En este Grupo</div>
              <div className='text-base font-bold text-foreground mt-0.5'>
                {activeNode.products_count}
                <span className='text-[10px] font-normal text-muted-foreground ml-1'>prod.</span>
              </div>
            </div>
            <div className='p-2.5 rounded-lg bg-muted/30 border border-border/50'>
              <div className='text-muted-foreground text-[10px]'>Coautores Directos</div>
              <div className='text-base font-bold text-primary mt-0.5'>
                {collaborators.length}
                <span className='text-[10px] font-normal text-muted-foreground ml-1'>pares</span>
              </div>
            </div>
          </div>

          <div>
            <div className='text-xs font-semibold text-foreground flex items-center justify-between mb-2'>
              <span>Colaboradores Directos</span>
              <Badge variant='outline' className='text-[10px] py-0 px-1'>
                {collaborators.length}
              </Badge>
            </div>
            {collaborators.length > 0 ? (
              <div className='space-y-1.5 max-h-[220px] overflow-y-auto pr-1'>
                {collaborators.map(({ node: collab, weight }) => (
                  <div
                    key={collab.id}
                    onClick={() => onSelectNode(collab.id)}
                    className='flex items-center justify-between p-1.5 rounded-md hover:bg-muted/60 transition-colors text-xs cursor-pointer border border-transparent hover:border-border/60'
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <span
                        className='h-2 w-2 rounded-full shrink-0'
                        style={{ backgroundColor: getNodeColor(collab.education) }}
                      />
                      <span className='truncate font-medium text-[11px]'>{collab.name}</span>
                    </div>
                    <Badge
                      variant='secondary'
                      className='text-[10px] py-0 px-1.5 shrink-0 bg-primary/10 text-primary font-bold'
                    >
                      {weight} {weight === 1 ? 'doc' : 'docs'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className='p-3 text-center text-xs text-muted-foreground bg-muted/20 rounded-md'>
                No registra publicaciones conjuntas con otros integrantes actuales del grupo.
              </div>
            )}
          </div>

          <div className='pt-2'>
            <Button variant='outline' size='sm' className='w-full text-xs h-8 gap-1.5' asChild>
              <Link to='/admin/researchers/$id' params={{ id: String(activeNode.id) }}>
                <ExternalLink className='h-3.5 w-3.5' /> Ver Perfil Analítico Completo
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className='h-full flex flex-col items-center justify-center p-6 text-center text-muted-foreground space-y-3'>
          <div className='h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center'>
            <Sparkles className='h-5 w-5' />
          </div>
          <div className='space-y-1'>
            <p className='text-xs font-semibold text-foreground'>Explora la Red Científica</p>
            <p className='text-[11px] text-muted-foreground leading-relaxed'>
              Haz clic o sitúa el cursor sobre cualquier nodo para examinar sus lazos de coautoría.
              Usa la rueda para acercar y arrastra para moverte por el grafo.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
