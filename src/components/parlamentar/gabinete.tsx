import { DataBadge } from '@fabio.caffarello/react-design-system/server'

import { TrustBadge } from '@/components/trust/trust-badge'
import { formatBRL } from '@/lib/format'
import type { GabineteView } from '@/lib/queries/gabinete'

// Comissionados de gabinete (ADR-064 §D4/§D5): contagem + custo básico
// mensal (Senado) + lista nome/cargo/remuneração. Copy neutra: nenhum
// qualificativo de "muito/pouco"; nomes e cargos são públicos por força da
// LAI. Lista longa colapsa em <details> nativo (zero-JS, padrão
// liderancas-cargos). A seção é fail-closed no page (só entra com dados).

interface Props {
  gabinete: GabineteView
}

const VISIVEIS = 10

function reais(centavos: number): string {
  return formatBRL(centavos / 100)
}

function competencia(mesReferencia: string): string {
  const [ano, mes] = mesReferencia.split('-')
  return `${mes}/${ano}`
}

function Pessoa({ pessoa }: { pessoa: GabineteView['pessoas'][number] }) {
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-lg border border-line-default p-3">
      {pessoa.cargo && <DataBadge tone="neutral">{pessoa.cargo}</DataBadge>}
      <span className="text-fg-primary text-sm">{pessoa.nome}</span>
      <span className="ml-auto text-fg-tertiary text-xs tabular-nums">
        {pessoa.remuneracaoBasicaCentavos !== null
          ? reais(pessoa.remuneracaoBasicaCentavos)
          : pessoa.grupo}
      </span>
    </li>
  )
}

export function Gabinete({ gabinete }: Props) {
  const visiveis = gabinete.pessoas.slice(0, VISIVEIS)
  const restantes = gabinete.pessoas.slice(VISIVEIS)
  const temRemuneracao = gabinete.custoBasicoMensalCentavos !== null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <TrustBadge trustLevel="L1" />
        <span className="text-fg-tertiary text-xs">
          Quadro oficial publicado pela própria casa; nomes e cargos são
          públicos por força da LAI.
        </span>
      </div>

      <p className="text-fg-secondary text-sm">
        <span className="font-medium text-fg-primary">{gabinete.total}</span>{' '}
        {gabinete.total === 1 ? 'comissionado' : 'comissionados'} no gabinete
        {temRemuneracao && gabinete.mesReferencia && (
          <>
            {' '}
            — remuneração básica somada de{' '}
            <span className="font-medium text-fg-primary tabular-nums">
              {reais(gabinete.custoBasicoMensalCentavos as number)}
            </span>{' '}
            na competência {competencia(gabinete.mesReferencia)}
          </>
        )}
        .
      </p>

      <ul className="space-y-2">
        {visiveis.map((p) => (
          <Pessoa key={p.sourceId ?? p.nome} pessoa={p} />
        ))}
      </ul>

      {restantes.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none text-fg-tertiary text-xs hover:text-fg-secondary">
            <span className="group-open:hidden">
              + {restantes.length}{' '}
              {restantes.length === 1 ? 'servidor' : 'servidores'}
            </span>
            <span className="hidden group-open:inline">− Ocultar</span>
          </summary>
          <ul className="mt-2 space-y-2">
            {restantes.map((p) => (
              <Pessoa key={p.sourceId ?? p.nome} pessoa={p} />
            ))}
          </ul>
        </details>
      )}

      <p className="rounded-md bg-surface-elevated px-3 py-2 text-fg-tertiary text-xs leading-snug">
        Cargos de livre nomeação custeados pelo orçamento da casa — a existência
        do gabinete é prevista em resolução; o número e os cargos são fatos
        administrativos, sem juízo.{' '}
        {temRemuneracao
          ? 'Remuneração básica da folha oficial do Senado; não inclui vantagens, indenizações ou descontos.'
          : 'A Câmara publica nome, grupo e nível do cargo, mas não a remuneração por nível em formato aberto — por isso os valores não aparecem aqui.'}
      </p>
    </div>
  )
}
