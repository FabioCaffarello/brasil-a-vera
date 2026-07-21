// Tema (ADR-050) — proposições do assunto + quem mais as autora. SSG por tema.

import {
  Breadcrumb,
  HeroSection,
} from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { formatDataBR, formatProposicaoRef } from '@/lib/format'
import { getTema, getVotacoesByTema } from '@/lib/queries/temas'

const SITUACAO_LABELS: Record<string, string> = {
  TRAMITANDO: 'Tramitando',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
  ARQUIVADA: 'Arquivada',
  TRANSFORMADA_EM_NORMA: 'Virou norma',
}

interface PageProps {
  params: Promise<{ codigo: string }>
}

// Dynamic por necessidade do build (igual a /partidos/[sigla]): renderiza sob
// demanda, sem prerender estático que tocaria o DB no build. Cache vive na
// query (cached/ADR-018).
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps) {
  const { codigo } = await params
  const tema = await getTema(Number(codigo))
  if (!tema) return { title: 'Tema — Brasil à Vera' }
  const title = `${tema.nome} — Temas — Brasil à Vera`
  const description = `Proposições sobre ${tema.nome} e os parlamentares que mais as propõem.`
  return { title, description, openGraph: { title, description } }
}

export default async function TemaPage({ params }: PageProps) {
  const { codigo } = await params
  const n = Number(codigo)
  if (!Number.isInteger(n)) notFound()
  const [tema, votacoes] = await Promise.all([getTema(n), getVotacoesByTema(n)])
  if (!tema) notFound()

  return (
    <>
      {/* Breadcrumb ACIMA do H1 — nas demais rotas de detalhe ele antecede o
          título; aqui aparecia depois do hero (auditoria UX 2026-07-20, P2.9). */}
      <div className="mx-auto max-w-5xl pt-6">
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Temas', href: '/temas' },
            { label: tema.nome },
          ]}
        />
      </div>
      <HeroSection
        align="center"
        description={`${tema.total} ${tema.total === 1 ? 'proposição classificada' : 'proposições classificadas'} neste tema e quem mais as propõe.`}
        title={tema.nome}
        variant="plain"
      />

      <div className="mx-auto max-w-5xl space-y-8 py-8">
        <section className="space-y-3">
          <h2 className="font-semibold text-fg-primary text-lg">
            Quem mais propõe sobre o tema
          </h2>
          {tema.parlamentares.length === 0 ? (
            <p className="text-fg-tertiary text-sm">
              Nenhum autor com parlamentar identificado (autoria externa ou de
              outra casa não entra).
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {tema.parlamentares.map((p) => (
                <li key={p.id}>
                  <Link
                    className="flex items-center justify-between gap-3 rounded-lg border border-line-default p-3 hover:bg-surface-raised"
                    href={`/parlamentares/${p.id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-fg-primary text-sm">
                        {p.nome}
                      </span>
                      <span className="text-fg-tertiary text-xs">
                        {p.partidoSigla} · {p.uf}
                      </span>
                    </span>
                    <span className="shrink-0 text-fg-tertiary text-xs tabular-nums">
                      {p.proposicoes}{' '}
                      {p.proposicoes === 1 ? 'proposição' : 'proposições'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold text-fg-primary text-lg">
              Proposições recentes
            </h2>
            <Link
              className="text-fg-primary text-sm hover:underline"
              href={`/proposicoes?tema=${tema.codigo}`}
            >
              Ver todas as proposições deste tema →
            </Link>
          </div>
          <ul className="space-y-2">
            {tema.proposicoes.map((p) => (
              <li
                className="rounded-lg border border-line-default p-3"
                key={p.proposicaoId}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link
                    className="font-medium font-mono text-fg-primary text-xs hover:text-fg-tertiary hover:underline"
                    href={`/proposicoes/${p.tipo}/${p.numero}/${p.ano}`}
                  >
                    {formatProposicaoRef(p.tipo, p.numero, p.ano)}
                  </Link>
                  <span className="text-fg-tertiary text-xs">
                    {SITUACAO_LABELS[p.situacao] ?? p.situacao}
                  </span>
                </div>
                <p className="mt-1.5 text-fg-primary text-sm">{p.ementa}</p>
              </li>
            ))}
          </ul>
        </section>

        {votacoes.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-semibold text-fg-primary text-lg">
              Votações recentes sobre o tema
            </h2>
            <ul className="space-y-2">
              {votacoes.map((v) => (
                <li
                  className="rounded-lg border border-line-default p-3"
                  key={v.id}
                >
                  <div className="flex flex-wrap items-center gap-2 text-fg-tertiary text-xs">
                    <span>{formatDataBR(v.dataHora)}</span>
                    <span aria-hidden>·</span>
                    <span>{v.casa === 'CAMARA' ? 'Câmara' : 'Senado'}</span>
                    <span aria-hidden>·</span>
                    <span>{v.orgao}</span>
                    <span aria-hidden>·</span>
                    <span
                      className={
                        v.aprovada
                          ? 'font-medium text-fg-success'
                          : 'font-medium text-fg-error'
                      }
                    >
                      {v.aprovada ? 'Aprovada' : 'Rejeitada'}
                    </span>
                  </div>
                  <Link
                    className="mt-1.5 block text-fg-primary text-sm decoration-dotted underline-offset-2 hover:text-fg-tertiary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                    href={`/votacoes/${v.id}`}
                  >
                    {v.descricao}
                  </Link>
                  {v.proposicaoTipo &&
                    v.proposicaoNumero &&
                    v.proposicaoAno && (
                      <Link
                        className="mt-0.5 inline-block text-fg-tertiary text-xs decoration-dotted underline-offset-2 hover:text-fg-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                        href={`/proposicoes/${v.proposicaoTipo}/${v.proposicaoNumero}/${v.proposicaoAno}`}
                      >
                        {formatProposicaoRef(
                          v.proposicaoTipo,
                          v.proposicaoNumero,
                          v.proposicaoAno,
                        )}{' '}
                        →
                      </Link>
                    )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-fg-tertiary text-xs">
          Classificação temática oficial da Câmara. "Quem mais propõe" conta
          autoria das proposições ingeridas classificadas neste tema — é
          produção legislativa no assunto, não medida de engajamento total.
        </p>
      </div>
    </>
  )
}
