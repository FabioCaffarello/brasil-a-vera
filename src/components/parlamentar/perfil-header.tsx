import { TrustBadge } from '@/components/trust/trust-badge'

interface Props {
  parlamentar: {
    nome: string
    nomeCivil: string | null
    casa: string
    partidoSigla: string
    partidoNome: string
    uf: string
    urlFoto: string | null
    legislatura: number
    situacaoMandato: string
    sourceUrl: string
    trustLevel: 'L1' | 'L2' | 'L3' | 'L4'
  }
}

export function PerfilHeader({ parlamentar }: Props) {
  const cargoLabel =
    parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const casaLabel =
    parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'

  return (
    <header className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900 sm:flex-row sm:items-start">
      {parlamentar.urlFoto ? (
        // biome-ignore lint/performance/noImgElement: dynamic remote
        <img
          src={parlamentar.urlFoto}
          alt={`Foto oficial de ${parlamentar.nome}`}
          className="size-24 shrink-0 rounded-full object-cover sm:size-28"
        />
      ) : (
        <div className="size-24 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700 sm:size-28" />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {parlamentar.nome}
          </h1>
          {parlamentar.nomeCivil &&
            parlamentar.nomeCivil !== parlamentar.nome && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {parlamentar.nomeCivil}
              </p>
            )}
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-zinc-700 dark:text-zinc-300 sm:grid-cols-2">
          <div>
            <dt className="inline font-medium">Cargo: </dt>
            <dd className="inline">{cargoLabel}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Casa: </dt>
            <dd className="inline">{casaLabel}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Partido: </dt>
            <dd className="inline">
              {parlamentar.partidoSigla}
              {parlamentar.partidoNome !== parlamentar.partidoSigla &&
                ` — ${parlamentar.partidoNome}`}
            </dd>
          </div>
          <div>
            <dt className="inline font-medium">UF: </dt>
            <dd className="inline">{parlamentar.uf}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Legislatura: </dt>
            <dd className="inline">{parlamentar.legislatura}ª</dd>
          </div>
          <div>
            <dt className="inline font-medium">Situação: </dt>
            <dd className="inline">
              {parlamentar.situacaoMandato.toLowerCase()}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
          <TrustBadge trustLevel={parlamentar.trustLevel} />
          <a
            href={parlamentar.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 underline decoration-dotted underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Ver na fonte oficial ↗
          </a>
        </div>
      </div>
    </header>
  )
}
