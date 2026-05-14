import { useParams, Link } from 'wouter'
import { useGetPartido } from '@workspace/api-client-react'
import { PartidoHeader } from '@/components/partido/header'
import { BancadaList } from '@/components/partido/bancada-list'

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

export default function PartidoPage() {
  const { sigla } = useParams<{ sigla: string }>()
  const { data, isLoading, error } = useGetPartido(sigla.toUpperCase())

  if (isLoading) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-semibold">Partido não encontrado</h1>
        <Link href="/parlamentares" className="mt-4 inline-block text-sm text-blue-600 underline">Voltar</Link>
      </div>
    )
  }

  const d = data as Record<string, unknown>
  const membros = (d.parlamentares as Array<Record<string, unknown>>) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <PartidoHeader
        sigla={String(d.sigla)}
        nomeOficial={d.nomeOficial ? String(d.nomeOficial) : null}
        totalParlamentares={Number(d.totalParlamentares ?? 0)}
      />

      {d.fidelidadeMedia != null && (
        <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Fidelidade interna média
          </h2>
          <p className="text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
            {d.fidelidadeMedia}%
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Média de {d.parlamentaresElegiveis} parlamentar(es) com ≥50 votos comparáveis.
          </p>
        </section>
      )}

      <Section title={`Bancada (${membros.length})`}>
        <BancadaList membros={membros.map((m) => ({
          id: String(m.id),
          nome: String(m.nome),
          casa: m.casa as 'CAMARA' | 'SENADO',
          uf: String(m.uf),
          urlFoto: m.urlFoto ? String(m.urlFoto) : null,
        }))} />
      </Section>
    </div>
  )
}
