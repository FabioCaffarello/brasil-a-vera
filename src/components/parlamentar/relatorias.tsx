// Confronto de relatorias (Eixo 1, ADR-044). Server component.
//
// Dois ângulos factuais, em blocos separados:
//   - influência: "relator de N proposições" + as mais recentes;
//   - relator×autoria: distribuição partidária dos autores das proposições
//     relatadas.
//
// Copy neutra (ADR-044 D4 + ADR-040 §4): a relatoria é DESIGNAÇÃO INSTITUCIONAL
// (presidente de comissão / Mesa), não escolha do parlamentar — a copy não
// implica intenção. Nada de "aparelhamento"/"loteamento"/"favorecimento"; sem
// score de ranqueamento; sem cor de juízo. "Último relator" é snapshot, não
// histórico completo (D3) — dito explicitamente.

import Link from 'next/link'

import { formatProposicaoRef } from '@/lib/format'
import type { RelatoriasInfluenciaResult } from '@/lib/queries/relatorias'
import type { DistribuicaoAutoria } from '@/modules/proposicoes/domain/relatorias'

interface Props {
  influencia: RelatoriasInfluenciaResult
  autoria: DistribuicaoAutoria
  casa: 'CAMARA' | 'SENADO'
}

export function Relatorias({ influencia, autoria, casa }: Props) {
  if (influencia.total === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Nenhuma relatoria registrada para este parlamentar nas proposições
        ingeridas. Considera-se apenas o <strong>relator vigente/último</strong>{' '}
        de cada matéria (não o histórico completo de relatores), e a maioria das
        proposições só recebe relator ao avançar na tramitação — a cobertura
        cresce conforme as matérias andam.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-3xl text-fg-primary tabular-nums">
            {influencia.total}
          </span>
          <span className="text-fg-tertiary text-sm">
            {influencia.total === 1
              ? 'proposição em que é o relator'
              : 'proposições em que é o relator'}{' '}
            vigente/último
          </span>
        </div>
        <p className="text-fg-tertiary text-xs">
          A relatoria é designada pela presidência da comissão ou pela Mesa —
          não é escolha do parlamentar. Conta-se o relator atual de cada
          matéria, não o histórico completo de relatores.
        </p>

        <ul className="space-y-3">
          {influencia.recentes.map((p) => (
            <li
              className="rounded-lg border border-line-default p-3"
              key={p.proposicaoId}
            >
              <Link
                className="font-medium font-mono text-fg-primary text-xs hover:text-fg-tertiary hover:underline"
                href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
              >
                {formatProposicaoRef(p.tipo, p.numero, p.ano)}
              </Link>
              <p className="mt-1.5 text-fg-primary text-sm">{p.ementa}</p>
            </li>
          ))}
        </ul>
      </div>

      {autoria.total > 0 ? (
        <div className="border-line-default border-t pt-5">
          <h3 className="font-semibold text-base text-fg-primary">
            Autores das proposições relatadas, por partido
          </h3>
          <p className="mt-0.5 mb-3 text-fg-tertiary text-xs">
            Distribuição partidária dos autores ({autoria.total}{' '}
            {autoria.total === 1 ? 'autoria' : 'autorias'} com parlamentar
            identificado). Distribuição factual — autores externos (comissões,
            Mesa) não entram.
            {casa === 'SENADO'
              ? ' No Senado, autores de matérias de origem no próprio Senado ainda não mapeiam a um parlamentar, então esta distribuição reflete sobretudo matérias revisoras (origem na Câmara).'
              : ''}
          </p>
          <ul className="space-y-2">
            {autoria.distribuicao.map((d) => (
              <li key={d.partido}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-medium text-fg-primary">
                    {d.partido}
                  </span>
                  <span className="tabular-nums text-fg-tertiary text-xs">
                    {d.count} ({d.pct}%)
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
