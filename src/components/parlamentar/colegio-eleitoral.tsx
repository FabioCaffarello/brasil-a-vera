import type { ColegioEleitoralPleito } from '@/lib/queries/colegio-eleitoral'

// Colégio eleitoral municipal (ADR-065 §D4): top-5 municípios do pleito mais
// recente com barras de proporção + % de concentração; pleitos anteriores em
// <details> nativo (zero-JS). Copy neutra (ADR-040 §4 / ADR-051): fato bruto
// com critério explícito, sem qualificar concentração como boa ou ruim.
// A seção é fail-closed no page (só entra no sections[] com dados).

interface Props {
  pleitos: ColegioEleitoralPleito[]
}

const TOP_EXIBIDOS = 5

// Municípios chegam MAIÚSCULOS do TSE ("APARECIDA DE GOIÂNIA", "ÁGUA BOA").
// Title-case unicode-aware; conectivos ficam minúsculos.
const CONECTIVOS = new Set(['de', 'do', 'da', 'dos', 'das', 'e'])
function formatMunicipio(nome: string): string {
  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra, i) =>
      i > 0 && CONECTIVOS.has(palavra)
        ? palavra
        : palavra.replace(/^\p{L}/u, (c) => c.toUpperCase()),
    )
    .join(' ')
}

function formatCargo(dsCargo: string): string {
  return dsCargo.toLowerCase()
}

function pctDe(votos: number, total: number | null): number | null {
  if (total == null || total <= 0) return null
  return (votos / total) * 100
}

function formatPct(pct: number): string {
  return `${pct.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`
}

function TopMunicipios({ pleito }: { pleito: ColegioEleitoralPleito }) {
  const top = pleito.municipios.slice(0, TOP_EXIBIDOS)
  const maiorVoto = top[0]?.votos ?? 0
  const somaTop = top.reduce((a, m) => a + m.votos, 0)
  const concentracao = pctDe(somaTop, pleito.totalVotos)

  return (
    <div className="space-y-3">
      {concentracao != null && (
        <p className="text-fg-secondary text-sm">
          Os {top.length} maiores municípios somaram{' '}
          <span className="font-medium text-fg-primary tabular-nums">
            {formatPct(concentracao)}
          </span>{' '}
          dos {pleito.totalVotos?.toLocaleString('pt-BR')} votos nominais como{' '}
          {formatCargo(pleito.dsCargo)} em {pleito.anoEleicao}.
        </p>
      )}
      <ul className="space-y-1.5">
        {top.map((m) => {
          const pct = pctDe(m.votos, pleito.totalVotos)
          return (
            <li className="flex items-center gap-3" key={m.codigo}>
              <span className="w-40 shrink-0 truncate text-fg-primary text-sm sm:w-52">
                {formatMunicipio(m.nome)}
                <span className="ml-1 text-fg-tertiary text-xs">{m.uf}</span>
              </span>
              <div
                aria-hidden
                className="h-4 flex-1 overflow-hidden rounded bg-surface-elevated"
              >
                <div
                  className="h-full rounded"
                  style={{
                    width: `${maiorVoto > 0 ? (m.votos / maiorVoto) * 100 : 0}%`,
                    backgroundColor: 'var(--color-chart-1)',
                  }}
                />
              </div>
              <span className="w-28 shrink-0 text-right text-fg-secondary text-xs tabular-nums">
                {m.votos.toLocaleString('pt-BR')}
                {pct != null && (
                  <span className="text-fg-tertiary"> · {formatPct(pct)}</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function ColegioEleitoral({ pleitos }: Props) {
  const [maisRecente, ...anteriores] = pleitos

  return (
    <div className="space-y-4">
      <TopMunicipios pleito={maisRecente} />

      {anteriores.map((pleito) => (
        <details className="group" key={pleito.anoEleicao}>
          <summary className="cursor-pointer text-fg-secondary text-sm hover:text-fg-primary">
            Pleito de {pleito.anoEleicao} ({formatCargo(pleito.dsCargo)})
          </summary>
          <div className="mt-3 pl-1">
            <TopMunicipios pleito={pleito} />
          </div>
        </details>
      ))}

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Votos nominais por município somando as zonas eleitorais, conforme os
        arquivos oficiais de votação do TSE. Os 20 maiores municípios de cada
        pleito são armazenados; o percentual usa o total oficial de votos do
        candidato no pleito. Deputados federais e senadores são eleitos por
        circunscrição estadual — a distribuição municipal é informativa, não um
        vínculo formal de representação.
      </p>
    </div>
  )
}
