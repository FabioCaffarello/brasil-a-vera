// Card de fato — alinhamento partidário (ADR-054, issue #591).
//
// Landing compartilhável: serve a imagem OG (irmã opengraph-image.tsx)
// para scrapers e, para humanos, mostra o fato com contexto + CTA ao perfil.
// `noindex` — landing de share, não conteúdo canônico.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CompartilharButton } from '@/components/parlamentar/compartilhar-button'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { getAlinhamentoParlamentar } from '@/lib/queries/alinhamento'
import { getParlamentarById } from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string }>
}

const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

function buildFatoMensagem(
  percentual: number,
  alinhados: number,
  total: number,
  partidoSigla: string | null,
): string {
  const partido = partidoSigla ? ` ao ${partidoSigla}` : ''
  return `Votou com o partido${partido} em ${percentual}% das votações nominais comparáveis (${alinhados} de ${total} votos com orientação registrada).`
}

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
    title: `${p.nome} — alinhamento ao partido · Brasil à Vera`,
    description: `Veja em quantas votações nominais ${p.nome} (${p.partidoSigla}/${p.uf}) votou alinhado com o partido. Fonte: ${p.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}.`,
    robots: { index: false, follow: true },
  }
}

export default async function FatoAlinhamentoPage({ params }: PageProps) {
  const { id } = await params
  const [p, alinhamento] = await Promise.all([
    getParlamentarById(id),
    getAlinhamentoParlamentar(id),
  ])
  if (!p) notFound()

  const fatoMensagem =
    alinhamento.percentual !== null && !alinhamento.emFederacao
      ? buildFatoMensagem(
          alinhamento.percentual,
          alinhamento.alinhados,
          alinhamento.total,
          alinhamento.partidoSigla,
        )
      : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <Button asChild size="sm" variant="ghost">
        <a href={`/parlamentares/${id}#alinhamento`}>
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
          Alinhamento ao partido
        </h2>

        {alinhamento.emFederacao ? (
          <p className="text-fg-secondary text-base">
            Integrante de federação — o alinhamento por sigla partidária não é
            calculado. A Câmara publica orientação pela federação, não pela
            sigla individual.
          </p>
        ) : alinhamento.percentual === null ||
          alinhamento.amostraInsuficiente ? (
          <p className="text-fg-secondary text-base">
            Amostra insuficiente para calcular o alinhamento (menos de{' '}
            {alinhamento.total} votações comparáveis).
          </p>
        ) : (
          <>
            <p className="font-bold text-5xl text-fg-primary tabular-nums">
              {alinhamento.percentual}%
            </p>
            <p className="text-fg-secondary text-base">
              das votações nominais comparáveis foram alinhadas ao partido.
            </p>
            <dl className="grid grid-cols-3 gap-4 border-t border-line-default pt-4">
              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Total comparável
                </dt>
                <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                  {alinhamento.total}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Alinhados
                </dt>
                <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                  {alinhamento.alinhados}
                </dd>
              </div>
              <div>
                <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
                  Divergentes
                </dt>
                <dd className="font-semibold text-fg-primary text-xl tabular-nums">
                  {alinhamento.divergentes}
                </dd>
              </div>
            </dl>
          </>
        )}

        <p className="text-fg-tertiary text-xs border-t border-line-default pt-3">
          Mede o alinhamento prático com a orientação da liderança partidária —
          não implica posição ideológica. Exclui votos LIBERADO e AUSENTE.
          Fonte:{' '}
          {p.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'}.
        </p>
      </div>

      {fatoMensagem && (
        <div className="flex justify-end">
          <CompartilharButton
            campaign="alinhamento"
            fato={{ mensagem: fatoMensagem }}
            parlamentar={{
              nome: p.nome,
              partidoSigla: p.partidoSigla ?? '',
              uf: p.uf,
              casa: p.casa,
            }}
            path={`/parlamentares/${id}/fato/alinhamento`}
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
