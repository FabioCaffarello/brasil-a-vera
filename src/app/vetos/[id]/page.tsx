// Detalhe de um veto presidencial (ADR-059, Sprint 13.2).
// Mostra dispositivos vetados, resultado por dispositivo e votos do Senado.

import {
  Breadcrumb,
  DataBadge,
} from '@fabio.caffarello/react-design-system/server'
import { CheckCircle, Clock, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDataBR } from '@/lib/format'
import type { VotoDetalhe } from '@/lib/queries/vetos'
import { getVetoDetalhe } from '@/lib/queries/vetos'

export const revalidate = 86400

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const detalhe = await getVetoDetalhe(id)
  if (!detalhe) return {}
  return {
    title: `VET ${detalhe.numero}/${detalhe.ano} — Brasil à Vera`,
    description: detalhe.assunto ?? detalhe.ementa.slice(0, 160),
  }
}

function VotoChip({ voto }: { voto: string }) {
  if (voto === 'SIM') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800 text-xs dark:bg-green-900/30 dark:text-green-300">
        <ThumbsUp className="h-3 w-3" aria-hidden />
        Sim
      </span>
    )
  }
  if (voto === 'NAO') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800 text-xs dark:bg-red-900/30 dark:text-red-300">
        <ThumbsDown className="h-3 w-3" aria-hidden />
        Não
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-fg-tertiary text-xs">
      {voto.toLowerCase()}
    </span>
  )
}

