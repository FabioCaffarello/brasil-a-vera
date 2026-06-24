import { DataBadge } from '@fabio.caffarello/react-design-system/server'
import { Award } from 'lucide-react'

import { EmptyState } from '@/components/ui/empty-state'
import type {
  FrenteParlamentarItem,
  LiderancaAtiva,
} from '@/lib/queries/liderancas'

// Rótulo legível por tipo de cargo. Mantido em código (não banco) pois é
// vocabulário controlado pelo mapper de ingestão.
const TIPO_LABEL: Record<string, string> = {
  LIDER_PARTIDO: 'Líder do Partido',
  VICE_LIDER_PARTIDO: 'Vice-Líder do Partido',
  LIDER_GOVERNO: 'Líder do Governo',
  VICE_LIDER_GOVERNO: 'Vice-Líder do Governo',
  LIDER_OPOSICAO: 'Líder da Oposição',
  VICE_LIDER_OPOSICAO: 'Vice-Líder da Oposição',
  LIDER_MINORIA: 'Líder da Minoria',
  LIDER_MAIORIA: 'Líder da Maioria',
  LIDER_BLOCO: 'Líder de Bloco',
  PRESIDENTE_MESA: 'Presidente da Mesa Diretora',
  VICE_PRESIDENTE_MESA: 'Vice-Presidente da Mesa Diretora',
  SECRETARIO_MESA: 'Secretário da Mesa Diretora',
  SUPLENTE_MESA: 'Suplente de Secretário',
}

// Cargos institucionais recebem tone 'dataviz' para destaque visual —
// indicam posição de poder dentro do Congresso, não só da bancada.
const TIPOS_INSTITUCIONAIS = new Set([
  'LIDER_GOVERNO',
  'VICE_LIDER_GOVERNO',
  'LIDER_OPOSICAO',
  'VICE_LIDER_OPOSICAO',
  'LIDER_MINORIA',
  'LIDER_MAIORIA',
  'PRESIDENTE_MESA',
  'VICE_PRESIDENTE_MESA',
])

interface Props {
  liderancas: LiderancaAtiva[]
  frentes: FrenteParlamentarItem[]
}

export function LiderancasCargos({ liderancas, frentes }: Props) {
  if (liderancas.length === 0 && frentes.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="Sem cargo de liderança ou frente registrados nesta legislatura."
      />
    )
  }

  return (
    <div className="space-y-6">
      {liderancas.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-fg-primary text-sm">
            Posições de liderança
          </h4>
          <ul className="space-y-2">
            {liderancas.map((l) => (
              <li
                className="flex flex-wrap items-center gap-2 rounded-lg border border-line-default p-3"
                key={`${l.tipo}-${l.entidade}-${l.casa}`}
              >
                <DataBadge
                  label={TIPO_LABEL[l.tipo] ?? l.tipo}
                  tone={
                    TIPOS_INSTITUCIONAIS.has(l.tipo) ? 'dataviz' : 'neutral'
                  }
                />
                <span className="font-medium text-fg-primary text-sm">
                  {l.entidade}
                </span>
                <span className="ml-auto text-fg-tertiary text-xs uppercase tracking-wide">
                  {l.casa === 'CAMARA' ? 'Câmara' : 'Senado'}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-fg-tertiary text-xs">
            Cargo de liderança é designação interna da Casa — não implica
            posição ideológica do parlamentar.
          </p>
        </div>
      )}

      {frentes.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-fg-primary text-sm">
            Frentes parlamentares
          </h4>
          <ul className="space-y-1.5">
            {frentes.map((f) => (
              <li
                className="flex flex-wrap items-baseline gap-2 text-sm"
                key={f.nome}
              >
                <span className="text-fg-primary">{f.nome}</span>
                {f.titulo && (
                  <span className="text-fg-tertiary text-xs">— {f.titulo}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-fg-tertiary text-xs">
            Frentes suprapartidárias da Câmara dos Deputados. Senado não publica
            dados estruturados equivalentes.
          </p>
        </div>
      )}
    </div>
  )
}
