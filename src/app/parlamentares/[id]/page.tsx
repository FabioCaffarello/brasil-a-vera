import { FileText, Inbox, TrendingDown, Users, Vote } from 'lucide-react'
import { notFound } from 'next/navigation'

import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { AlinhamentoBancada } from '@/components/parlamentar/alinhamento'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'
import { ParesContraditorios } from '@/components/parlamentar/pares-contraditorios'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
import { KpiStrip } from '@/design-system/compositions/kpi-strip'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import { formatBRL } from '@/lib/format'
import { getAlinhamentoParlamentar } from '@/lib/queries/alinhamento'
import {
  getCoerenciaStats,
  getParesContraditorios,
} from '@/lib/queries/coerencia'
import {
  getGastosResumo,
  getParlamentarById,
  getProposicoesAutoradas,
  getTop5Afinidade,
  getVotosRecentes,
} from '@/lib/queries/parlamentares'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) return { title: 'Parlamentar — Brasil à Vera' }
  const cargo = parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const title = `${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) — Brasil à Vera`
  const description = `${cargo} pelo ${parlamentar.partidoSigla}/${parlamentar.uf}. O que vota, propõe e gasta.`
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

export default async function ParlamentarPerfilPage({ params }: PageProps) {
  const { id } = await params
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) notFound()

  const anoCorrente = new Date().getFullYear()
  const [
    votos,
    proposicoes,
    gastos,
    afinidades,
    paresContraditorios,
    coerenciaStats,
    alinhamento,
  ] = await Promise.all([
    getVotosRecentes(parlamentar.id, 10),
    getProposicoesAutoradas(parlamentar.id, 5),
    getGastosResumo(parlamentar.id, anoCorrente),
    getTop5Afinidade(parlamentar.id),
    getParesContraditorios(parlamentar.id, 10),
    getCoerenciaStats(parlamentar.id),
    getAlinhamentoParlamentar(parlamentar.id),
  ])

  // KpiStrip values com fallback honesto (D1 do plano Sprint 6.3 — "—"
  // quando dados ausentes em vez de esconder o strip; mantém estrutura).
  const alinhamentoTone =
    alinhamento.percentual === null
      ? 'muted'
      : alinhamento.percentual >= 80
        ? 'success'
        : alinhamento.percentual >= 50
          ? 'default'
          : 'warning'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-5">
        <PerfilHeader
          parlamentar={{
            nome: parlamentar.nome,
            nomeCivil: parlamentar.nomeCivil,
            casa: parlamentar.casa,
            partidoSigla: parlamentar.partidoSigla,
            partidoNome: parlamentar.partidoNome,
            uf: parlamentar.uf,
            urlFoto: parlamentar.urlFoto,
            legislatura: parlamentar.legislatura,
            situacaoMandato: parlamentar.situacaoMandato,
            sourceUrl: parlamentar.sourceUrl,
            trustLevel: parlamentar.trustLevel,
          }}
        />

        <KpiStrip
          items={[
            {
              icon: <Vote className="h-4 w-4" />,
              label: 'Alinhamento à bancada',
              value:
                alinhamento.percentual === null
                  ? '—'
                  : `${alinhamento.percentual}%`,
              hint:
                alinhamento.total > 0
                  ? `${alinhamento.alinhados}/${alinhamento.total} com orientação`
                  : 'sem orientação no período',
              tone: alinhamentoTone,
            },
            {
              icon: <Users className="h-4 w-4" />,
              label: 'Votações analisadas',
              value: alinhamento.total > 0 ? alinhamento.total : votos.length,
              hint:
                alinhamento.total > 0
                  ? 'com orientação'
                  : 'recentes (nominais)',
            },
            {
              icon: <Inbox className="h-4 w-4" />,
              label: 'Proposições como autor',
              value: proposicoes.length,
              hint: proposicoes.length === 5 ? 'mostrando 5 mais recentes' : '',
              tone: 'muted',
            },
            {
              icon: <TrendingDown className="h-4 w-4" />,
              label: `Gastos CEAP ${anoCorrente}`,
              value:
                gastos.totalRegistros === 0
                  ? '—'
                  : formatBRL(gastos.totalGeral),
              hint:
                gastos.totalRegistros === 0
                  ? 'sem gastos registrados'
                  : `${gastos.totalRegistros} registros`,
              tone: gastos.totalRegistros === 0 ? 'muted' : 'default',
            },
          ]}
        />
      </div>

      <SectionNav
        className="mt-6"
        items={[
          { id: 'votos', label: 'Votos', icon: <Vote className="h-4 w-4" /> },
          {
            id: 'alinhamento',
            label: 'Alinhamento',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'proposicoes',
            label: 'Proposições',
            icon: <Inbox className="h-4 w-4" />,
          },
          {
            id: 'gastos',
            label: 'Gastos',
            icon: <TrendingDown className="h-4 w-4" />,
          },
          {
            id: 'afinidade',
            label: 'Top 5',
            icon: <Users className="h-4 w-4" />,
          },
          {
            id: 'pares',
            label: 'Pares',
            icon: <FileText className="h-4 w-4" />,
          },
        ]}
        stickyTop="3.5rem"
      />

      <div className="mt-6 space-y-5">
        {/* Tier 1 — ação legislativa (cobertura ≥ 22%). Ordem: o que votou →
            se seguiu a bancada → o que propôs → como gastou. Sprint 3.1
            Tarefa 3 — hierarquia reflete cobertura empírica. */}
        <SectionCard
          className="scroll-mt-28"
          id="votos"
          subtitle="Apenas votações nominais (com voto individual registrado). Comissões frequentemente decidem em votação simbólica — esses casos não aparecem aqui."
          title="Votos recentes"
        >
          <VotosRecentes votos={votos} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="alinhamento"
          subtitle="% de votos que coincidem com a orientação do partido. Mede a fidelidade prática à liderança partidária — não compromisso ideológico."
          title="Alinhamento à bancada"
        >
          <AlinhamentoBancada
            alinhamento={alinhamento}
            casa={parlamentar.casa}
          />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="proposicoes"
          subtitle="Limitado às proposições já ingeridas no Brasil à Vera. Pode não refletir toda a produção legislativa histórica do parlamentar."
          title="Proposições onde é autor ou coautor"
        >
          <ProposicoesAutor proposicoes={proposicoes} />
        </SectionCard>

        <SectionCard
          className="scroll-mt-28"
          id="gastos"
          subtitle="Cota para Exercício da Atividade Parlamentar (CEAP) reportada pela Câmara. Senado tem regime próprio, ainda não ingerido."
          title={`Gastos parlamentares — ${anoCorrente}`}
        >
          <GastosResumoBlock ano={anoCorrente} resumo={gastos} />
        </SectionCard>
      </div>

      {/* Tier 3 — análises comparativas (cobertura < 15%). Movidas para
          seção secundária com separador visual + heading explicativo para
          não competir com o conteúdo principal quando vazias. Sprint 3.1
          Tarefa 3 — wireframe aprovado em 2026-05-15. Sprint 6.3 manteve
          a divisória (princípio: reskin não muda hierarquia cívica). */}
      <div className="mt-8 border-border border-t pt-8">
        <header className="mb-6">
          <h2 className="font-semibold text-2xl text-foreground tracking-tight">
            Análises comparativas
          </h2>
          <p className="mt-1 text-foreground-muted text-sm">
            Comparações com outros parlamentares e padrões de voto. Requer base
            de votações nominais — disponível para parte dos perfis.
          </p>
        </header>

        <div className="space-y-5">
          <SectionCard
            className="scroll-mt-28"
            id="afinidade"
            subtitle="Outros parlamentares que mais coincidem no voto. Mostra concordância prática, não alinhamento ideológico declarado."
            title="Top 5 maior afinidade de voto"
          >
            <Top5Afinidade afinidades={afinidades} />
          </SectionCard>

          <SectionCard
            className="scroll-mt-28"
            id="pares"
            subtitle="Mesmo tema, direções inversas (uma restritiva, outra permissiva), voto idêntico. A plataforma é o espelho — o cidadão tira a conclusão."
            title="Pares de votos em direções opostas"
          >
            <ParesContraditorios
              pares={paresContraditorios}
              stats={coerenciaStats}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
