// Card de fato — gasto CEAP (ADR-054, issue #591).
//
// Landing compartilhável: serve a imagem OG (irmã opengraph-image.tsx)
// para scrapers e, para humanos, mostra o fato com contexto + CTA ao perfil.
// `noindex` — landing de share, não conteúdo canônico.
// CEAP é Câmara-only na ingestão atual; senadores verão empty state honesto.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CompartilharButton } from '@/components/parlamentar/compartilhar-button'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { formatBRL, formatPercentil } from '@/lib/format'
import {
  getComparacoesCasa,
  getGastosResumo,
  getParlamentarById,
} from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string }>
}

const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const p = await getParlamentarById(id)
  if (!p)
    return {
      title: 'Fato não encontrado — Brasil à Vera',
      robots: { index: false },
    }
  return {
    title: `${p.nome} — gasto CEAP · Brasil à Vera`,
    description: `Veja quanto ${p.nome} (${p.partidoSigla}/${p.uf}) gastou em cota parlamentar (CEAP) reportada pela Câmara dos Deputados.`,
    robots: { index: false, follow: true },
  }
}

export default async function FatoGastoPage({ params }: PageProps) {
  const { id } = await params
  const anoCorrente = new Date().getFullYear()
  const [p, gastos, comparacoes] = await Promise.all([
    getParlamentarById(id),
    getGastosResumo(id, anoCorrente),
    getComparacoesCasa(id),
  ])
  if (!p) notFound()

  const temDados = p.casa === 'CAMARA' && gastos.totalRegistros > 0

  const fatoMensagem = temDados
    ? `Gastou ${formatBRL(gastos.totalGeral)} em cota parlamentar (CEAP) em ${anoCorrente}${comparacoes.percentilGastoCasa !== null ? ` — ${formatPercentil(comparacoes.percentilGastoCasa)} entre os deputados federais` : ''}.`
    : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Button asChild size="sm" variant="ghost">
        <a href={`/parlamentares/${id}#gastos`}>
          <ArrowLeft className="h-4 w-4" />
          Perfil completo
        </a>
      </Button>

      <header className="flex items-center gap-4">
        <ParlamentarAvatar
          className="shrink-0"
          nome={p.nome}
          size="xl"
          urlFoto={p.urlFoto}
        />
        <div className="min-w-0">
          <p className="text-fg-tertiary text-xs uppercase tracking-wide">
            {cargoLabel(p.casa)}
          </p>
          <h1 className="font-bold text-2xl text-fg-primary">{p.nome}</h1>
          <p className="font-mono text-fg-tertiary text-sm">
            {p.partidoSigla} / {p.uf}
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-line-default bg-surface-canvas p-6 space-y-4">
        <h2 className="font-semibold text-fg-primary text-lg">
          Gasto CEAP — {anoCorrente}
        </h2>

        {p.casa === 'SENADO' ? (
          <p className="text-fg-secondary text-base">
            Senadores usam o CEAPS — regime próprio do Senado Federal. A
            ingestão atual cobre apenas a CEAP da Câmara dos Deputados; os dados
            do Senado ainda não estão disponíveis nesta plataforma.
          </p>
        ) : gastos.totalRegistros === 0 ? (
          <p className="text-fg-secondary text-base">
            Nenhum gasto CEAP registrado para {anoCorrente}.
          </p>
        ) : (
          <>
            <p className="font-bold text-4xl text-fg-primary tabular-nums">
              {formatBRL(gastos.totalGeral)}
            </p>
            <p className="text-fg-secondary text-base">
              em cota parlamentar (CEAP) em {anoCorrente}.
            </p>
            <dl className="grid grid-cols-2 gap-4 border-t border-line-default pt-4">
              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Registros
                </dt>
                <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                  {gastos.totalRegistros}
                </dd>
              </div>
              {comparacoes.percentilGastoCasa !== null && (
                <div>
                  <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                    Posição entre deputados
                  </dt>
                  <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                    {formatPercentil(comparacoes.percentilGastoCasa)}
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}

        <p className="text-fg-tertiary text-xs border-t border-line-default pt-3">
          Fonte: Sistema CEAP — Câmara dos Deputados. Inclui gastos de
          alimentação, passagens, hospedagem, combustível e outros itens
          definidos em resolução. O uso é legítimo; o dado é público para
          acompanhamento cidadão.
        </p>
      </div>

      {fatoMensagem && (
        <div className="flex justify-end">
          <CompartilharButton
            campaign="gasto"
            fato={{ mensagem: fatoMensagem }}
            parlamentar={{
              nome: p.nome,
              partidoSigla: p.partidoSigla ?? '',
              uf: p.uf,
              casa: p.casa,
            }}
            path={`/parlamentares/${id}/fato/gasto`}
          />
        </div>
      )}

      <div className="border-line-default border-t pt-6">
        <Button asChild variant="outline">
          <a href={`/parlamentares/${id}`}>Ver o perfil completo de {p.nome}</a>
        </Button>
      </div>
    </div>
  )
}
