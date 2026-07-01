// Listagem de vetos presidenciais (ADR-059, Sprint 13.2).
// SSG com revalidate 24h — ingestão mensal, resultados quase-imutáveis.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { CheckCircle, Clock, XCircle } from 'lucide-react'
import Link from 'next/link'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDataBR } from '@/lib/format'
import { getAnosComVetos, getVetosByAno } from '@/lib/queries/vetos'

export const revalidate = 86400

export const metadata = {
  title: 'Vetos presidenciais — Brasil à Vera',
  description:
    'Vetos presidenciais apreciados pelo Congresso Nacional. Veja como os senadores votaram na manutenção ou derrubada de cada veto.',
}

function SituacaoBadge({
  situacao,
  emTramitacao,
}: {
  situacao?: string | null
  emTramitacao: boolean
}) {
  if (emTramitacao) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 text-xs dark:bg-amber-900/30 dark:text-amber-300">
        <Clock className="h-3 w-3" aria-hidden />
        Em tramitação
      </span>
    )
  }
  if (situacao === 'Mantido') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 text-xs dark:bg-red-900/30 dark:text-red-300">
        <CheckCircle className="h-3 w-3" aria-hidden />
        Mantido
      </span>
    )
  }
  if (situacao === 'Rejeitado') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-300">
        <XCircle className="h-3 w-3" aria-hidden />
        Derrubado
      </span>
    )
  }
  return null
}

export default async function VetosPage() {
  const anos = await getAnosComVetos()

  if (anos.length === 0) {
    return (
      <div className="mx-auto max-w-3xl py-8">
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Vetos presidenciais' },
          ]}
        />
        <div className="mt-8">
          <EmptyState
            description="Os vetos presidenciais ainda não foram carregados. Execute a ingestão primeiro."
            title="Nenhum veto disponível"
          />
        </div>
      </div>
    )
  }

  // Carrega o ano mais recente por padrão
  const anoAtivo = anos[0]
  const vetos = await getVetosByAno(anoAtivo)

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Vetos presidenciais' },
        ]}
      />

      <div className="mt-6 mb-2">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Vetos presidenciais
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Vetos do Executivo apreciados pelo Congresso Nacional em sessão
          conjunta. "Mantido" = Congresso manteve o veto; "Derrubado" =
          Congresso rejeitou o veto e promulgou o trecho vetado.
        </p>
      </div>

      {/* Filtro por ano */}
      <div className="mb-6 flex flex-wrap gap-2">
        {anos.map((ano) => (
          <Link
            key={ano}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              ano === anoAtivo
                ? 'border-fg-primary bg-fg-primary text-surface-base'
                : 'border-line-default text-fg-secondary hover:border-fg-tertiary hover:text-fg-primary'
            }`}
            href={`/vetos?ano=${ano}`}
          >
            {ano}
          </Link>
        ))}
      </div>

      {vetos.length === 0 ? (
        <EmptyState
          description={`Nenhum veto registrado para ${anoAtivo}.`}
          title="Nenhum veto"
        />
      ) : (
        <ul className="space-y-3">
          {vetos.map((v) => (
            <li key={v.id}>
              <Link
                className="block rounded-lg border border-line-default bg-surface-base p-4 transition-colors hover:border-fg-quaternary hover:bg-surface-raised"
                href={`/vetos/${v.sourceId}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-fg-primary text-sm">
                        VET {v.numero}/{v.ano}
                      </span>
                      {v.vetoTotal && (
                        <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-fg-tertiary text-xs">
                          Total
                        </span>
                      )}
                      <SituacaoBadge emTramitacao={v.emTramitacao} />
                    </div>
                    {v.assunto && (
                      <p className="mb-1 font-medium text-fg-secondary text-sm">
                        {v.assunto}
                      </p>
                    )}
                    <p className="line-clamp-2 text-fg-tertiary text-xs">
                      {v.ementa}
                    </p>
                    {v.materiaVetadaSigla && v.materiaVetadaNumero && (
                      <p className="mt-1 text-fg-quaternary text-xs">
                        {v.materiaVetadaSigla} {v.materiaVetadaNumero}/
                        {v.materiaVetadaAno}
                      </p>
                    )}
                  </div>
                  {v.dataPublicacao && (
                    <span className="shrink-0 text-fg-quaternary text-xs">
                      {formatDataBR(v.dataPublicacao)}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-8 text-fg-tertiary text-xs">
        Fonte: API do Congresso Nacional. Votos nominais disponíveis apenas para
        senadores — ADR-059.
      </p>
    </div>
  )
}
