// Listagem de frentes parlamentares — Sprint 26.
// Frentes suprapartidárias da Câmara dos Deputados.
// SSG revalidate 30d — ingestão mensal.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { Users } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { type FrenteListRow, listFrentes } from '@/lib/queries/frentes'

export const revalidate = 2592000 // 30d

// Auditoria UX 2026-07-20 (P0.3): a lista completa (todas as legislaturas)
// renderizava ~90.000px de página. Mantém SSG (sem searchParams) e esconde o
// excedente em <details> nativo — zero-JS, altura inicial controlada.
const FRENTES_VISIVEIS = 30

function FrenteLink({ frente }: { frente: FrenteListRow }) {
  return (
    <Link
      className="group flex items-center justify-between gap-3 rounded-lg border border-line-default bg-surface-base p-4 hover:bg-surface-raised"
      href={`/frentes/${frente.id}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Users className="h-4 w-4 shrink-0 text-fg-tertiary" aria-hidden />
        <span className="truncate font-medium text-fg-primary text-sm group-hover:underline">
          {frente.nome}
        </span>
      </div>
      <span className="shrink-0 text-fg-tertiary text-xs">
        {frente.membrosCount} membros
      </span>
    </Link>
  )
}

export const metadata: Metadata = {
  title: 'Frentes Parlamentares — Brasil à Vera',
  description:
    'Frentes parlamentares suprapartidárias da Câmara dos Deputados — agrupamentos temáticos de parlamentares em torno de causas comuns.',
}

export default async function FrentesPage() {
  const frentes = await listFrentes()

  return (
    <div className="mx-auto max-w-3xl py-8">
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
          Nenhuma frente registrada na base atual.
        </p>
      ) : (
        <>
          <p className="mb-4 text-fg-tertiary text-xs">
            {frentes.length} frentes registradas.
          </p>
          <ul className="space-y-2">
            {frentes.slice(0, FRENTES_VISIVEIS).map((f) => (
              <li key={f.id}>
                <FrenteLink frente={f} />
              </li>
            ))}
          </ul>
          {frentes.length > FRENTES_VISIVEIS && (
            <details className="mt-2">
              <summary className="cursor-pointer rounded-md py-1 text-fg-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2">
                Mostrar as outras {frentes.length - FRENTES_VISIVEIS} frentes
              </summary>
              <ul className="mt-2 space-y-2">
                {frentes.slice(FRENTES_VISIVEIS).map((f) => (
                  <li key={f.id}>
                    <FrenteLink frente={f} />
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  )
}
