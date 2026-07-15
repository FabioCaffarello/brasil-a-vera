import Link from 'next/link'

import { ExportCsvLink } from '@/components/export-csv-link'
import { TrustBadge } from '@/components/trust/trust-badge'
import { formatBRL } from '@/lib/format'
import type { ConfrontoEmendasColegio, EmendasAno } from '@/lib/queries/emendas'

// Emendas parlamentares (ADR-066 §D5): totais do ano mais recente com top-5
// municípios de destino em barras de proporção; anos anteriores em <details>
// nativo (zero-JS, padrão colégio eleitoral). Copy neutra (ADR-040 §4 /
// ADR-051): a legislação prevê emendas individuais de execução obrigatória —
// exibimos o fato bruto, sem qualificar valores ou destinos.
// A seção é fail-closed no page (só entra no sections[] com dados).

interface Props {
  anos: EmendasAno[]
  /** Confronto emendas×colégio (ADR-066 D5); null/ausente = sem colégio. */
  confronto?: ConfrontoEmendasColegio | null
  /**
   * URL do export CSV — só chega quando o usuário está autenticado
   * (canExport() na page; export = autenticação). Ausente = sem botão.
   */
  exportHref?: string
}

// Municípios chegam MAIÚSCULOS da CGU (mesma convenção do TSE).
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

function reais(centavos: number): string {
  return formatBRL(centavos / 100)
}

function AnoEmendas({ ano }: { ano: EmendasAno }) {
  const maiorPago = ano.topMunicipios[0]
    ? Math.max(
        ano.topMunicipios[0].centavosPago,
        ano.topMunicipios[0].centavosEmpenhado,
      )
    : 0
  const semMunicipio =
    ano.semMunicipioCentavosPago > 0 || ano.semMunicipioCentavosEmpenhado > 0

  return (
    <div className="space-y-3">
      <p className="text-fg-secondary text-sm">
        {ano.emendas}{' '}
        {ano.emendas === 1 ? 'emenda individual' : 'emendas individuais'} ao
        orçamento de {ano.ano}:{' '}
        <span className="font-medium text-fg-primary tabular-nums">
          {reais(ano.centavosEmpenhado)}
        </span>{' '}
        empenhados,{' '}
        <span className="font-medium text-fg-primary tabular-nums">
          {reais(ano.centavosPago)}
        </span>{' '}
        pagos até a última atualização da fonte.
      </p>

      {ano.topMunicipios.length > 0 && (
        <ul className="space-y-1.5">
          {ano.topMunicipios.map((m) => {
            const valor =
              m.centavosPago > 0 ? m.centavosPago : m.centavosEmpenhado
            return (
              <li className="flex items-center gap-3" key={m.codigoIbge}>
                <span className="w-40 shrink-0 truncate text-fg-primary text-sm sm:w-52">
                  {formatMunicipio(m.nome)}
                  {m.uf && (
                    <span className="ml-1 text-fg-tertiary text-xs">
                      {m.uf}
                    </span>
                  )}
                </span>
                <div
                  aria-hidden
                  className="h-4 flex-1 overflow-hidden rounded bg-surface-elevated"
                >
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${maiorPago > 0 ? (valor / maiorPago) * 100 : 0}%`,
                      backgroundColor: 'var(--color-chart-1)',
                    }}
                  />
                </div>
                <span className="w-32 shrink-0 text-right text-fg-secondary text-xs tabular-nums">
                  {reais(valor)}
                  {m.centavosPago === 0 && (
                    <span className="text-fg-tertiary"> · empenhado</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {semMunicipio && (
        <p className="text-fg-tertiary text-xs">
          {reais(
            ano.semMunicipioCentavosPago > 0
              ? ano.semMunicipioCentavosPago
              : ano.semMunicipioCentavosEmpenhado,
          )}{' '}
          {ano.semMunicipioCentavosPago > 0 ? 'pagos' : 'empenhados'} sem
          município específico na fonte (destino múltiplo, estadual ou
          nacional).
        </p>
      )}
    </div>
  )
}

// Confronto composto (ADR-066 D5), padrão do bloco de variação patrimonial
// (ADR-047): frase factual + percentual em destaque + nota de recorte.
// Copy neutra: aderência à base é prerrogativa esperada, não irregularidade.
function ConfrontoColegio({
  confronto,
}: {
  confronto: ConfrontoEmendasColegio
}) {
  const pct =
    (confronto.centavosEmpenhadoNoColegio /
      confronto.centavosEmpenhadoComMunicipio) *
    100
  return (
    <div className="rounded-md border border-line-default bg-surface-elevated px-4 py-3">
      <p className="text-fg-secondary text-sm">
        Dos{' '}
        <span className="tabular-nums">
          {reais(confronto.centavosEmpenhadoComMunicipio)}
        </span>{' '}
        empenhados em emendas com município de destino identificado,{' '}
        <strong className="text-fg-primary tabular-nums">
          {pct.toLocaleString('pt-BR', {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}
          %
        </strong>{' '}
        foram para municípios entre os 20 maiores do colégio eleitoral de{' '}
        {confronto.anoPleito} ({confronto.municipiosNoColegio} de{' '}
        {confronto.municipiosComDestino} municípios de destino).
      </p>
      <p className="mt-1.5 text-fg-tertiary text-xs">
        A legislação permite — e se espera — que emendas individuais atendam a
        base eleitoral: é contexto factual, não acusação. Recorte usa os 20
        maiores municípios do colégio; o percentual real pode ser maior, nunca
        menor.{' '}
        <Link
          className="underline decoration-dotted underline-offset-2 hover:text-fg-secondary"
          href="/docs/metodologia#confronto-emendas-colegio"
        >
          Fórmula na metodologia
        </Link>
        .
      </p>
    </div>
  )
}

export function Emendas({ anos, confronto, exportHref }: Props) {
  const [maisRecente, ...anteriores] = anos

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustLevel="L2" />
        <span className="flex-1 text-fg-tertiary text-xs">
          Agregação determinística sobre valores oficiais do Portal da
          Transparência (L1); vínculo autor→parlamentar por nome oficial (L3,
          fail-closed).
        </span>
        {exportHref && <ExportCsvLink href={exportHref} label="Exportar CSV" />}
      </div>

      {confronto && <ConfrontoColegio confronto={confronto} />}

      <AnoEmendas ano={maisRecente} />

      {anteriores.map((ano) => (
        <details className="group" key={ano.ano}>
          <summary className="cursor-pointer text-fg-secondary text-sm hover:text-fg-primary">
            Orçamento de {ano.ano} ({ano.emendas}{' '}
            {ano.emendas === 1 ? 'emenda' : 'emendas'},{' '}
            {reais(ano.centavosEmpenhado)} empenhados)
          </summary>
          <div className="mt-3 pl-1">
            <AnoEmendas ano={ano} />
          </div>
        </details>
      ))}

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Emendas individuais ao orçamento federal, conforme o Portal da
        Transparência (CGU). A Constituição garante a parlamentares a indicação
        de emendas individuais de execução obrigatória — os valores e destinos
        são fatos orçamentários, não indicativos de irregularidade. Emendas de
        bancada e de comissão não têm autor individual e ficam fora deste
        recorte. Valores pagos podem crescer após o ano da emenda (restos a
        pagar).
      </p>
    </div>
  )
}
