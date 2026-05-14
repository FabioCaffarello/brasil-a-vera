import { useParams, useLocation, Link } from 'wouter'
import { useGetVotacao } from '@workspace/api-client-react'
import { PerfilVotacaoHeader } from '@/components/votacao/perfil-header'
import { VotosResumo } from '@/components/votacao/votos-resumo'
import { VotosPorPartido } from '@/components/votacao/votos-por-partido'
import { VotosIndividuais } from '@/components/votacao/votos-individuais'
import { ProposicaoVinculada } from '@/components/votacao/proposicao-vinculada'
import { ExportCsvLink } from '@/components/export-csv-link'

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

function useQueryParams() {
  const [location] = useLocation()
  return new URLSearchParams(location.includes('?') ? location.split('?')[1] : '')
}

export default function VotacaoPage() {
  const { id } = useParams<{ id: string }>()
  const params = useQueryParams()
  const filtroVoto = params.get('voto') ?? undefined

  const { data, isLoading, error } = useGetVotacao(id)

  if (isLoading) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-semibold">Votação não encontrada</h1>
        <Link href="/votacoes" className="mt-4 inline-block text-sm text-blue-600 underline">Voltar à lista</Link>
      </div>
    )
  }

  const v = data as Record<string, unknown>
  const votos = (v.votos as Array<Record<string, unknown>>) ?? []
  const orientacoes = (v.orientacoes as Array<Record<string, unknown>>) ?? []

  const filteredVotos = filtroVoto ? votos.filter((vt) => vt.voto === filtroVoto) : votos

  const votosIndividuais = filteredVotos.map((vt) => ({
    id: String(vt.parlamentarId),
    voto: String(vt.voto),
    parlamentarId: String(vt.parlamentarId),
    parlamentarNome: String(vt.nome),
    parlamentarPartidoSigla: String(vt.partidoSigla),
    parlamentarUf: String(vt.uf),
  }))

  const partidoMap = new Map<string, { sim: number; nao: number; abstencao: number; ausente: number; obstrucao: number; total: number }>()
  for (const vt of votos) {
    const sigla = String(vt.partidoSigla)
    const cur = partidoMap.get(sigla) ?? { sim: 0, nao: 0, abstencao: 0, ausente: 0, obstrucao: 0, total: 0 }
    cur.total++
    const votoVal = String(vt.voto).toUpperCase()
    if (votoVal === 'SIM') cur.sim++
    else if (votoVal === 'NAO') cur.nao++
    else if (votoVal === 'ABSTENCAO') cur.abstencao++
    else if (votoVal === 'AUSENTE') cur.ausente++
    else if (votoVal === 'OBSTRUCAO') cur.obstrucao++
    partidoMap.set(sigla, cur)
  }
  const porPartido = [...partidoMap.entries()]
    .map(([partidoSigla, counts]) => ({ partidoSigla, ...counts }))
    .sort((a, b) => b.total - a.total)

  const proposicaoVinculada = v.proposicaoId ? {
    tipo: 'PL', numero: 0, ano: 0, ementa: '', situacao: 'TRAMITANDO',
  } : null

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <PerfilVotacaoHeader
        votacao={{
          casa: String(v.casa),
          dataHora: v.dataHora as string,
          descricao: String(v.descricao),
          orgao: String(v.orgao),
          aprovada: Boolean(v.aprovada),
          sourceUrl: String(v.sourceUrl ?? ''),
          trustLevel: (v.trustLevel as 'L1') ?? 'L1',
        }}
      />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Section title="Resumo">
          <VotosResumo
            totais={{
              sim: Number(v.votosSim ?? 0),
              nao: Number(v.votosNao ?? 0),
              abstencoes: Number(v.abstencoes ?? 0),
              ausentes: null,
            }}
          />
        </Section>

        <Section title="Proposição vinculada">
          {proposicaoVinculada ? (
            <ProposicaoVinculada proposicao={proposicaoVinculada} />
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhuma proposição vinculada.</p>
          )}
        </Section>
      </div>

      {porPartido.length > 0 && (
        <Section title="Por partido" hint="Como cada bancada se posicionou.">
          <VotosPorPartido porPartido={porPartido} />
        </Section>
      )}

      {votosIndividuais.length > 0 && (
        <Section title="Votos individuais" hint="Clique no nome para ver o perfil do parlamentar.">
          <div className="mb-3 flex justify-end">
            <ExportCsvLink href={`/api/export/votacoes/${id}/votos`} label="Exportar (CSV)" />
          </div>
          <VotosIndividuais votos={votosIndividuais} filtroAtual={filtroVoto} totalSemFiltro={filtroVoto ? votos.length : undefined} votacaoId={id} />
        </Section>
      )}
    </div>
  )
}
