// Página-fato de um par de votos em direções opostas (card de fato — ADR-054).
//
// É a landing do card compartilhável: serve a imagem OG por-par (irmã
// `opengraph-image.tsx`) para os scrapers e, para humanos, mostra o fato com
// contexto + CTA para o perfil completo. `noindex` — é landing de share, não
// conteúdo canônico (o canônico é o perfil). Queries cacheadas (disciplina de
// custo Neon); sem `force-dynamic`.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ParesContraditorios } from '@/components/parlamentar/pares-contraditorios'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import {
  findPar,
  getCoerenciaStatsCached,
  getParesContraditoriosCached,
} from '@/lib/queries/coerencia'
import { getParlamentarById } from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string; voto1: string; voto2: string }>
}

const cargoLabel = (casa: string) =>
  casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id, voto1, voto2 } = await params
  const [p, pares] = await Promise.all([
    getParlamentarById(id),
    getParesContraditoriosCached(id, 10),
  ])
  const par = p ? findPar(pares, voto1, voto2) : undefined

  if (!p || !par) {
    return {
      title: 'Fato não encontrado — Brasil à Vera',
      robots: { index: false },
    }
  }

  return {
    title: `${p.nome} — votos em direções opostas · Brasil à Vera`,
    description: `Em ${par.tema}, ${p.nome} (${p.partidoSigla}/${p.uf}) votou em direções opostas sobre o mesmo tema. Veja as duas votações, as fontes oficiais e o contexto.`,
    // Landing de compartilhamento: não dilui o índice (o canônico é o perfil).
    robots: { index: false, follow: true },
  }
}

export default async function ContradicaoPage({ params }: PageProps) {
  const { id, voto1, voto2 } = await params
  const [p, pares, stats] = await Promise.all([
    getParlamentarById(id),
    getParesContraditoriosCached(id, 10),
    getCoerenciaStatsCached(id),
  ])

  if (!p) notFound()
  const par = findPar(pares, voto1, voto2)
  if (!par) notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-8">
      <Button asChild size="sm" variant="ghost">
        <a href={`/parlamentares/${id}#pares`}>
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

      <ParesContraditorios
        pares={[par]}
        parlamentar={{
          id: p.id,
          nome: p.nome,
          partidoSigla: p.partidoSigla,
          uf: p.uf,
          casa: p.casa,
        }}
        stats={stats}
      />

      <div className="border-line-default border-t pt-6">
        <Button asChild variant="outline">
          <a href={`/parlamentares/${id}`}>Ver o perfil completo de {p.nome}</a>
        </Button>
      </div>
    </div>
  )
}
