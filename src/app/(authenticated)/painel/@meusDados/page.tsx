// Componente do painel (área logada) — promovido ao RDS (ADR-033). Slot Meus dados (RSC) — dashboard LGPD em
// 3 blocos (Seus dados / Suas solicitações / Ações).
//
// `auth()` (Clerk) + queries (data-request, user-profile) preservadas.
// `AcoesLgpd` importado do ORIGINAL (client island — 3 botões + modais).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//   border-border         → border-line-default
//   bg-surface            → bg-surface-base
//   text-brand            → text-fg-brand          (byte-idêntico pós-#358)
//   hover:text-foreground → hover:text-fg-primary
//
// Token MANTIDO (decisão de classe CONHECIDA — utility Tailwind PADRÃO,
// byte-idêntica dos dois lados, NÃO apelido semântico do BaV): `text-red-500`
// (status "failed" de solicitação LGPD). Regra 1 NÃO disparada — mesma régua de
// utility homônimo do `bg-success/N` (§3.17 decisão 2): não há tradução porque
// o valor já é idêntico. Inconsistência do ORIGINAL (usa `text-red-500` aqui em
// vez de `text-destructive`); preservada 1:1 para não introduzir divergência —
// calibra na promoção junto com o original.
//
// Href "voltar" reescrito pra /painel?tab=configuracoes.

import { auth } from '@clerk/nextjs/server'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

import { AcoesLgpd } from '@/components/painel/meus-dados/acoes-lgpd'
import { listDataRequestsByUser } from '@/lib/queries/data-request'
import {
  findUserProfileById,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const KIND_LABELS: Record<string, string> = {
  export: 'Exportação',
  erase: 'Eliminação',
  anonymize: 'Anonimização',
  rectify: 'Correção',
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'na fila',
  running: 'processando',
  done: 'concluído',
  failed: 'falhou',
}

function formatDateTime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  })
}

export default async function MeusDadosSlot() {
  const { userId } = await auth()
  if (!userId) return null

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return (
      <div className="container mx-auto max-w-2xl py-16 text-fg-tertiary">
        Não conseguimos carregar seu perfil. Tente atualizar a página em alguns
        segundos.
      </div>
    )
  }

  const [profile, requests] = await Promise.all([
    findUserProfileById(internalUserId),
    listDataRequestsByUser(internalUserId, 20),
  ])

  if (!profile) {
    return (
      <div className="container mx-auto max-w-2xl py-16 text-fg-tertiary">
        Perfil não encontrado.
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <Link
        className="inline-flex items-center gap-2 text-fg-tertiary text-sm hover:text-fg-primary"
        href="/painel?tab=configuracoes"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Configurações
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight">
          Meus dados
        </h1>
        <p className="mt-2 text-fg-tertiary">
          O que registramos sobre você, suas solicitações LGPD e as ações
          disponíveis (art. 18).
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-medium text-fg-tertiary text-sm uppercase tracking-wide">
          Seus dados
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-line-default bg-surface-base p-4 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-fg-tertiary">Email</dt>
          <dd className="text-fg-primary">{profile.email || '—'}</dd>

          <dt className="text-fg-tertiary">Nome de exibição</dt>
          <dd className="text-fg-primary">{profile.displayName ?? '—'}</dd>

          <dt className="text-fg-tertiary">UF</dt>
          <dd className="text-fg-primary">{profile.uf ?? '—'}</dd>

          <dt className="text-fg-tertiary">Temas de interesse</dt>
          <dd className="text-fg-primary">
            {profile.themes.length > 0 ? profile.themes.join(', ') : '—'}
          </dd>

          <dt className="text-fg-tertiary">Marketing opt-in</dt>
          <dd className="text-fg-primary">
            {profile.marketingOptedIn ? 'Sim' : 'Não'}
          </dd>

          <dt className="text-fg-tertiary">Survey opt-in</dt>
          <dd className="text-fg-primary">
            {profile.surveyOptedIn ? 'Sim' : 'Não'}
          </dd>

          <dt className="text-fg-tertiary">Conta criada</dt>
          <dd className="text-fg-primary">
            {formatDateTime(profile.createdAt)}
          </dd>

          <dt className="text-fg-tertiary">Onboarding</dt>
          <dd className="text-fg-primary">
            {profile.onboardedAt
              ? formatDateTime(profile.onboardedAt)
              : 'pendente'}
          </dd>

          {profile.deletedAt && (
            <>
              <dt className="text-fg-tertiary">Eliminação solicitada</dt>
              <dd className="text-fg-primary">
                {formatDateTime(profile.deletedAt)} (hard delete em até 30 dias)
              </dd>
            </>
          )}
        </dl>
        <p className="mt-3 text-fg-tertiary text-xs">
          Quer o conjunto completo (parlamentares acompanhados, histórico de
          reports, log de consentimentos)? Use <strong>Exportar JSON</strong>{' '}
          abaixo.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-medium text-fg-tertiary text-sm uppercase tracking-wide">
          Suas solicitações ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-line-default bg-surface-base p-4 text-fg-tertiary text-sm">
            Nenhuma solicitação LGPD ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                className="flex items-center justify-between rounded-md border border-line-default bg-surface-base px-3 py-2 text-sm"
                key={r.id}
              >
                <div>
                  <span className="font-medium text-fg-primary">
                    {KIND_LABELS[r.kind] ?? r.kind}
                  </span>
                  <span className="ml-2 text-fg-tertiary text-xs">
                    {formatDateTime(r.requestedAt)}
                  </span>
                </div>
                <span
                  className={
                    r.status === 'done'
                      ? 'text-fg-tertiary text-xs'
                      : r.status === 'failed'
                        ? 'text-red-500 text-xs'
                        : 'text-fg-brand text-xs'
                  }
                >
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-medium text-fg-tertiary text-sm uppercase tracking-wide">
          Ações LGPD
        </h2>
        <AcoesLgpd />
      </section>
    </div>
  )
}
