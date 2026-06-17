import { TrustBadge } from '@/components/trust/trust-badge'
import type { MixComposicao } from '@/modules/eleitoral/domain/mix'

// Seção "Composição ao longo do tempo" do perfil (Eixo 2 — Camada C). Server
// component, +0kb JS. Barras 100%-empilhadas por pleito: cada segmento é a
// participação % de uma categoria, com cor estável entre pleitos — vê-se para
// onde o patrimônio migrou.
//
// Imune ao ADR-036: composição é share-of-total intra-pleito, não muda com
// correção monetária (EIXO-2 §5.C). Trust L2 (agregação determinística).

interface Props {
  mix: MixComposicao
}

// corIdx 1..5 → paleta de chart; 0 = "Outras" (cinza neutro).
function corVar(corIdx: number): string {
  return corIdx === 0
    ? 'var(--color-fg-quaternary)'
    : `var(--color-chart-${corIdx})`
}

export function MixComposicaoBlock({ mix }: Props) {
  const { pleitos, legenda } = mix

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="text-fg-tertiary text-xs">
          Participação de cada categoria no total declarado, por pleito.
        </span>
      </div>

      <div className="space-y-2">
        {pleitos.map((p) => (
          <div className="flex items-center gap-3" key={p.ano}>
            <span className="w-10 shrink-0 text-fg-tertiary text-xs tabular-nums">
              {p.ano}
            </span>
            <div
              aria-label={`${p.ano}: ${p.segmentos
                .map((s) => `${s.label} ${s.pct.toLocaleString('pt-BR')}%`)
                .join(', ')}`}
              className="flex h-5 flex-1 overflow-hidden rounded bg-surface-elevated"
              role="img"
            >
              {p.segmentos.map((s) => (
                <div
                  className="h-full"
                  key={s.cdTipoBem ?? 'outras'}
                  style={{
                    width: `${s.pct}%`,
                    backgroundColor: corVar(s.corIdx),
                  }}
                  title={`${s.label}: ${s.pct.toLocaleString('pt-BR')}%`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {legenda.map((l) => (
          <span
            className="inline-flex items-center gap-1.5 text-fg-tertiary text-xs"
            key={l.label}
          >
            <span
              aria-hidden
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: corVar(l.corIdx) }}
            />
            {l.label}
          </span>
        ))}
      </div>

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Composição em % — independe da inflação (é proporção dentro de cada
        pleito), então mostra a migração entre tipos de bem mesmo quando os
        valores nominais mudam. Pontos discretos por candidatura.
      </p>
    </div>
  )
}
