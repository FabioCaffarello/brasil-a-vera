import { ArrowRight } from 'lucide-react'

import { TrustBadge } from '@/components/trust/trust-badge'
import { formatBRL } from '@/lib/format'
import type { EvolucaoPatrimonial } from '@/modules/eleitoral/domain/evolucao'

// Seção "Evolução patrimonial" do perfil (Eixo 2 — Camada B). Server component,
// +0kb JS. Mostra a trajetória do patrimônio do parlamentar entre os pleitos em
// que se candidatou: pontos discretos, valores corrigidos pelo IPCA p/ a
// data-base (dez/2022, ADR-036), e a variação por categoria.
//
// Honestidade (EIXO-2 §R1/R2): pontos discretos — o patrimônio ENTRE eleições é
// desconhecido, não zero; nunca interpolamos. Deltas só entre pleitos
// consecutivos existentes. Trust L2 (agregação + índice IPCA oficial).

interface Props {
  evolucao: EvolucaoPatrimonial
}

const TOP_N = 8

export function EvolucaoPatrimonialBlock({ evolucao }: Props) {
  const { baseAno, pontos, deltas } = evolucao
  const anos = pontos.map((p) => p.ano)
  const ultimoAno = anos[anos.length - 1]

  // Matriz categoria × pleito (valores corrigidos). União das categorias de
  // todos os pleitos; ausência num pleito = "—" (não declarada / desconhecida).
  const catMap = new Map<number, { ds: string; porAno: Map<number, string> }>()
  for (const p of pontos) {
    for (const c of p.categorias) {
      let e = catMap.get(c.cdTipoBem)
      if (!e) {
        e = { ds: c.dsTipoBem, porAno: new Map() }
        catMap.set(c.cdTipoBem, e)
      }
      e.porAno.set(p.ano, c.totalCorrigido)
    }
  }
  const catsOrdenadas = [...catMap.values()].sort(
    (a, b) =>
      Number(b.porAno.get(ultimoAno) ?? 0) -
      Number(a.porAno.get(ultimoAno) ?? 0),
  )
  const top = catsOrdenadas.slice(0, TOP_N)
  const resto = catsOrdenadas.slice(TOP_N)
  const restoPorAno = (ano: number) =>
    resto.reduce((acc, c) => acc + Number(c.porAno.get(ano) ?? 0), 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="text-fg-tertiary text-xs">
          Valores corrigidos pelo IPCA a preços de dezembro de {baseAno}
          (comparáveis entre pleitos).
        </span>
      </div>

      {/* Variação total entre pleitos consecutivos (corrigida). */}
      <div className="flex flex-wrap items-center gap-2">
        {deltas.map((d) => {
          const sinal = Number(d.deltaCorrigido) >= 0 ? '+' : '−'
          const abs = formatBRL(Math.abs(Number(d.deltaCorrigido)))
          return (
            <span
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-elevated px-2.5 py-1 text-sm"
              key={`${d.de}-${d.para}`}
            >
              <span className="text-fg-tertiary text-xs">
                {d.de}
                <ArrowRight aria-hidden className="inline h-3 w-3" />
                {d.para}
              </span>
              <span className="font-medium tabular-nums text-fg-primary">
                {sinal}
                {abs}
              </span>
              {d.deltaPct !== null ? (
                <span className="text-fg-tertiary text-xs">
                  ({sinal}
                  {Math.abs(d.deltaPct).toLocaleString('pt-BR')}% real)
                </span>
              ) : null}
            </span>
          )
        })}
      </div>

      {/* Matriz categoria × pleito (valores corrigidos). */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-line-default border-b text-fg-tertiary text-xs">
              <th className="py-1.5 pr-3 text-left font-medium">Categoria</th>
              {pontos.map((p) => (
                <th
                  className="py-1.5 pl-3 text-right font-medium tabular-nums"
                  key={p.ano}
                >
                  {p.ano}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top.map((c) => (
              <tr
                className="border-line-subtle border-b last:border-0"
                key={c.ds}
              >
                <td className="py-1.5 pr-3 text-fg-primary">{c.ds}</td>
                {pontos.map((p) => {
                  const v = c.porAno.get(p.ano)
                  return (
                    <td
                      className="py-1.5 pl-3 text-right tabular-nums text-fg-secondary"
                      key={p.ano}
                    >
                      {v ? formatBRL(v) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
            {resto.length > 0 ? (
              <tr className="border-line-subtle border-b text-fg-tertiary">
                <td className="py-1.5 pr-3">+ {resto.length} outras</td>
                {pontos.map((p) => {
                  const v = restoPorAno(p.ano)
                  return (
                    <td
                      className="py-1.5 pl-3 text-right tabular-nums"
                      key={p.ano}
                    >
                      {v > 0 ? formatBRL(v) : '—'}
                    </td>
                  )
                })}
              </tr>
            ) : null}
            <tr className="font-semibold text-fg-primary">
              <td className="py-1.5 pr-3">Total</td>
              {pontos.map((p) => (
                <td className="py-1.5 pl-3 text-right tabular-nums" key={p.ano}>
                  {formatBRL(p.totalCorrigido)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Pontos discretos por candidatura (anos eleitorais). O patrimônio{' '}
        <strong className="font-medium text-fg-secondary">entre</strong> pleitos
        é desconhecido — não assumimos zero nem interpolamos. Valores nominais
        declarados foram corrigidos pelo IPCA (IBGE) para dezembro de {baseAno}.
      </p>
    </div>
  )
}
