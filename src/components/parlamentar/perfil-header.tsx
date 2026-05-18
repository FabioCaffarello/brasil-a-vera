import { ArrowLeft, Building2 } from 'lucide-react'
import Link from 'next/link'

import { CompartilharButton } from '@/components/parlamentar/compartilhar-button'
import { TrustBadge } from '@/components/trust/trust-badge'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { PartyBadge } from '@/design-system/compositions/party-badge'

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

/**
 * Perfil header parlamentar — Sprint 6.3 PR 1 (Wave 6, reskin perfis) +
 * Wave 7 Sprint 7.2 PR2 (breadcrumb + Compartilhar).
 *
 * Refactor incremental vs Sprint 4.3 PR 1:
 * - DataBadges no topo (cargo + casa + legislatura + situação se ≠ exercício)
 * - h1 maior (text-3xl sm:text-4xl) — protagonismo da identidade
 * - PartyBadge inline (consome composição Sprint 6.0 PR 6 — cor por partido)
 * - Foto mantida em 112px (size-28) — mudar pra maior inflaria header sem
 *   ganho real; perfil parlamentar é cartão de identidade, não hero genérico
 *
 * Wave 7 Sprint 7.2 PR2 adiciona:
 * - Breadcrumb sutil "← Parlamentares" acima do header (contexto para
 *   visitantes vindos de link compartilhado)
 * - Botão "Compartilhar resumo" no fim do header (Client Component;
 *   conteúdo do Dialog completo chega na PR3). SEM "Comparar" (F12 fora
 *   da Wave 7).
 *
 * NÃO virou HeroSection (D4 do plano Sprint 6.3): HeroSection consome
 * .bg-hero + .grid-bg full-bleed que combina com contexto genérico (home,
 * listings), não com perfil específico. Aqui o card é "documento de
 * identidade", não cartaz.
 *
 * Estrutura semântica preservada: <header>, dl/dt/dd para metadados
 * estruturados, TrustBadge + source link inalterados.
 */
export function PerfilHeader({ parlamentar }: Props) {
  const cargoLabel =
    parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const casaLabel =
    parlamentar.casa === 'CAMARA' ? 'Câmara dos Deputados' : 'Senado Federal'
  const situacaoLower = parlamentar.situacaoMandato.toLowerCase()
  const situacaoAtipica =
    situacaoLower !== 'exercicio' && situacaoLower !== 'exercício'

  return (
    <div>
      <Link
        className="mb-3 inline-flex items-center gap-1 rounded text-foreground-muted text-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        href="/parlamentares"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Parlamentares
      </Link>

      <header className="rounded-lg border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
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

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <DataBadge
                icon={<Building2 className="h-3 w-3" />}
                label={cargoLabel}
                source={casaLabel}
                tone="brand"
              />
              <DataBadge
                label={`${parlamentar.legislatura}ª legislatura`}
                tone="default"
              />
              {situacaoAtipica ? (
                <DataBadge label={parlamentar.situacaoMandato} tone="warning" />
              ) : null}
            </div>

            <div>
              <h1 className="font-semibold text-3xl text-foreground tracking-tight sm:text-4xl">
                {parlamentar.nome}
              </h1>
              {parlamentar.nomeCivil &&
                parlamentar.nomeCivil !== parlamentar.nome && (
                  <p className="mt-1 text-foreground-muted text-sm">
                    {parlamentar.nomeCivil}
                  </p>
                )}
            </div>

            <dl className="flex flex-wrap items-center gap-x-4 gap-y-2 text-foreground text-sm">
              <div className="flex items-center gap-2">
                <dt className="font-medium text-foreground-muted">Partido:</dt>
                <dd>
                  <PartyBadge
                    name={parlamentar.partidoNome}
                    sigla={parlamentar.partidoSigla}
                  />
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium text-foreground-muted">UF:</dt>
                <dd className="font-medium text-foreground">
                  {parlamentar.uf}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
              <TrustBadge trustLevel={parlamentar.trustLevel} />
              <a
                className="rounded text-foreground-muted underline decoration-dotted underline-offset-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={parlamentar.sourceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Ver na fonte oficial ↗
              </a>
            </div>

            <div className="pt-3">
              <CompartilharButton
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
    </div>
  )
}
