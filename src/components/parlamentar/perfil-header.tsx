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

// Sprint 4.3 PR 1 — refatorado para tokens semânticos OKLCH.
// Foto remota via <img> nativo (biome-ignore documentado; Next/Image
// exigiria remotePatterns em next.config.ts para camara.leg.br e
// senado.leg.br — sem ganho proporcional ao overhead). Dimensões
// explícitas preservam CLS=0.
export function PerfilHeader({ parlamentar }: Props) {
  const cargoLabel =
    parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const casaLabel =
    parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'

  return (
    <header className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 sm:flex-row sm:items-start">
      {parlamentar.urlFoto ? (
        // biome-ignore lint/performance/noImgElement: foto vem de domínio externo (camara.leg.br / senado.leg.br); Next/Image exige config de remote patterns. Largura/altura explícitas reservam espaço e evitam CLS.
        <img
          alt={`Foto oficial de ${parlamentar.nome}`}
          className="size-24 shrink-0 rounded-full object-cover sm:size-28"
          height={112}
          src={parlamentar.urlFoto}
          width={112}
        />
      ) : (
        <div
          aria-hidden="true"
          className="size-24 shrink-0 rounded-full bg-surface-elevated sm:size-28"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <h1 className="font-semibold text-2xl text-foreground">
            {parlamentar.nome}
          </h1>
          {parlamentar.nomeCivil &&
            parlamentar.nomeCivil !== parlamentar.nome && (
              <p className="text-foreground-muted text-sm">
                {parlamentar.nomeCivil}
              </p>
            )}
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-foreground text-sm sm:grid-cols-2">
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
            className="text-foreground-muted underline decoration-dotted underline-offset-2 hover:text-foreground"
            href={parlamentar.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Ver na fonte oficial ↗
          </a>
        </div>
      </div>
    </header>
  )
}
