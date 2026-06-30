// Listagem de frentes parlamentares — Sprint 26.
// Frentes suprapartidárias da Câmara dos Deputados.
// SSG revalidate 30d — ingestão mensal.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { listFrentes } from '@/lib/queries/frentes'

export const revalidate = 2592000 // 30d

export const metadata: Metadata = {
  title: 'Frentes Parlamentares — Brasil à Vera',
  description:
    'Frentes parlamentares suprapartidárias da Câmara dos Deputados — agrupamentos temáticos de parlamentares em torno de causas comuns.',
}

export default async function FrentesPage() {
  const frentes = await listFrentes()

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Frentes Parlamentares' },
        ]}
      />

      <div className="mt-6 mb-8">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Frentes Parlamentares
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Agrupamentos suprapartidários da Câmara dos Deputados organizados em
          torno de causas ou temas comuns. Qualquer parlamentar pode integrar
          uma frente independentemente do partido.
        </p>
      </div>

      {frentes.length === 0 ? (
        <p className="text-fg-tertiary text-sm">
          Nenhuma frente registrada. Execute a ingestão `camara-frentes` para
          popular os dados.
        </p>
      ) : (
        <>
          <p className="mb-4 text-fg-tertiary text-xs">
            {frentes.length} frentes registradas.
          </p>
          <ul className="space-y-2">
            {frentes.map((f) => (
              <li key={f.id}>
                <Link
                  className="group flex items-center justify-between gap-3 rounded-lg border border-line-default bg-surface-base p-4 hover:bg-surface-raised"
                  href={`/frentes/${f.id}`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Users
                      className="h-4 w-4 shrink-0 text-fg-tertiary"
                      aria-hidden
                    />
                    <span className="truncate font-medium text-fg-primary text-sm group-hover:underline">
                      {f.nome}
                    </span>
                  </div>
                  <span className="shrink-0 text-fg-tertiary text-xs">
                    {f.membrosCount} membros
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  )
}
