import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { decodeCursor } from '@/lib/cursor'
import { formatBRL, formatDataBR } from '@/lib/format'
import { CursorGastosV1 } from '@/lib/queries/cursor-schemas'
import {
  getGastosDetalhe,
  getParlamentarById,
} from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    after?: string
  }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) return { title: 'Gastos — Brasil à Vera' }
  const ano = new Date().getFullYear()
  const title = `Gastos CEAP ${ano} — ${parlamentar.nome} — Brasil à Vera`
  const description = `Detalhamento de gastos CEAP de ${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) em ${ano}.`
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

function buildHref(
  parlamentarId: string,
  overrides: Record<string, string | null>,
): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value)
    }
  }
  const qs = params.toString()
  return `/parlamentares/${parlamentarId}/gastos${qs ? `?${qs}` : ''}`
}

export default async function GastosDetalhePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) notFound()

  // Cursor (ADR-026): null = inválido → redirect 308 strip o param.
  const cursor = decodeCursor(sp.after, CursorGastosV1)
  if (cursor === null) {
    permanentRedirect(buildHref(parlamentar.id, { after: null }))
  }

  const ano = new Date().getFullYear()
  const { rows, nextCursor } = await getGastosDetalhe(parlamentar.id, ano, {
    cursor,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        className="mb-3 inline-flex items-center gap-1 rounded text-foreground-muted text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href={`/parlamentares/${parlamentar.id}`}
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        {parlamentar.nome}
      </Link>

      <header className="mb-6">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Gastos CEAP {ano}
        </h1>
        <p className="mt-1 text-foreground-muted text-sm">
          {parlamentar.nome} ({parlamentar.partidoSigla}/{parlamentar.uf}) —
          Cota para Exercício da Atividade Parlamentar reportada pela Câmara.
          Senado tem regime próprio, ainda não ingerido.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          {cursor
            ? 'Sem mais gastos para mostrar nesta paginação.'
            : `Sem gastos CEAP registrados em ${ano} para este parlamentar.`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-foreground-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Categoria</th>
                <th className="px-3 py-2 text-left font-medium">Fornecedor</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr
                  className="border-border border-t hover:bg-surface"
                  key={g.gastoId}
                >
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-foreground-muted text-xs">
                    {formatDataBR(g.dataEmissao)}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {g.categoriaDescricao}
                  </td>
                  <td className="px-3 py-2 text-foreground">
                    {g.urlDocumento ? (
                      <a
                        className="underline decoration-dotted underline-offset-2 hover:text-foreground-muted"
                        href={g.urlDocumento}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {g.fornecedorNome}
                      </a>
                    ) : (
                      g.fornecedorNome
                    )}
                    {g.fornecedorCnpjCpf ? (
                      <span className="ml-2 font-mono text-foreground-muted text-xs">
                        {g.fornecedorCnpjCpf}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-foreground">
                    {formatBRL(g.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {nextCursor ? (
        <a
          className="mt-4 block w-full rounded-md border border-border-strong bg-background py-2 text-center font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={buildHref(parlamentar.id, { after: nextCursor })}
        >
          Mostrar mais
        </a>
      ) : null}
    </div>
  )
}
