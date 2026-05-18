import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { Label } from '@/design-system/primitives/label'
import { decodeCursor } from '@/lib/cursor'
import { formatBRL, formatDataBR } from '@/lib/format'
import { CursorGastosV1 } from '@/lib/queries/cursor-schemas'
import {
  GASTOS_TRIMESTRES,
  type GastosTrimestreFilter,
  getGastosCategoriasDistintas,
  getGastosDetalhe,
  getParlamentarById,
} from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    after?: string
    trimestre?: string
    categoria?: string
  }>
}

const TRIMESTRE_LABEL: Record<GastosTrimestreFilter, string> = {
  todo: 'Ano todo',
  Q1: 'Jan–Mar',
  Q2: 'Abr–Jun',
  Q3: 'Jul–Set',
  Q4: 'Out–Dez',
}

const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

function normalizeTrimestre(
  v: string | undefined,
): GastosTrimestreFilter | undefined {
  if (v && (GASTOS_TRIMESTRES as string[]).includes(v)) {
    return v as GastosTrimestreFilter
  }
  return undefined
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
  searchParams: Record<string, string | undefined>,
  overrides: Record<string, string | null>,
): string {
  const merged: Record<string, string | undefined | null> = {
    ...searchParams,
    ...overrides,
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value))
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
    permanentRedirect(buildHref(parlamentar.id, sp, { after: null }))
  }
  const trimestre = normalizeTrimestre(sp.trimestre)
  const categoria = sp.categoria?.trim() || undefined

  const ano = new Date().getFullYear()
  const [{ rows, nextCursor }, categoriasDisponiveis] = await Promise.all([
    getGastosDetalhe(parlamentar.id, ano, {
      cursor,
      trimestre,
      categoria,
    }),
    getGastosCategoriasDistintas(parlamentar.id, ano),
  ])

  // Helper que troca um filtro mantendo os demais; sempre reseta cursor.
  const buildFiltroHref = (overrides: Record<string, string | null>) =>
    buildHref(parlamentar.id, sp, { ...overrides, after: null })

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

      <div className="mb-4 space-y-3 rounded-lg border border-border bg-surface p-4">
        <FilterChips label="Período">
          {GASTOS_TRIMESTRES.map((t) => (
            <FilterChip asChild key={t} selected={(trimestre ?? 'todo') === t}>
              <Link
                href={buildFiltroHref({ trimestre: t === 'todo' ? null : t })}
              >
                {TRIMESTRE_LABEL[t]}
              </Link>
            </FilterChip>
          ))}
        </FilterChips>

        {categoriasDisponiveis.length > 0 ? (
          <form
            action={`/parlamentares/${parlamentar.id}/gastos`}
            className="border-border border-t pt-3"
            method="get"
          >
            {trimestre ? (
              <input name="trimestre" type="hidden" value={trimestre} />
            ) : null}
            <div className="flex flex-col gap-1">
              <Label
                className="text-foreground-muted text-xs"
                htmlFor="filtro-categoria"
              >
                Categoria
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={SELECT_CLASS}
                  defaultValue={categoria ?? ''}
                  id="filtro-categoria"
                  name="categoria"
                >
                  <option value="">Todas</option>
                  {categoriasDisponiveis.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex items-center rounded-md border border-border-strong bg-background px-3 py-2 font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  type="submit"
                >
                  Filtrar
                </button>
                {categoria ? (
                  <Link
                    className="text-foreground-muted text-sm hover:text-foreground"
                    href={buildFiltroHref({ categoria: null })}
                  >
                    Limpar
                  </Link>
                ) : null}
              </div>
            </div>
          </form>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-foreground-muted text-sm">
          {cursor || trimestre || categoria
            ? 'Sem gastos para os filtros selecionados.'
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
        // Ancora no próprio botão: navegação para a próxima página
        // posiciona scroll no novo botão (mesmo offset visual), em vez
        // de resetar para o topo da página.
        <a
          className="mt-4 block w-full rounded-md border border-border-strong bg-background py-2 text-center font-medium text-foreground text-sm hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={`${buildHref(parlamentar.id, sp, { after: nextCursor })}#mostrar-mais-gastos`}
          id="mostrar-mais-gastos"
        >
          Mostrar mais
        </a>
      ) : null}
    </div>
  )
}
