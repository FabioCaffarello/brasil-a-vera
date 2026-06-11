// Cópia-rds de src/components/votacao/footer-relacionadas.tsx
// (piloto-4). Server Component puro. Tokens traduzidos pela tabela
// canônica (+ generalização bg-brand/N → bg-fg-brand/N, extensão
// piloto-4).
// Links de votação relacionada apontam pra rota de PRODUÇÃO
// (precedente piloto-3: cross-links de entidade não ficam sob /rds/).

import Link from 'next/link'

import { formatDataBR } from '@/lib/format'
import type { VotacaoRelacionada } from '@/lib/queries/votacoes'

interface Props {
  votacoes: readonly VotacaoRelacionada[]
}

const RELACAO_LABEL: Record<string, string> = {
  mesma_proposicao: 'Mesma proposição',
  mesmo_orgao_janela: 'Mesmo órgão',
}

const CASA_LABEL: Record<string, string> = {
  CAMARA: 'Câmara',
  SENADO: 'Senado',
}

export function VotacoesRelacionadasFooter({ votacoes }: Props) {
  if (votacoes.length === 0) return null

  return (
    <section
      aria-labelledby="footer-relacionadas-title"
      className="mt-8 border-line-default border-t pt-6"
    >
      <h2
        className="mb-3 font-semibold text-fg-primary text-lg"
        id="footer-relacionadas-title"
      >
        Outras votações relacionadas
      </h2>
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {votacoes.map((v) => {
          // bg-brand/N → bg-fg-brand/N (generalização aprovada na
          // extensão piloto-4 — base byte-idêntica pós-#358).
          const relacaoTone =
            v.relacao === 'mesma_proposicao'
              ? 'bg-fg-brand/15 text-fg-brand'
              : 'bg-surface-raised text-fg-tertiary'
          const resultadoTone = v.aprovada ? 'text-fg-success' : 'text-fg-error'
          return (
            <li key={v.id}>
              <Link
                className="flex h-full flex-col gap-2 rounded-lg border border-line-default bg-surface-base p-4 transition-colors hover:border-line-emphasis hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                href={`/votacoes/${v.id}`}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`inline-flex items-center rounded px-2 py-0.5 font-medium ${relacaoTone}`}
                  >
                    {RELACAO_LABEL[v.relacao] ?? v.relacao}
                  </span>
                  <span className="text-fg-tertiary">
                    {CASA_LABEL[v.casa] ?? v.casa}
                  </span>
                  <span className="text-fg-tertiary">·</span>
                  <span className="text-fg-tertiary">
                    {formatDataBR(v.dataHora)}
                  </span>
                  <span className="text-fg-tertiary">·</span>
                  <span className={`font-medium ${resultadoTone}`}>
                    {v.aprovada ? 'Aprovada' : 'Rejeitada'}
                  </span>
                </div>
                <p className="line-clamp-2 text-fg-primary text-sm">
                  {v.descricao}
                </p>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