function SituacaoIcon({ situacao }: { situacao: string | null }) {
  if (situacao === 'Mantido') {
    return (
      <span className="inline-flex items-center gap-1 text-red-700 text-sm dark:text-red-400">
        <CheckCircle className="h-4 w-4" aria-hidden />
        Mantido
      </span>
    )
  }
  if (situacao === 'Rejeitado') {
    return (
      <span className="inline-flex items-center gap-1 text-green-700 text-sm dark:text-green-400">
        <XCircle className="h-4 w-4" aria-hidden />
        Derrubado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-amber-700 text-sm dark:text-amber-400">
      <Clock className="h-4 w-4" aria-hidden />
      Em tramitação
    </span>
  )
}

function VotosDispositivo({ votos }: { votos: VotoDetalhe[] }) {
  if (votos.length === 0) {
    return (
      <p className="text-fg-tertiary text-xs">
        Votos nominais não disponíveis para este dispositivo.
      </p>
    )
  }

  const sim = votos.filter((v) => v.voto === 'SIM').length
  const nao = votos.filter((v) => v.voto === 'NAO').length

  return (
    <div className="mt-3 space-y-2">
      <p className="text-fg-tertiary text-xs">
        Senado:{' '}
        <strong className="text-green-700 dark:text-green-400">
          {sim} Sim
        </strong>{' '}
        · <strong className="text-red-700 dark:text-red-400">{nao} Não</strong>
        {votos.length - sim - nao > 0
          ? ` · ${votos.length - sim - nao} Abstenção`
          : ''}
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {votos.map((v) => (
          <li key={`${v.dispositivoId}:${v.nomeRaw}`}>
            {v.parlamentarId ? (
              <Link
                className="inline-flex items-center gap-1 rounded border border-line-default px-2 py-0.5 text-fg-secondary text-xs hover:border-fg-quaternary hover:text-fg-primary"
                href={`/parlamentares/${v.parlamentarId}`}
                title={`${v.partidoRaw ?? ''}/${v.ufRaw ?? ''}`}
              >
                {v.nomeRaw}
                <VotoChip voto={v.voto} />
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded border border-line-default px-2 py-0.5 text-fg-tertiary text-xs"
                title={`${v.partidoRaw ?? ''}/${v.ufRaw ?? ''}`}
              >
                {v.nomeRaw}
                <VotoChip voto={v.voto} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default async function VetoDetalhePage({ params }: Props) {
  const { id } = await params
  const detalhe = await getVetoDetalhe(id)
  if (!detalhe) notFound()

  return (
    <div className="mx-auto max-w-3xl py-8">
      <Breadcrumb
        items={[
          { label: 'Início', href: '/' },
          { label: 'Vetos presidenciais', href: '/vetos' },
          { label: `VET ${detalhe.numero}/${detalhe.ano}` },
        ]}
      />

      <div className="mt-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
            VET {detalhe.numero}/{detalhe.ano}
          </h1>
          {detalhe.vetoTotal && <DataBadge label="Veto total" tone="neutral" />}
          {detalhe.emTramitacao ? (
            <DataBadge label="Em tramitação" tone="warning" />
          ) : null}
        </div>

        {detalhe.assunto && (
          <p className="mt-1 font-medium text-fg-secondary">
            {detalhe.assunto}
          </p>
        )}

        <p className="mt-2 text-fg-secondary text-sm">{detalhe.ementa}</p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          {detalhe.materiaVetadaSigla && (
            <>
              <dt className="text-fg-tertiary">Matéria vetada</dt>
              <dd className="col-span-1 font-medium text-fg-primary sm:col-span-2">
                {detalhe.materiaVetadaSigla} {detalhe.materiaVetadaNumero}/
                {detalhe.materiaVetadaAno}
              </dd>
            </>
          )}
          {detalhe.materiaVetadaEmenta && (
            <>
              <dt className="text-fg-tertiary">Ementa da matéria</dt>
              <dd className="col-span-1 text-fg-secondary sm:col-span-2">
                {detalhe.materiaVetadaEmenta}
              </dd>
            </>
          )}
          {detalhe.dataPublicacao && (
            <>
              <dt className="text-fg-tertiary">Publicação do veto</dt>
              <dd className="col-span-1 sm:col-span-2">
                {formatDataBR(detalhe.dataPublicacao)}
              </dd>
            </>
          )}
          {detalhe.dataRecebimentoCongresso && (
            <>
              <dt className="text-fg-tertiary">Recebido pelo Congresso</dt>
              <dd className="col-span-1 sm:col-span-2">
                {formatDataBR(detalhe.dataRecebimentoCongresso)}
              </dd>
            </>
          )}
        </dl>
      </div>

      {/* Dispositivos vetados */}
      <section aria-labelledby="dispositivos-heading" className="mt-8">
        <h2
          className="mb-4 font-semibold text-fg-primary text-lg"
          id="dispositivos-heading"
        >
          Dispositivos vetados
        </h2>

        {detalhe.dispositivos.length === 0 ? (
          <EmptyState
            description="Nenhum dispositivo cadastrado para este veto."
            title="Sem dispositivos"
          />
        ) : (
          <ul className="space-y-4">
            {detalhe.dispositivos.map((disp) => (
              <li
                key={disp.id}
                className="rounded-lg border border-line-default bg-surface-base p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-fg-tertiary text-xs">
                        {disp.identificador}
                      </span>
                      {disp.tipoVotacao && (
                        <span className="text-fg-quaternary text-xs">
                          {disp.tipoVotacao}
                        </span>
                      )}
                    </div>
                    {disp.assunto && (
                      <p className="mt-1 font-medium text-fg-secondary text-sm">
                        {disp.assunto}
                      </p>
                    )}
                    {disp.descricao && (
                      <p className="mt-1 text-fg-tertiary text-xs">
                        {disp.descricao}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0">
                    <SituacaoIcon situacao={disp.situacao} />
                  </div>
                </div>
                {disp.dataSessao && (
                  <p className="mt-2 text-fg-quaternary text-xs">
                    Sessão: {formatDataBR(disp.dataSessao)}
                  </p>
                )}
                <VotosDispositivo votos={disp.votos} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-fg-tertiary text-xs">
        Votos nominais: apenas senadores com registro na nossa base. Câmara não
        incluída nesta versão (ADR-059). "Mantido" = Congresso manteve o veto do
        presidente; "Derrubado" = Congresso rejeitou o veto.
      </p>
    </div>
  )
}
