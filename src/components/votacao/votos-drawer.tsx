'use client'

import { Button } from '@fabio.caffarello/react-design-system/server'
import { Users } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { ExportCsvLink } from '@/components/export-csv-link'
import { VotosIndividuais } from '@/components/votacao/votos-individuais'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
} from '@/design-system/primitives/rds-drawer'
import type { VotoIndividual } from '@/lib/queries/votacoes'

interface Props {
  votos: VotoIndividual[]
  /** Href de export CSV de todos os votos. */
  exportHref: string
  /** Gating server-side (canExport): anônimo não recebe o link. */
  canExport: boolean
}

const TITLE_ID = 'votos-drawer-title'

// Seeds de deep-link válidos. Espelha TIPOS_VOTO de @/lib/queries/votacoes, mas
// inline para não arrastar o módulo `db` (server-only) ao bundle do cliente.
const VOTOS_VALIDOS = ['SIM', 'NAO', 'ABSTENCAO', 'AUSENTE', 'OBSTRUCAO']

// Drawer dos votos individuais (~513 deputados / ~81 senadores). Antes a lista
// inteira montava inline no perfil, inflando o DOM; agora um CTA abre o drawer
// e os <li> só montam sob demanda (ganho de render, não de fetch — o payload já
// vinha). Filtro client-side por estado local (D7/ADR-052); deep-link
// /votacoes/[id]?voto=X é lido uma vez no mount para semear filtro + abrir.
export function VotosDrawer({ votos, exportHref, canExport }: Props) {
  const searchParams = useSearchParams()
  const seed = searchParams.get('voto') ?? ''
  const seedValido = seed !== '' && VOTOS_VALIDOS.includes(seed) ? seed : ''

  const [open, setOpen] = useState(() => seedValido !== '')

  const total = votos.length

  return (
    <div className="space-y-2">
      <Button
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        variant="outline"
      >
        <Users className="h-4 w-4" aria-hidden />
        Ver todos os {total} {total === 1 ? 'voto' : 'votos'}
      </Button>

      <Drawer onOpenChange={setOpen} open={open} position="right" size="lg">
        <DrawerContent aria-labelledby={TITLE_ID}>
          <DrawerHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2
                className="font-semibold text-base text-fg-primary"
                id={TITLE_ID}
              >
                Votos individuais
                <span className="ml-2 font-normal text-fg-tertiary text-sm tabular-nums">
                  {total}
                </span>
              </h2>
              {canExport ? (
                <ExportCsvLink href={exportHref} label="Exportar todos (CSV)" />
              ) : null}
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {open ? (
              <VotosIndividuais initialFiltro={seedValido} votos={votos} />
            ) : null}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
