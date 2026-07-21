// Detalhe de frente parlamentar — Sprint 26.
// SSG revalidate 30d — ingestão mensal.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { getFrenteById } from '@/lib/queries/frentes'

export const revalidate = 2592000 // 30d

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params
  const frente = await getFrenteById(id)
  if (!frente) return { title: 'Frente Parlamentar — Brasil à Vera' }
  return {
    title: `${frente.nome} — Frentes Parlamentares — Brasil à Vera`,
    description: `Membros da frente parlamentar "${frente.nome}" (Legislatura ${frente.legislatura}).`,
  }
}

export default async function FrenteDetalhePage({ params }: PageProps) {
  const { id } = await params
  const frente = await getFrenteById(id)
  if (!frente) notFound()

  const coordenadores = frente.membros.filter((m) =>
    m.titulo?.toLowerCase().includes('coordenador'),
  )
  const demais = frente.membros.filter(
    (m) => !m.titulo?.toLowerCase().includes('coordenador'),
  )

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Frentes Parlamentares', href: '/frentes' },
          // Nomes de frente vêm longos e em caixa alta da fonte; sem truncar,
          // o crumb quebrava em 4 linhas (auditoria UX 2026-07-20, P2.8).
          {
            label:
              frente.nome.length > 60
                ? `${frente.nome.slice(0, 57)}…`
                : frente.nome,
          },
        ]}
      />

      <div className="mt-6 mb-8">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          {frente.nome}
        </h1>
        <p className="mt-2 text-fg-tertiary text-sm">
          Legislatura {frente.legislatura} · {frente.membros.length} membros
        </p>
      </div>

      {frente.membros.length === 0 ? (
        <p className="text-fg-tertiary text-sm">
          Nenhum membro registrado para esta frente.
        </p>
      ) : (
        <div className="space-y-6">
          {coordenadores.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold text-fg-primary text-base">
                Coordenação
              </h2>
              <ul className="space-y-2">
                {coordenadores.map((m) => (
                  <MembroCard key={m.parlamentarId} membro={m} />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-semibold text-fg-primary text-base">
              {coordenadores.length > 0 ? 'Demais membros' : 'Membros'}
            </h2>
            <ul className="space-y-2">
              {demais.map((m) => (
                <MembroCard key={m.parlamentarId} membro={m} />
              ))}
            </ul>
          </section>
        </div>
      )}

      <p className="mt-8 text-fg-tertiary text-xs">
        Frente parlamentar suprapartidária da Câmara dos Deputados. Dados da API
        oficial da Câmara, atualizados mensalmente.
      </p>
    </div>
  )
}

function MembroCard({
  membro,
}: {
  membro: {
    parlamentarId: string
    parlamentarNome: string
    parlamentarPartidoSigla: string | null
    parlamentarUf: string
    parlamentarUrlFoto: string | null
    titulo: string | null
  }
}) {
  return (
    <li>
      <Link
        className="group flex items-center gap-3 rounded-lg border border-line-default bg-surface-base p-3 hover:bg-surface-raised"
        href={`/parlamentares/${membro.parlamentarId}`}
      >
        <ParlamentarAvatar
          className="size-9 shrink-0"
          loading="lazy"
          nome={membro.parlamentarNome}
          size="sm"
          urlFoto={membro.parlamentarUrlFoto}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-fg-primary text-sm group-hover:underline">
            {membro.parlamentarNome}
          </p>
          <p className="text-fg-tertiary text-xs">
            {membro.parlamentarPartidoSigla ?? '—'}/{membro.parlamentarUf}
          </p>
        </div>
        {membro.titulo && (
          <span className="shrink-0 rounded-full bg-surface-subtle px-2.5 py-0.5 text-fg-secondary text-xs">
            {membro.titulo}
          </span>
        )}
      </Link>
    </li>
  )
}
