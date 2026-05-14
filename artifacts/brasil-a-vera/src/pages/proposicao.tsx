import { useParams, Link } from 'wouter'
import { useGetProposicao } from '@workspace/api-client-react'
import { PerfilProposicaoHeader } from '@/components/proposicao/perfil-header'
import { AutoresList } from '@/components/proposicao/autores-list'
import { TemasList } from '@/components/proposicao/temas-list'
import { TramitacaoTimeline } from '@/components/proposicao/tramitacao-timeline'
import { VotacoesVinculadas } from '@/components/proposicao/votacoes-vinculadas'

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

export default function ProposicaoPage() {
  const { tipo, numero, ano } = useParams<{ tipo: string; numero: string; ano: string }>()

  const { data, isLoading, error } = useGetProposicao(tipo, Number(numero), Number(ano))

  if (isLoading) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>
  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-semibold">Proposição não encontrada</h1>
        <Link href="/proposicoes" className="mt-4 inline-block text-sm text-blue-600 underline">Voltar à lista</Link>
      </div>
    )
  }

  const p = data as unknown as Record<string, unknown>
  const autores = (p.autores as Array<Record<string, unknown>>) ?? []
  const temas = (p.temas as Array<Record<string, unknown>>) ?? []
  const tramitacao = (p.tramitacao as Array<Record<string, unknown>>) ?? []
  const votacoes = (p.votacoes as Array<Record<string, unknown>>) ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <PerfilProposicaoHeader
        proposicao={{
          tipo: String(p.tipo),
          numero: Number(p.numero),
          ano: Number(p.ano),
          ementa: String(p.ementa ?? ''),
          ementaDetalhada: p.ementaDetalhada ? String(p.ementaDetalhada) : null,
          situacao: String(p.situacao ?? 'TRAMITANDO'),
          regime: p.regime ? String(p.regime) : null,
          sourceUrl: String(p.sourceUrl ?? ''),
          trustLevel: (p.trustLevel as 'L1') ?? 'L1',
        }}
      />

      {autores.length > 0 && (
        <Section title="Autores">
          <AutoresList autores={autores.map((a, i) => ({
            id: String(a.id ?? i),
            parlamentarId: a.parlamentarId ? String(a.parlamentarId) : null,
            nome: String(a.nome ?? ''),
            tipoAutoria: String(a.tipoAutoria ?? 'AUTOR'),
            parlamentarPartidoSigla: a.parlamentarPartidoSigla ? String(a.parlamentarPartidoSigla) : null,
            parlamentarUf: a.parlamentarUf ? String(a.parlamentarUf) : null,
          }))} />
        </Section>
      )}

      {temas.length > 0 && (
        <Section title="Temas">
          <TemasList temas={temas.map((t) => ({
            codigoTema: Number(t.codigoTema ?? 0),
            nomeTema: String(t.nomeTema ?? ''),
          }))} />
        </Section>
      )}

      {tramitacao.length > 0 && (
        <Section title="Tramitação">
          <TramitacaoTimeline eventos={tramitacao.map((t) => ({
            id: String(t.id ?? ''),
            data: t.data as string,
            orgao: String(t.orgao ?? ''),
            descricaoResumida: String(t.descricaoResumida ?? ''),
            descricaoCompleta: t.descricaoCompleta ? String(t.descricaoCompleta) : null,
            situacaoResultante: t.situacaoResultante ? String(t.situacaoResultante) : null,
          }))} />
        </Section>
      )}

      {votacoes.length > 0 && (
        <Section title="Votações vinculadas">
          <VotacoesVinculadas votacoes={votacoes.map((v) => ({
            id: String(v.id),
            casa: String(v.casa),
            dataHora: v.dataHora as string,
            descricao: String(v.descricao ?? ''),
            orgao: String(v.orgao ?? ''),
            aprovada: Boolean(v.aprovada),
            votosSim: Number(v.votosSim ?? 0),
            votosNao: Number(v.votosNao ?? 0),
          }))} />
        </Section>
      )}
    </div>
  )
}
