// "Veredito do Espelho" (ADR-051) — bloco de leitura rápida no topo do perfil.
// Camada de RESPOSTA em linguagem de cidadão acima da dobra: os MESMOS 4 fatos
// fixos para todos os parlamentares (anti-armadilha), cada um com frase factual
// + TrustBadge L2 + fallback honesto. Server-safe (TrustBadge é client, mas
// composto a partir daqui). Conformidade ADR-040 §4: contagem/percentil factual,
// SEM score, SEM cor de juízo (números em fg-primary neutro), "o cidadão conclui".

import { Card } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import { TrustBadge } from '@/components/trust/trust-badge'
import { formatBRL, formatPercentil } from '@/lib/format'
import type { AlinhamentoResult } from '@/lib/queries/alinhamento'
import type { CoerenciaStats } from '@/lib/queries/coerencia'
import type { ComparacoesCasa } from '@/lib/queries/parlamentares'
import {
  ALINHAMENTO_AMOSTRA_MINIMA,
  type Casa,
  classificarAlinhamento,
  classificarCoerencia,
  classificarGasto,
  classificarProposicoes,
} from '@/modules/parlamentares/domain/leitura-rapida'

interface Props {
  casa: Casa
  /** Ano corrente da cota CEAP. */
  ano: number
  alinhamento: AlinhamentoResult
  comparacoes: ComparacoesCasa
  gastos: { totalGeral: string; totalRegistros: number }
  proposicoesCount: number
  /** true quando há mais páginas de proposições (contagem é da 1ª página). */
  proposicoesParcial: boolean
  coerencia: CoerenciaStats
}

const casaLabel = (casa: Casa) => (casa === 'CAMARA' ? 'Câmara' : 'Senado')

/** Número factual em destaque tipográfico neutro (sem cor de juízo). */
function N({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-fg-primary">{children}</span>
}

function comparativoCasa(percentil: number | null, casa: Casa) {
  if (percentil === null) return null
  return (
    <>
      {' — '}
      <N>{formatPercentil(percentil)}</N> da {casaLabel(casa)}
    </>
  )
}

function fraseAlinhamento(
  alinhamento: AlinhamentoResult,
  casa: Casa,
): React.ReactNode {
  const f = classificarAlinhamento(alinhamento, casa)
  switch (f.kind) {
    case 'completo':
      return (
        <>
          Votou de acordo com a orientação do partido em <N>{f.percentual}%</N>{' '}
          das <N>{f.total}</N> votações com orientação registrada.
          {f.amostraInsuficiente ? (
            <span className="text-fg-tertiary">
              {' '}
              Amostra pequena (menos de {ALINHAMENTO_AMOSTRA_MINIMA} votações) —
              informativo, estatisticamente frágil.
            </span>
          ) : null}
        </>
      )
    case 'federacao':
      return (
        <>
          Integra a federação <N>{f.federacaoNome}</N>. A Câmara publica a
          orientação pela federação, não pela sigla — por isso o alinhamento
          partidário pela sigla não é calculado. Não é amostra insuficiente: é
          característica da fonte.
        </>
      )
    case 'senado_sem_dado':
      return (
        <>
          O alinhamento à orientação ainda não é calculado para senadores nesta
          versão — a ingestão da orientação de bancada do Senado é uma dívida
          conhecida.
        </>
      )
    case 'sem_orientacao':
      return (
        <>
          A liderança do partido ainda não publicou orientação nas votações
          nominais ingeridas. A cobertura cresce a cada execução do cron.
        </>
      )
  }
}

function fraseGasto(
  gastos: { totalGeral: string; totalRegistros: number },
  percentilGastoCasa: number | null,
  casa: Casa,
  ano: number,
): React.ReactNode {
  const f = classificarGasto(gastos, percentilGastoCasa)
  if (f.kind === 'sem_gasto') {
    return <>Sem gastos de cota parlamentar registrados em {ano}.</>
  }
  return (
    <>
      Usou <N>{formatBRL(f.total)}</N> da cota parlamentar (CEAP) em{' '}
      <N>{ano}</N>
      {comparativoCasa(f.percentil, casa)}.
    </>
  )
}

function fraseProposicoes(
  count: number,
  percentilProposicoesCasa: number | null,
  parcial: boolean,
  casa: Casa,
): React.ReactNode {
  const f = classificarProposicoes(count, percentilProposicoesCasa, parcial)
  if (f.kind === 'nenhuma') {
    return <>Nenhuma proposição de autoria registrada na base atual.</>
  }
  return (
    <>
      Apresentou{' '}
      <N>
        {f.parcial ? 'ao menos ' : ''}
        {f.count}
      </N>{' '}
      {f.count === 1 ? 'proposição' : 'proposições'} como autor
      {comparativoCasa(f.percentil, casa)}.
    </>
  )
}

function fraseCoerencia(coerencia: CoerenciaStats): React.ReactNode {
  const f = classificarCoerencia(coerencia)
  if (f.kind === 'nenhum') {
    return <>Nenhum par de votos em sentidos opostos detectado na base atual.</>
  }
  return (
    <>
      Tem <N>{f.pares}</N> {f.pares === 1 ? 'par' : 'pares'} de votos em
      sentidos opostos sobre o mesmo tema, em <N>{f.classificaveis}</N> votos
      classificáveis.
    </>
  )
}

function FatoLinha({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <li className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="font-medium text-fg-tertiary text-xs uppercase tracking-wide">
          {label}
        </p>
        <p className="mt-1 text-fg-primary text-sm leading-relaxed">
          {children}
        </p>
      </div>
      <div className="shrink-0 pt-0.5">
        <TrustBadge trustLevel="L2" />
      </div>
    </li>
  )
}

export function LeituraRapida({
  casa,
  ano,
  alinhamento,
  comparacoes,
  gastos,
  proposicoesCount,
  proposicoesParcial,
  coerencia,
}: Props) {
  return (
    <Card
      asSection
      aria-labelledby="leitura-rapida-title"
      className="p-4 sm:p-6"
      padding="none"
      variant="default"
    >
      <h2
        className="font-semibold text-base text-fg-primary"
        id="leitura-rapida-title"
      >
        Em resumo
      </h2>

      <ul className="mt-3 divide-y divide-line-default">
        <FatoLinha label="Alinhamento ao partido">
          {fraseAlinhamento(alinhamento, casa)}
        </FatoLinha>
        <FatoLinha label="Gasto da cota (CEAP)">
          {fraseGasto(gastos, comparacoes.percentilGastoCasa, casa, ano)}
        </FatoLinha>
        <FatoLinha label="Proposições de autoria">
          {fraseProposicoes(
            proposicoesCount,
            comparacoes.percentilProposicoesCasa,
            proposicoesParcial,
            casa,
          )}
        </FatoLinha>
        <FatoLinha label="Coerência de votos">
          {fraseCoerencia(coerencia)}
        </FatoLinha>
      </ul>

      {/* Critério exposto (anti-armadilha nº1): a lista é determinística e
          idêntica para todos — não escolhemos "os mais relevantes deste". */}
      <p className="mt-4 border-line-default border-t pt-3 text-fg-tertiary text-xs">
        Mostramos sempre os mesmos quatro fatos, na mesma ordem, para todos os
        parlamentares — não escolhemos “os mais relevantes deste”.{' '}
        <Link
          className="text-fg-brand underline decoration-dotted underline-offset-2 hover:text-fg-brand/80"
          href="/docs/como-ler-um-perfil"
        >
          Como ler um perfil →
        </Link>
      </p>
    </Card>
  )
}
