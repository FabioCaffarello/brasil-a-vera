// `/painel/configuracoes/meus-dados` — Wave 10 Etapa 9.5.
//
// Dashboard LGPD em 3 blocos:
//   1. Seus dados: dump do que registramos (transparência ativa).
//   2. Suas solicitações: histórico de pedidos LGPD (auditoria).
//   3. Ações: 3 botões (Exportar / Anonimizar / Eliminar) com
//      modais de confirmação calibrados por gravidade.
//
// RSC server-side — carrega dados em paralelo, passa para o
// client component <AcoesLgpd /> apenas os 3 botões. Sem flash.

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
export const metadata = {
  title: 'Meus dados — Brasil à Vera',
}

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

export default async function MeusDadosPage() {
  const { userId } = await auth()
  if (!userId) return null

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-foreground-muted">
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
      <div className="container mx-auto max-w-2xl px-4 py-16 text-foreground-muted">
        Perfil não encontrado.
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link
        className="inline-flex items-center gap-2 text-foreground-muted text-sm hover:text-foreground"
        href="/painel/configuracoes"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Configurações
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="font-semibold text-3xl text-foreground tracking-tight">
          Meus dados
        </h1>
        <p className="mt-2 text-foreground-muted">
          O que registramos sobre você, suas solicitações LGPD e as ações
          disponíveis (art. 18).
        </p>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 font-medium text-foreground-muted text-sm uppercase tracking-wide">
          Seus dados
        </h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-4 text-sm sm:grid-cols-[max-content_1fr]">
          <dt className="text-foreground-muted">Email</dt>
          <dd className="text-foreground">{profile.email || '—'}</dd>

          <dt className="text-foreground-muted">Nome de exibição</dt>
          <dd className="text-foreground">{profile.displayName ?? '—'}</dd>

          <dt className="text-foreground-muted">UF</dt>
          <dd className="text-foreground">{profile.uf ?? '—'}</dd>

          <dt className="text-foreground-muted">Temas de interesse</dt>
          <dd className="text-foreground">
            {profile.themes.length > 0 ? profile.themes.join(', ') : '—'}
          </dd>

          <dt className="text-foreground-muted">Marketing opt-in</dt>
          <dd className="text-foreground">
            {profile.marketingOptedIn ? 'Sim' : 'Não'}
          </dd>

          <dt className="text-foreground-muted">Survey opt-in</dt>
          <dd className="text-foreground">
            {profile.surveyOptedIn ? 'Sim' : 'Não'}
          </dd>

          <dt className="text-foreground-muted">Conta criada</dt>
          <dd className="text-foreground">
            {formatDateTime(profile.createdAt)}
          </dd>

          <dt className="text-foreground-muted">Onboarding</dt>
          <dd className="text-foreground">
            {profile.onboardedAt
              ? formatDateTime(profile.onboardedAt)
              : 'pendente'}
          </dd>

          {profile.deletedAt && (
            <>
              <dt className="text-foreground-muted">Eliminação solicitada</dt>
              <dd className="text-foreground">
                {formatDateTime(profile.deletedAt)} (hard delete em até 30 dias)
              </dd>
            </>
          )}
        </dl>
        <p className="mt-3 text-foreground-muted text-xs">
          Quer o conjunto completo (parlamentares acompanhados, histórico de
          reports, log de consentimentos)? Use <strong>Exportar JSON</strong>{' '}
          abaixo.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-medium text-foreground-muted text-sm uppercase tracking-wide">
          Suas solicitações ({requests.length})
        </h2>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-4 text-foreground-muted text-sm">
            Nenhuma solicitação LGPD ainda.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-sm"
                key={r.id}
              >
                <div>
                  <span className="font-medium text-foreground">
                    {KIND_LABELS[r.kind] ?? r.kind}
                  </span>
                  <span className="ml-2 text-foreground-muted text-xs">
                    {formatDateTime(r.requestedAt)}
                  </span>
                </div>
                <span
                  className={
                    r.status === 'done'
                      ? 'text-foreground-muted text-xs'
                      : r.status === 'failed'
                        ? 'text-red-500 text-xs'
                        : 'text-brand text-xs'
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
        <h2 className="mb-3 font-medium text-foreground-muted text-sm uppercase tracking-wide">
          Ações LGPD
        </h2>
        <AcoesLgpd />
      </section>
    </div>
  )
}
