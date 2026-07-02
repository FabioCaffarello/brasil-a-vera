// Card de fato — proposições de autoria (ADR-054, issue #591).
//
// Landing compartilhável: serve a imagem OG (irmã opengraph-image.tsx)
// para scrapers e, para humanos, mostra o fato com contexto + CTA ao perfil.
// `noindex` — landing de share, não conteúdo canônico.
// Usa getComparacoesCasa (agregado) para o total — mais fiel que contar
// a página atual de getProposicoesAutoradas que tem limite de cursor.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CompartilharButton } from '@/components/parlamentar/compartilhar-button'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { formatPercentil } from '@/lib/format'
import {
  getComparacoesCasa,
  getParlamentarById,
} from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string }>
}

const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

const casaNome = (casa: string) =>
  casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'

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
    title: `${p.nome} — proposições de autoria · Brasil à Vera`,
    description: `Veja quantas proposições ${p.nome} (${p.partidoSigla}/${p.uf}) apresentou como autor ou coautor na ${casaNome(p.casa)}.`,
    robots: { index: false, follow: true },
  }
}

export default async function FatoProposicoesPage({ params }: PageProps) {
  const { id } = await params
  const [p, comparacoes] = await Promise.all([
    getParlamentarById(id),
    getComparacoesCasa(id),
  ])
  if (!p) notFound()

  const count = comparacoes.proposicoesCount
  const percentil = comparacoes.percentilProposicoesCasa
  const temDados = count !== null && count > 0

  const fatoMensagem = temDados
    ? `Apresentou ${count} proposições como autor ou coautor${percentil !== null ? ` — ${formatPercentil(percentil)} da ${casaNome(p.casa)}` : ''}.`
    : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Button asChild size="sm" variant="ghost">
        <a href={`/parlamentares/${id}#proposicoes`}>
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
          Proposições de autoria
        </h2>

        {!temDados ? (
          <p className="text-fg-secondary text-base">
            Nenhuma proposição de autoria registrada no banco de dados atual.
          </p>
        ) : (
          <>
            <p className="font-bold text-5xl text-fg-primary tabular-nums">
              {count}
            </p>
            <p className="text-fg-secondary text-base">
              proposições apresentadas como autor ou coautor na{' '}
              {casaNome(p.casa)}.
            </p>
            {percentil !== null && (
              <dl className="grid grid-cols-2 gap-4 border-t border-line-default pt-4">
                <div>
                  <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                    Total de proposições
                  </dt>
                  <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                    {count}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                    Posição na {casaNome(p.casa)}
                  </dt>
                  <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                    {formatPercentil(percentil)}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}

        <p className="text-fg-tertiary text-xs border-t border-line-default pt-3">
          Inclui PLs, PDLs, MPVs, Requerimentos e demais tipos de proposição
          ingeridos no Brasil à Vera. Autoria direta e coautoria contam da mesma
          forma. Pode não cobrir toda a produção legislativa histórica do
          parlamentar.
        </p>
      </div>

      {fatoMensagem && (
        <div className="flex justify-end">
          <CompartilharButton
            campaign="proposicoes"
            fato={{ mensagem: fatoMensagem }}
            parlamentar={{
              nome: p.nome,
              partidoSigla: p.partidoSigla ?? '',
              uf: p.uf,
              casa: p.casa,
            }}
            path={`/parlamentares/${id}/fato/proposicoes`}
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
