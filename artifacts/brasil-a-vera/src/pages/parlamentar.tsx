import { useParams, Link } from 'wouter'
import {
  useGetParlamentar,
  useGetVotosRecentes,
  useGetProposicoesAutoradas,
  useGetGastosResumo,
  useGetAlinhamento,
  useGetAfinidadeVoto,
} from '@workspace/api-client-react'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
import { AlinhamentoBancada } from '@/components/parlamentar/alinhamento'
import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'

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

export default function ParlamentarPage() {
  const { id } = useParams<{ id: string }>()
  const anoCorrente = new Date().getFullYear()

  const { data: parlamentar, isLoading, error } = useGetParlamentar(id)
  const { data: votos = [] } = useGetVotosRecentes(id)
  const { data: proposicoes = [] } = useGetProposicoesAutoradas(id)
  const { data: gastos } = useGetGastosResumo(id)
  const { data: alinhamento } = useGetAlinhamento(id)
  const { data: afinidades = [] } = useGetAfinidadeVoto(id)

  if (isLoading) return <div className="p-8 text-sm text-zinc-500">Carregando...</div>
  if (error || !parlamentar) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-xl font-semibold">Parlamentar não encontrado</h1>
        <Link href="/parlamentares" className="mt-4 inline-block text-sm text-blue-600 underline">Voltar à lista</Link>
      </div>
    )
  }

  const gastosResumo = gastos ? {
    totalGeral: gastos.totalGeral,
    totalRegistros: gastos.totalRegistros,
    porCategoria: gastos.topCategorias ?? [],
    ano: gastos.ano ?? anoCorrente,
  } : null

  const pd = parlamentar as unknown as Record<string, unknown>
  const alinhamentoData = alinhamento ? {
    ...alinhamento,
    partidoSigla: alinhamento.partidoSigla ?? null,
    percentual: alinhamento.percentual ?? null,
  } : {
    partidoSigla: null, percentual: null, total: 0, alinhados: 0,
    divergentes: 0, amostraInsuficiente: true, topDivergencias: [], topConvergencias: [],
  }
  const afinidadesMapped = afinidades.map((a) => ({
    ...a,
    urlFoto: a.urlFoto ?? null,
    partidoSigla: a.partidoSigla ?? '',
  }))

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <PerfilHeader
        parlamentar={{
          nome: parlamentar.nome,
          nomeCivil: pd.nomeCivil as string | null ?? null,
          casa: parlamentar.casa,
          partidoSigla: parlamentar.partidoSigla,
          partidoNome: parlamentar.partidoNome ?? null,
          uf: parlamentar.uf,
          urlFoto: parlamentar.urlFoto ?? null,
          legislatura: parlamentar.legislatura,
          situacaoMandato: pd.situacaoMandato as string ?? '',
          sourceUrl: parlamentar.sourceUrl ?? '',
          trustLevel: (parlamentar.trustLevel as 'L1') ?? 'L1',
        }}
      />

      <Section title="Votos recentes" hint="Apenas votações nominais (com voto individual registrado).">
        <VotosRecentes votos={votos as Parameters<typeof VotosRecentes>[0]['votos']} />
      </Section>

      <Section title="Alinhamento à bancada" hint="% de votos que coincidem com a orientação do partido.">
        <AlinhamentoBancada alinhamento={alinhamentoData} casa={parlamentar.casa as 'CAMARA' | 'SENADO'} />
      </Section>

      <Section title="Top 5 maior afinidade de voto" hint="Outros parlamentares que mais coincidem no voto.">
        <Top5Afinidade afinidades={afinidadesMapped} />
      </Section>

      <Section title="Proposições onde é autor ou coautor">
        <ProposicoesAutor proposicoes={proposicoes.map((p) => ({
          proposicaoId: p.id,
          tipo: p.tipo,
          numero: p.numero,
          ano: p.ano,
          ementa: p.ementa,
          situacao: p.situacao,
          tipoAutoria: 'AUTOR',
        }))} />
      </Section>

      {gastosResumo && (
        <Section title={`Gastos parlamentares — ${anoCorrente}`} hint="Cota para Exercício da Atividade Parlamentar (CEAP).">
          <GastosResumoBlock ano={anoCorrente} resumo={gastosResumo} />
        </Section>
      )}
    </div>
  )
}
