'use client'

// Banner de mudança de UF — Wave 10 Etapa 4.
//
// LOGGED-AREA-VISION §5.2: aparece quando o usuário acompanha N
// parlamentares fora da sua UF atual. Sem persistência server-side
// (decisão Etapa 4 — sem coluna `uf_change_acked_at`); usa useState
// local para dismiss na sessão. Reaparece em refresh; some
// naturalmente quando o usuário desacompanha os divergentes via modal
// ou muda UF.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { useState } from 'react'

import { ModalRevisarUfAntiga } from './modal-revisar-uf-antiga'

interface Props {
  newUf: string
  followsForeign: {
    id: string
    nome: string
    partidoSigla: string
    uf: string
    urlFoto: string | null
  }[]
}

export function BannerMudancaUf({ newUf, followsForeign }: Props) {
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  if (dismissed || followsForeign.length === 0) return null

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 p-4">
        <p className="text-fg-primary text-sm">
          Você está em <span className="font-medium">{newUf}</span>. Seus{' '}
          <span className="font-medium">{followsForeign.length}</span>{' '}
          {followsForeign.length === 1 ? 'acompanhado' : 'acompanhados'} de
          outras UFs continuam ativos — quer revisar?
        </p>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setDismissed(true)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Mais tarde
          </Button>
          <Button onClick={() => setModalOpen(true)} size="sm" type="button">
            Revisar
          </Button>
        </div>
      </div>

      <ModalRevisarUfAntiga
        followsForeign={followsForeign}
        newUf={newUf}
        onOpenChange={setModalOpen}
        open={modalOpen}
      />
    </>
  )
}
