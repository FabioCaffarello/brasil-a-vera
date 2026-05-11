import { Filtros } from '@/components/parlamentar/filtros'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import {
  type Casa,
  getPartidosDistintos,
  getUfsDistintos,
  listParlamentares,
} from '@/lib/queries/parlamentares'

export const metadata = {
  title: 'Parlamentares — Brasil a Vera',
  description:
    'Deputados federais e senadores em exercício, filtráveis por casa, partido e UF.',
}

interface PageProps {
  searchParams: Promise<{
    casa?: string
    partido?: string
    uf?: string
  }>
}

function normalizeCasa(value: string | undefined): Casa | undefined {
  if (value === 'CAMARA' || value === 'SENADO') return value
  return undefined
}

export default async function ParlamentaresPage({ searchParams }: PageProps) {
  const params = await searchParams
  const filtros = {
    casa: normalizeCasa(params.casa),
    partido: params.partido?.trim() || undefined,
    uf: params.uf?.trim() || undefined,
  }

  const [parlamentares, partidos, ufs] = await Promise.all([
    listParlamentares(filtros),
    getPartidosDistintos(),
    getUfsDistintos(),
  ])

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          Parlamentares
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Deputados federais (Câmara) e senadores (Senado) em exercício na
          legislatura atual.
        </p>
      </header>

      <div className="mb-6">
        <Filtros partidos={partidos} ufs={ufs} selecionado={filtros} />
      </div>

      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
        {parlamentares.length}{' '}
        {parlamentares.length === 1 ? 'resultado' : 'resultados'}
      </p>

      {parlamentares.length === 0 ? (
        <p className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          Nenhum parlamentar corresponde aos filtros. Tente limpar e refinar.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parlamentares.map((p) => (
            <li key={p.id}>
              <ParlamentarCard parlamentar={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
