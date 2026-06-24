// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import { DataBadge } from '@fabio.caffarello/react-design-system/server'
import { Building2 } from 'lucide-react'
import { CompartilharButton } from '@/components/parlamentar/compartilhar-button'
import { ParlamentarAvatar } from '@/components/parlamentar/parlamentar-avatar'
import { TrustBadge } from '@/components/trust/trust-badge'
import { PartyBadge } from '@/design-system/compositions/party-badge'

interface AfastamentoAtivo {
  motivoSigla: string
  motivoDescricao: string | null
  dataInicio: string
  dataFim: string | null
}

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
  afastamentosAtivos?: AfastamentoAtivo[]
}

export function PerfilHeader({ parlamentar, afastamentosAtivos = [] }: Props) {
  const cargoLabel =
    parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const casaLabel =
    parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'
  const situacaoLower = parlamentar.situacaoMandato.toLowerCase()
  const situacaoAtipica =
    situacaoLower !== 'exercicio' && situacaoLower !== 'exercício'

  return (
    <header className="rounded-lg border border-line-default bg-surface-base p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <ParlamentarAvatar
          className="shrink-0 sm:size-28"
          nome={parlamentar.nome}
          size="2xl"
          urlFoto={parlamentar.urlFoto}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <DataBadge
              icon={<Building2 className="h-3 w-3" />}
              label={cargoLabel}
              source={casaLabel}
              tone="primary"
            />
            <DataBadge
              label={`${parlamentar.legislatura}ª legislatura`}
              tone="neutral"
            />
            {situacaoAtipica ? (
              <DataBadge label={parlamentar.situacaoMandato} tone="warning" />
            ) : null}
            {afastamentosAtivos.length > 0 ? (
              <DataBadge
                label="Em licença"
                source={
                  afastamentosAtivos[0].motivoDescricao ??
                  afastamentosAtivos[0].motivoSigla
                }
                tone="warning"
              />
            ) : null}
          </div>

          <div>
            <h1 className="font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
              {parlamentar.nome}
            </h1>
            {parlamentar.nomeCivil &&
              parlamentar.nomeCivil !== parlamentar.nome && (
                <p className="mt-1 text-fg-tertiary text-sm">
                  {parlamentar.nomeCivil}
                </p>
              )}
          </div>

          <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-fg-primary text-sm">
            <div className="flex items-center gap-2">
              <dt className="font-medium text-fg-tertiary">Partido:</dt>
              <dd>
                <PartyBadge
                  name={parlamentar.partidoNome}
                  sigla={parlamentar.partidoSigla}
                />
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="font-medium text-fg-tertiary">UF:</dt>
              <dd className="font-medium text-fg-primary">{parlamentar.uf}</dd>
            </div>
          </dl>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
            <TrustBadge trustLevel={parlamentar.trustLevel} />
            <a
              className="rounded text-fg-tertiary underline decoration-dotted underline-offset-2 hover:text-fg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
              href={parlamentar.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Ver na fonte oficial ↗
            </a>
          </div>

          <div className="pt-3">
            <CompartilharButton
              campaign="perfil"
              parlamentar={{
                nome: parlamentar.nome,
                partidoSigla: parlamentar.partidoSigla,
                uf: parlamentar.uf,
                casa: parlamentar.casa,
              }}
            />
          </div>
        </div>
      </div>
    </header>
  )
}
