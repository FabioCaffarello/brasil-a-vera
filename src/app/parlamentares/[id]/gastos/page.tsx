// Detalhe de gastos CEAP — "filtros + lista paginada por cursor".
// Promovida ao RDS (migração strangler-fig, ADR-033). Consome o design
// system @fabio.caffarello/react-design-system — tokens traduzidos pela
// tabela canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// Página AUTOCONTIDA: a lógica vive inline no page.tsx (sem componentes
// de domínio em src/components). Sem data-viz/charts.
//
// Componentes do RDS:
// - FilterChips (wrapper) + Label vêm do /server (server-safe; <label>
//   nativo, sem hooks client).
// - Chip (item) é local de @/design-system/compositions —
//   server-safe/zero-JS; os chips são <Link> (ADR-022), e o Chip do RDS
//   é client (+5.759 bytes/rota). Decisão do owner na §3.9.
//
// Cursor (ADR-026): cursor inválido → redirect 308 que strip o param.

import {
  Chip,
  FilterChips,
  Label,
} from '@fabio.caffarello/react-design-system/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import { decodeCursor } from '@/lib/cursor'
import { formatBRL, formatDataBR } from '@/lib/format'
import { CursorGastosV1 } from '@/lib/queries/cursor-schemas'
import {
  GASTOS_TRIMESTRES,
  type GastosTrimestreFilter,
  getAnosGastos,
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
    ano?: string
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
  'min-h-[44px] rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

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

  const anoCorrente = new Date().getFullYear()
  const anoParam = sp.ano ? Number.parseInt(sp.ano, 10) : NaN
  const ano = Number.isFinite(anoParam) ? anoParam : anoCorrente

  const [{ rows, nextCursor }, categoriasDisponiveis, anosDisponiveis] =
    await Promise.all([
      getGastosDetalhe(parlamentar.id, ano, {
        cursor,
        trimestre,
        categoria,
      }),
      getGastosCategoriasDistintas(parlamentar.id, ano),
      getAnosGastos(parlamentar.id),
    ])

  // Helper que troca um filtro mantendo os demais; sempre reseta cursor.
  const buildFiltroHref = (overrides: Record<string, string | null>) =>
    buildHref(parlamentar.id, sp, { ...overrides, after: null })

  return (
    <div className="mx-auto max-w-4xl py-8">
      <Link
        className="mb-3 inline-flex items-center gap-1 rounded text-fg-tertiary text-sm hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
        href={`/parlamentares/${parlamentar.id}`}
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        {parlamentar.nome}
      </Link>

      <header className="mb-6">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Gastos CEAP
        </h1>
        <p className="mt-1 text-fg-tertiary text-sm">
          {parlamentar.nome} ({parlamentar.partidoSigla}/{parlamentar.uf}) —
          Cota para Exercício da Atividade Parlamentar reportada pela Câmara.
          Senado tem regime próprio, ainda não ingerido.
        </p>
      </header>

      <div className="mb-4 space-y-3 rounded-lg border border-line-default bg-surface-base p-4">
        {anosDisponiveis.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 border-line-default border-b pb-3">
            <Label className="text-fg-tertiary text-xs" htmlFor="filtro-ano">
              Ano
            </Label>
            {anosDisponiveis.map((a) => (
              <Chip asChild key={a} selected={a === ano}>
                <Link href={buildFiltroHref({ ano: String(a), after: null })}>
                  {a}
                </Link>
              </Chip>
            ))}
          </div>
        )}
        <FilterChips label="Período">
          {GASTOS_TRIMESTRES.map((t) => (
            <Chip asChild key={t} selected={(trimestre ?? 'todo') === t}>
              <Link
                href={buildFiltroHref({ trimestre: t === 'todo' ? null : t })}
              >
                {TRIMESTRE_LABEL[t]}
              </Link>
            </Chip>
          ))}
        </FilterChips>

        {categoriasDisponiveis.length > 0 ? (
          <form
            action={`/parlamentares/${parlamentar.id}/gastos`}
            className="border-line-default border-t pt-3"
            method="get"
          >
            {trimestre ? (
              <input name="trimestre" type="hidden" value={trimestre} />
            ) : null}
            {ano !== anoCorrente ? (
              <input name="ano" type="hidden" value={String(ano)} />
            ) : null}
            <div className="flex flex-col gap-1">
              <Label
                className="text-fg-tertiary text-xs"
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
                  className="inline-flex items-center rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                  type="submit"
                >
                  Filtrar
                </button>
                {categoria ? (
                  <Link
                    className="text-fg-tertiary text-sm hover:text-fg-primary"
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
        <p className="text-fg-tertiary text-sm">
          {cursor || trimestre || categoria
            ? 'Sem gastos para os filtros selecionados.'
            : `Sem gastos CEAP registrados em ${ano} para este parlamentar.`}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-line-default">
          <table className="w-full text-sm">
            <thead className="bg-surface-base text-fg-tertiary text-xs uppercase tracking-wider">
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
                  className="border-line-default border-t hover:bg-surface-base"
                  key={g.gastoId}
                >
                  <td className="whitespace-nowrap px-3 py-2 tabular-nums text-fg-tertiary text-xs">
                    {formatDataBR(g.dataEmissao)}
                  </td>
                  <td className="px-3 py-2 text-fg-primary">
                    {g.categoriaDescricao}
                  </td>
                  <td className="px-3 py-2 text-fg-primary">
                    {g.urlDocumento ? (
                      <a
                        className="underline decoration-dotted underline-offset-2 hover:text-fg-tertiary"
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
                      <span className="ml-2 font-mono text-fg-tertiary text-xs">
                        {g.fornecedorCnpjCpf}
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-fg-primary">
                    {formatBRL(g.valor)}
                    {g.valorGlosa && Number(g.valorGlosa) > 0 ? (
                      <span className="block text-fg-tertiary text-xs">
                        −{formatBRL(g.valorGlosa)} glosado
                      </span>
                    ) : null}
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
          className="mt-4 block w-full rounded-md border border-line-emphasis bg-surface-canvas py-2 text-center font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href={`${buildHref(parlamentar.id, sp, { after: nextCursor })}#mostrar-mais-gastos`}
          id="mostrar-mais-gastos"
        >
          Mostrar mais
        </a>
      ) : null}
    </div>
  )
}
