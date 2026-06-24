// Perfil de parlamentar — promovido ao RDS (migração ADR-033). Consome o
// design system @fabio.caffarello/react-design-system — tokens traduzidos
// pela tabela canônica (docs/migration/token-map.md).
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.
//
// - Stat/StatGroup (KPIs) do /server; SectionCard (Card compound) do /server;
//   SectionNav (useScrollSpy via entry /hooks) de @/design-system/compositions.
// - Accordion mobile: Accordion do RDS via entry /granular (wrapper client
//   @/design-system/primitives/rds-accordion — tree-shaking poda o barrel).
// - Charts (GastosChart, recharts) sobem como resíduo BaV (ADR-034 §5).

import {
  Breadcrumb,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import {
  ArrowRight,
  Award,
  Building2,
  CalendarCheck,
  FileText,
  Gavel,
  GitBranch,
  Inbox,
  Landmark,
  MessageSquare,
  Network,
  PieChart,
  ScrollText,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserCircle,
  Users,
  Vote,
} from 'lucide-react'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'
import {
  DetailLayout,
  type DetailSection,
} from '@/components/detail/detail-layout'
import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { AlinhamentoBancada } from '@/components/parlamentar/alinhamento'
import { AlinhamentoBlocos } from '@/components/parlamentar/alinhamento-blocos'
import { ComissoesMembro } from '@/components/parlamentar/comissoes-membro'
import { CompartilharButton } from '@/components/parlamentar/compartilhar-button'
import { Discursos } from '@/components/parlamentar/discursos'
import { EvolucaoPatrimonialBlock } from '@/components/parlamentar/evolucao-patrimonial'
import { FidelidadePartidaria } from '@/components/parlamentar/fidelidade'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'
import { GrafoParticipacaoBlock } from '@/components/parlamentar/grafo-participacao'
import { LeituraRapida } from '@/components/parlamentar/leitura-rapida'
import { LiderancasCargos } from '@/components/parlamentar/liderancas-cargos'
import { MixComposicaoBlock } from '@/components/parlamentar/mix-composicao'
import { ParesContraditorios } from '@/components/parlamentar/pares-contraditorios'
import { PatrimonioBlock } from '@/components/parlamentar/patrimonio'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { Presenca } from '@/components/parlamentar/presenca'
import { PresencaFisica } from '@/components/parlamentar/presenca-fisica'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { QuemE } from '@/components/parlamentar/quem-e'
import { Relatorias } from '@/components/parlamentar/relatorias'
import { VariacaoPatrimonialBlock } from '@/components/parlamentar/variacao-patrimonial'
import { VotacoesComissao } from '@/components/parlamentar/votacoes-comissao'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
import { decodeCursor } from '@/lib/cursor'
import { formatBRL, formatPercentil } from '@/lib/format'
import {
  getAlinhamentoBlocos,
  getAlinhamentoParlamentar,
} from '@/lib/queries/alinhamento'
import {
  getCoerenciaStats,
  getParesContraditoriosCached,
} from '@/lib/queries/coerencia'
import { getComissoesParlamentar } from '@/lib/queries/comissoes'
import {
  CursorProposicoesV1,
  CursorVotosV1,
} from '@/lib/queries/cursor-schemas'
import { getDiscursosParlamentar } from '@/lib/queries/discursos'
import {
  getFidelidadeBancada,
  getFidelidadeOrientacao,
  getTimelineMigracao,
} from '@/lib/queries/fidelidade'
import {
  getFrentesByParlamentar,
  getLiderancasByParlamentar,
} from '@/lib/queries/liderancas'
import {
  getAlinhamentoMensal,
  getComparacoesCasa,
  getGastosMensalMedianaCasa,
  getGastosResumo,
  getGastosTopFornecedores,
  getParlamentarById,
  getProposicoesAutoradas,
  getTop5Afinidade,
  getVotosDistribuicao,
  getVotosRecentes,
  PROPOSICAO_SITUACOES,
  PROPOSICAO_TIPOS,
  type ProposicaoSituacaoFilter,
  type ProposicaoTipoFilter,
  VOTOS_ALINHAMENTOS,
  VOTOS_PERIODOS,
  type VotosAlinhamentoFilter,
  type VotosPeriodoFilter,
} from '@/lib/queries/parlamentares'
import {
  getEvolucaoPatrimonial,
  getGrafoParticipacao,
  getPatrimonioSnapshot,
} from '@/lib/queries/patrimonio'
import { getPresencaPlenario } from '@/lib/queries/presenca'
import { getPresencaFisica } from '@/lib/queries/presenca-fisica'
import {
  getRelatorAutoria,
  getRelatoriasInfluencia,
} from '@/lib/queries/relatorias'
import { getVariacaoPatrimonial } from '@/lib/queries/variacao-patrimonial'
import { getVotacoesComissaoByParlamentar } from '@/lib/queries/votacoes-comissao'
import { buildMixComposicao } from '@/modules/eleitoral/domain/mix'

const casaLabel = (casa: string) => (casa === 'CAMARA' ? 'Câmara' : 'Senado')

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    votos_after?: string
    votos_periodo?: string
    votos_alinhamento?: string
    propos_after?: string
    propos_tipo?: string
    propos_situacao?: string
  }>
}

function normalizeVotosPeriodo(
  v: string | undefined,
): VotosPeriodoFilter | undefined {
  if (v && (VOTOS_PERIODOS as string[]).includes(v)) {
    return v as VotosPeriodoFilter
  }
  return undefined
}

function normalizeVotosAlinhamento(
  v: string | undefined,
): VotosAlinhamentoFilter | undefined {
  if (v && (VOTOS_ALINHAMENTOS as string[]).includes(v)) {
    return v as VotosAlinhamentoFilter
  }
  return undefined
}

function normalizeProposicaoTipo(
  v: string | undefined,
): ProposicaoTipoFilter | undefined {
  if (v && (PROPOSICAO_TIPOS as string[]).includes(v)) {
    return v as ProposicaoTipoFilter
  }
  return undefined
}

function normalizeProposicaoSituacao(
  v: string | undefined,
): ProposicaoSituacaoFilter | undefined {
  if (v && (PROPOSICAO_SITUACOES as string[]).includes(v)) {
    return v as ProposicaoSituacaoFilter
  }
  return undefined
}

// Base /rds/ — paginação por cursor e filtros permanecem DENTRO da rota
// staging (não vazam pro usuário da rota original).
function buildPerfilHref(
  parlamentarId: string,
  searchParams: Record<string, string | undefined>,
  overrides: Record<string, string | null | undefined>,
  anchor?: string,
): string {
  const merged: Record<string, string | undefined | null> = {
    ...searchParams,
    ...overrides,
  }
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(merged)) {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  }
  const qs = params.toString()
  const suffix = `${qs ? `?${qs}` : ''}${anchor ?? ''}`
  return `/parlamentares/${parlamentarId}${suffix}`
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

export default async function ParlamentarPerfilPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params
  const sp = await searchParams
  const parlamentar = await getParlamentarById(id)
  if (!parlamentar) notFound()

  // Cursors (ADR-026): null = inválido → redirect 308 strip o param.
  const cursorVotos = decodeCursor(sp.votos_after, CursorVotosV1)
  if (cursorVotos === null) {
    permanentRedirect(
      buildPerfilHref(parlamentar.id, sp, { votos_after: null }, '#votos'),
    )
  }
  const cursorPropos = decodeCursor(sp.propos_after, CursorProposicoesV1)
  if (cursorPropos === null) {
    permanentRedirect(
      buildPerfilHref(
        parlamentar.id,
        sp,
        { propos_after: null },
        '#proposicoes',
      ),
    )
  }
  const periodoVotos = normalizeVotosPeriodo(sp.votos_periodo)
  const alinhamentoVotos = normalizeVotosAlinhamento(sp.votos_alinhamento)
  const tipoPropos = normalizeProposicaoTipo(sp.propos_tipo)
  const situacaoPropos = normalizeProposicaoSituacao(sp.propos_situacao)

  const anoCorrente = new Date().getFullYear()
  const [
    votosPage,
    votosDistribuicao,
    proposicoesPage,
    gastos,
    gastosMensal,
    gastosTopFornecedores,
    afinidades,
    paresContraditorios,
    coerenciaStats,
    alinhamento,
    alinhamentoMensal,
    alinhamentoBlocos,
    comparacoes,
    patrimonio,
    evolucaoPatrimonial,
    grafoParticipacao,
    comissoes,
    fidelidadeTimeline,
    fidelidadeBancada,
    fidelidadeOrientacao,
    relatoriasInfluencia,
    relatorAutoria,
    presenca,
    presencaFisica,
    variacaoPatrimonial,
    discursos,
    liderancas,
    frentes,
    votacoesComissao,
  ] = await Promise.all([
    getVotosRecentes(parlamentar.id, {
      cursor: cursorVotos,
      periodo: periodoVotos,
      alinhamento: alinhamentoVotos,
    }),
    getVotosDistribuicao(parlamentar.id, {
      periodo: periodoVotos,
      alinhamento: alinhamentoVotos,
    }),
    getProposicoesAutoradas(parlamentar.id, {
      cursor: cursorPropos,
      tipo: tipoPropos,
      situacao: situacaoPropos,
    }),
    getGastosResumo(parlamentar.id, anoCorrente),
    getGastosMensalMedianaCasa(parlamentar.id, anoCorrente),
    getGastosTopFornecedores(parlamentar.id, anoCorrente, 5),
    getTop5Afinidade(parlamentar.id),
    getParesContraditoriosCached(parlamentar.id, 10),
    getCoerenciaStats(parlamentar.id),
    getAlinhamentoParlamentar(parlamentar.id),
    getAlinhamentoMensal(parlamentar.id, 12),
    // Alinhamento com Governo/Oposição existe só na Câmara (ADR-040); para
    // senador resolve vazio e a UI mostra a nota de assimetria da fonte.
    parlamentar.casa === 'CAMARA'
      ? getAlinhamentoBlocos(parlamentar.id)
      : Promise.resolve([] as Awaited<ReturnType<typeof getAlinhamentoBlocos>>),
    getComparacoesCasa(parlamentar.id),
    getPatrimonioSnapshot(parlamentar.id),
    getEvolucaoPatrimonial(parlamentar.id),
    getGrafoParticipacao(parlamentar.id),
    getComissoesParlamentar(parlamentar.id),
    getTimelineMigracao(parlamentar.id),
    getFidelidadeBancada(parlamentar.id),
    getFidelidadeOrientacao(parlamentar.id),
    // Relatorias: Câmara e Senado (ADR-044 emenda 2026-06-21). Casa-agnóstico —
    // conta por parlamentar_id.
    getRelatoriasInfluencia(parlamentar.id),
    getRelatorAutoria(parlamentar.id),
    getPresencaPlenario(parlamentar.id),
    getPresencaFisica(parlamentar.id),
    getVariacaoPatrimonial(parlamentar.id),
    getDiscursosParlamentar(parlamentar.id),
    getLiderancasByParlamentar(parlamentar.id),
    getFrentesByParlamentar(parlamentar.id),
    // Votações em comissão: Senado-only (ADR-057). Para deputados retorna []
    // imediatamente (parlamentar_id não existe na tabela Senado-only).
    parlamentar.casa === 'SENADO'
      ? getVotacoesComissaoByParlamentar(parlamentar.id)
      : Promise.resolve(
          [] as Awaited<ReturnType<typeof getVotacoesComissaoByParlamentar>>,
        ),
  ])

  // Camada C deriva da evolução (mesma query) — mix % é imune ao IPCA.
  const mixComposicao = buildMixComposicao(evolucaoPatrimonial)

  // Perfil biográfico (ADR-049) — seção só aparece com algum dado (Câmara).
  const temBio = Boolean(
    parlamentar.profissao ||
      parlamentar.escolaridade ||
      parlamentar.dataNascimento ||
      parlamentar.municipioNascimento,
  )

  const votos = votosPage.rows
  const votosFiltros = {
    periodo: periodoVotos ?? 'all',
    alinhamento: alinhamentoVotos ?? 'todos',
  } as const
  const buildVotosFiltroHref = (overrides: Record<string, string | null>) => {
    const mapped: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(overrides)) {
      mapped[`votos_${k}`] = v
    }
    // Reset cursor ao mudar filtro — não faz sentido manter `votos_after`
    // apontando pra dado que não casa com os filtros novos.
    return buildPerfilHref(
      parlamentar.id,
      sp,
      { ...mapped, votos_after: null },
      '#votos',
    )
  }
  const votosProximaPaginaHref = votosPage.nextCursor
    ? buildPerfilHref(
        parlamentar.id,
        sp,
        { votos_after: votosPage.nextCursor },
        // Anchor no próprio botão (que existe na próxima página também)
        // mantém scroll position visual em vez de saltar pro topo da seção.
        '#mostrar-mais-votos',
      )
    : null

  const proposicoes = proposicoesPage.rows
  const proposicoesFiltros = {
    tipo: tipoPropos ?? 'todos',
    situacao: situacaoPropos ?? 'todas',
  } as const
  const buildProposicoesFiltroHref = (
    overrides: Record<string, string | null>,
  ) => {
    const mapped: Record<string, string | null> = {}
    for (const [k, v] of Object.entries(overrides)) {
      mapped[`propos_${k}`] = v
    }
    return buildPerfilHref(
      parlamentar.id,
      sp,
      { ...mapped, propos_after: null },
      '#proposicoes',
    )
  }
  const proposicoesProximaPaginaHref = proposicoesPage.nextCursor
    ? buildPerfilHref(
        parlamentar.id,
        sp,
        { propos_after: proposicoesPage.nextCursor },
        '#mostrar-mais-propos',
      )
    : null

  // Tone do Stat (RDS): afeta APENAS o hint (mesmo contrato do KpiStrip
  // original). Map KpiTone→StatTone: default/muted→neutral (nuance:
  // hint muted original era fg-quaternary; Stat neutral é fg-tertiary),
  // destructive→error.
  const alinhamentoTone =
    alinhamento.percentual === null
      ? 'neutral'
      : alinhamento.percentual >= 80
        ? 'success'
        : alinhamento.percentual >= 50
          ? 'neutral'
          : 'warning'

  // Seção de alinhamento com Governo/Oposição (ADR-040). Câmara-only; no
  // Senado a fonte não publica orientação — nota de assimetria, sem substituto.
  const alinhamentoBlocosContent =
    parlamentar.casa === 'SENADO' ? (
      <p className="text-fg-tertiary text-sm">
        A fonte do Senado não publica orientação de bancada nem de bloco
        (Governo/Oposição) em endpoint público. Esta comparação existe apenas
        para deputados federais (Câmara).
      </p>
    ) : (
      <AlinhamentoBlocos blocos={alinhamentoBlocos} />
    )

  const sections: DetailSection[] = [
    ...(temBio
      ? [
          {
            id: 'quem-e',
            navLabel: 'Quem é',
            title: 'Quem é',
            subtitle:
              'Profissão, escolaridade e naturalidade autodeclaradas pelo parlamentar no registro oficial. Câmara-only nesta fase.',
            icon: <UserCircle className="h-4 w-4" />,
            content: (
              <QuemE
                escolaridade={parlamentar.escolaridade}
                dataNascimento={parlamentar.dataNascimento}
                municipioNascimento={parlamentar.municipioNascimento}
                ufNascimento={parlamentar.ufNascimento}
                profissao={parlamentar.profissao}
              />
            ),
          },
        ]
      : []),
    {
      id: 'votos',
      navLabel: 'Votos',
      title: 'Votos recentes',
      subtitle:
        'Apenas votações nominais (com voto individual registrado). Comissões frequentemente decidem em votação simbólica — esses casos não aparecem aqui.',
      icon: <Vote className="h-4 w-4" />,
      content: (
        <VotosRecentes
          votos={votos}
          filtros={votosFiltros}
          distribuicao={votosDistribuicao}
          buildFiltroHref={buildVotosFiltroHref}
          proximaPaginaHref={votosProximaPaginaHref}
        />
      ),
    },
    {
      id: 'presenca',
      navLabel: 'Participação',
      title: 'Participação em votações',
      subtitle:
        'Quanto o parlamentar participa das votações nominais de plenário (votou em quantas), no período de mandato. Não inclui comissões nem votações simbólicas. Câmara infere a ausência (sem registro nominal); Senado a registra.',
      icon: <CalendarCheck className="h-4 w-4" />,
      content: <Presenca presenca={presenca} casa={parlamentar.casa} />,
    },
    {
      id: 'presenca-sessoes',
      navLabel: 'Sessões',
      title: 'Presença em sessões',
      subtitle:
        'Frequência física às sessões deliberativas de plenário (compareceu a quantas), no período de mandato. Diferente de participar das votações: dá para comparecer e não votar numa votação específica. Câmara-only.',
      icon: <UserCheck className="h-4 w-4" />,
      content: (
        <PresencaFisica presenca={presencaFisica} casa={parlamentar.casa} />
      ),
    },
    {
      id: 'alinhamento',
      navLabel: 'Alinhamento',
      title: 'Alinhamento à bancada',
      subtitle:
        '% de votos que coincidem com a orientação do partido. Mede o alinhamento prático com a liderança partidária — não compromisso ideológico.',
      icon: <Users className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <AlinhamentoBancada
            alinhamento={alinhamento}
            casa={parlamentar.casa}
            mensal={alinhamentoMensal}
          />
          {alinhamento.percentual !== null && !alinhamento.emFederacao && (
            <div className="flex justify-end">
              <CompartilharButton
                campaign="alinhamento"
                fato={{
                  mensagem: `Votou com o partido em ${alinhamento.percentual}% das votações nominais comparáveis (${alinhamento.alinhados} de ${alinhamento.total} votos com orientação registrada).`,
                }}
                parlamentar={{
                  nome: parlamentar.nome,
                  partidoSigla: parlamentar.partidoSigla ?? '',
                  uf: parlamentar.uf,
                  casa: parlamentar.casa,
                }}
                path={`/parlamentares/${parlamentar.id}/fato/alinhamento`}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      id: 'alinhamento-blocos',
      navLabel: 'Gov/Oposição',
      title: 'Alinhamento com Governo e Oposição',
      subtitle:
        'Comparação factual entre o voto individual e a orientação formalizada pelas lideranças do Governo e da Oposição na Câmara. Referência de leitura, não juízo de valor.',
      icon: <Landmark className="h-4 w-4" />,
      content: alinhamentoBlocosContent,
    },
    {
      id: 'voto-partido',
      navLabel: 'Trajetória',
      title: 'Voto e partido ao longo do mandato',
      subtitle:
        'Compara cada voto com duas referências do partido vigente na data do voto — a orientação da liderança e a maioria efetiva da bancada — considerando as trocas de partido. Referência factual, sem juízo de valor.',
      icon: <GitBranch className="h-4 w-4" />,
      content: (
        <FidelidadePartidaria
          timeline={fidelidadeTimeline}
          bancada={fidelidadeBancada}
          orientacao={fidelidadeOrientacao}
        />
      ),
    },
    {
      id: 'comissoes',
      navLabel: 'Comissões',
      title: 'Comissões',
      subtitle:
        "Comissões nesta legislatura (57ª). 'Atualmente' = vínculo ativo hoje; o histórico cobre só o mandato corrente.",
      icon: <Gavel className="h-4 w-4" />,
      content: <ComissoesMembro {...comissoes} />,
    },
    ...(parlamentar.casa === 'SENADO'
      ? [
          {
            id: 'votacoes-comissao',
            navLabel: 'Comissão (votos)',
            title: 'Votações em comissão',
            subtitle:
              'Votações nominais do senador em comissões do Senado (ADR-057). Apenas votos individuais registrados — votações simbólicas sem roll call não aparecem.',
            icon: <Gavel className="h-4 w-4" />,
            content: <VotacoesComissao votacoes={votacoesComissao} />,
          },
        ]
      : []),
    {
      id: 'liderancas',
      navLabel: 'Cargos',
      title: 'Cargos e Lideranças',
      subtitle:
        'Lideranças partidárias, de governo/oposição e frentes parlamentares. Dados quase-estáticos (ingestão mensal) — pode não refletir mudanças recentes.',
      icon: <Award className="h-4 w-4" />,
      content: <LiderancasCargos frentes={frentes} liderancas={liderancas} />,
    },
    {
      id: 'relatorias',
      navLabel: 'Relatorias',
      title: 'Relatorias',
      subtitle:
        'Proposições em que é o relator vigente/último (designação institucional, não escolha do parlamentar) e a distribuição partidária dos autores dessas proposições. Câmara-only; referência factual, sem juízo.',
      icon: <ScrollText className="h-4 w-4" />,
      content: (
        <Relatorias
          influencia={relatoriasInfluencia}
          autoria={relatorAutoria}
          casa={parlamentar.casa}
        />
      ),
    },
    {
      id: 'proposicoes',
      navLabel: 'Proposições',
      title: 'Proposições onde é autor ou coautor',
      subtitle:
        'Limitado às proposições já ingeridas no Brasil à Vera. Pode não refletir toda a produção legislativa histórica do parlamentar.',
      icon: <Inbox className="h-4 w-4" />,
      content: (
        <ProposicoesAutor
          proposicoes={proposicoes}
          filtros={proposicoesFiltros}
          buildFiltroHref={buildProposicoesFiltroHref}
          proximaPaginaHref={proposicoesProximaPaginaHref}
        />
      ),
    },
    {
      id: 'discursos',
      navLabel: 'Discursos',
      title: 'Discursos',
      subtitle:
        'O que o parlamentar fala em plenário e comissão: principais temas (indexação oficial da fonte) e discursos recentes com link ao inteiro teor. Discurso não é a posição oficial nem o voto.',
      icon: <MessageSquare className="h-4 w-4" />,
      content: <Discursos discursos={discursos} />,
    },
    {
      id: 'gastos',
      navLabel: 'Gastos',
      title: `Gastos parlamentares — ${anoCorrente}`,
      subtitle:
        'Cota para Exercício da Atividade Parlamentar (CEAP) reportada pela Câmara. Senado tem regime próprio, ainda não ingerido.',
      icon: <TrendingDown className="h-4 w-4" />,
      content: (
        <div className="space-y-4">
          <GastosResumoBlock
            ano={anoCorrente}
            mensal={gastosMensal}
            parlamentarId={parlamentar.id}
            resumo={gastos}
            topFornecedores={gastosTopFornecedores}
          />
          {parlamentar.casa === 'CAMARA' && gastos.totalRegistros > 0 && (
            <div className="flex justify-end">
              <CompartilharButton
                campaign="gasto"
                fato={{
                  mensagem: `Gastou ${formatBRL(gastos.totalGeral)} em cota parlamentar (CEAP) em ${anoCorrente}${comparacoes.percentilGastoCasa !== null ? ` — ${formatPercentil(comparacoes.percentilGastoCasa)} entre os deputados federais` : ''}.`,
                }}
                parlamentar={{
                  nome: parlamentar.nome,
                  partidoSigla: parlamentar.partidoSigla ?? '',
                  uf: parlamentar.uf,
                  casa: parlamentar.casa,
                }}
                path={`/parlamentares/${parlamentar.id}/fato/gasto`}
              />
            </div>
          )}
        </div>
      ),
    },
    ...(patrimonio
      ? [
          {
            id: 'patrimonio',
            navLabel: 'Patrimônio',
            title: 'Patrimônio declarado',
            subtitle:
              'Bens declarados ao TSE na candidatura de 2022. Vínculo por CPF exato — só aparece para parlamentares da Câmara identificados na base do TSE.',
            icon: <Building2 className="h-4 w-4" />,
            content: <PatrimonioBlock snapshot={patrimonio} />,
          },
        ]
      : []),
    ...(evolucaoPatrimonial
      ? [
          {
            id: 'evolucao-patrimonio',
            navLabel: 'Evolução',
            title: 'Evolução patrimonial entre pleitos',
            subtitle:
              'Como o patrimônio declarado variou entre as candidaturas. Valores corrigidos pela inflação (IPCA) para comparação justa; pontos discretos — o intervalo entre pleitos é desconhecido.',
            icon: <TrendingUp className="h-4 w-4" />,
            content: (
              <EvolucaoPatrimonialBlock evolucao={evolucaoPatrimonial} />
            ),
          },
        ]
      : []),
    ...(variacaoPatrimonial
      ? [
          {
            id: 'variacao-patrimonio',
            navLabel: 'Variação',
            title: 'Variação patrimonial no mandato',
            subtitle:
              'Variação real do patrimônio declarado durante o mandato (entre os dois pleitos mais recentes), com o percentil em relação aos pares. Declaração à Justiça Eleitoral — não é renda nem movimentação. Distinto dos gastos da cota (CEAP).',
            icon: <TrendingUp className="h-4 w-4" />,
            content: (
              <VariacaoPatrimonialBlock variacao={variacaoPatrimonial} />
            ),
          },
        ]
      : []),
    ...(mixComposicao
      ? [
          {
            id: 'mix-patrimonio',
            navLabel: 'Composição',
            title: 'Composição patrimonial ao longo do tempo',
            subtitle:
              'Para onde o patrimônio migrou entre as candidaturas. Composição em %, imune à inflação — isola a mudança de mix dos valores absolutos.',
            icon: <PieChart className="h-4 w-4" />,
            content: <MixComposicaoBlock mix={mixComposicao} />,
          },
        ]
      : []),
    ...(grafoParticipacao
      ? [
          {
            id: 'grafo-participacao',
            navLabel: 'Empresas',
            title: 'Participação societária',
            subtitle:
              'Empresas em que o parlamentar declarou participação societária (quotas/ações). Extraído da descrição do TSE; só o que foi declarado, sem consulta externa.',
            icon: <Network className="h-4 w-4" />,
            content: (
              <GrafoParticipacaoBlock
                grafo={grafoParticipacao}
                parlamentarNome={parlamentar.nome}
              />
            ),
          },
        ]
      : []),
    {
      id: 'afinidade',
      navLabel: 'Top 5',
      title: 'Top 5 maior afinidade de voto',
      subtitle:
        'Outros parlamentares que mais coincidem no voto. Mostra concordância prática, não alinhamento ideológico declarado.',
      icon: <Users className="h-4 w-4" />,
      content: <Top5Afinidade afinidades={afinidades} />,
    },
    {
      id: 'pares',
      navLabel: 'Pares',
      title: 'Pares de votos em direções opostas',
      subtitle:
        'Mesmo tema, direções inversas (uma restritiva, outra permissiva), voto idêntico. A plataforma é o espelho — o cidadão tira a conclusão.',
      icon: <FileText className="h-4 w-4" />,
      content: (
        <ParesContraditorios
          pares={paresContraditorios}
          parlamentar={{
            id: parlamentar.id,
            nome: parlamentar.nome,
            partidoSigla: parlamentar.partidoSigla,
            uf: parlamentar.uf,
            casa: parlamentar.casa,
          }}
          stats={coerenciaStats}
        />
      ),
    },
  ]

  return (
    <DetailLayout
      beforeStats={
        <LeituraRapida
          alinhamento={alinhamento}
          ano={anoCorrente}
          casa={parlamentar.casa}
          coerencia={coerenciaStats}
          comparacoes={comparacoes}
          gastos={gastos}
          proposicoesCount={proposicoes.length}
          proposicoesParcial={!!proposicoesPage.nextCursor}
        />
      }
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Parlamentares', href: '/parlamentares' },
            { label: parlamentar.nome },
          ]}
        />
      }
      defaultOpenMobile={['votos', 'alinhamento']}
      footer={
        <footer className="mt-8 border-line-default border-t pt-6">
          <p className="text-fg-tertiary text-sm">
            Explorar mais parlamentares:
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-1.5 rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
              href={`/parlamentares?partido=${encodeURIComponent(parlamentar.partidoSigla)}`}
            >
              Ver outros do {parlamentar.partidoSigla}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
            <Link
              className="inline-flex items-center gap-1.5 rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 font-medium text-fg-primary text-sm hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
              href={`/parlamentares?uf=${parlamentar.uf}`}
            >
              Ver outros de {parlamentar.uf}
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </div>
        </footer>
      }
      header={
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
      }
      sections={sections}
      stats={
        <StatGroup
          className="overflow-hidden rounded-lg border border-line-default"
          cols={4}
          layout="grid"
        >
          <Stat
            icon={<Vote className="h-4 w-4" />}
            label="Alinhamento à bancada"
            tone={alinhamentoTone}
            value={
              alinhamento.percentual === null
                ? '—'
                : `${alinhamento.percentual}%`
            }
            hint={
              <>
                {alinhamento.emFederacao
                  ? 'orientação publicada pela federação'
                  : alinhamento.total > 0
                    ? `${alinhamento.alinhados}/${alinhamento.total} com orientação`
                    : 'sem orientação no período'}
                {comparacoes.medianaAlinhamentoCasa !== null ? (
                  <>
                    {' · '}
                    <span className="text-fg-quaternary">
                      mediana da {casaLabel(parlamentar.casa)} em{' '}
                      {Math.round(comparacoes.medianaAlinhamentoCasa)}%
                    </span>
                  </>
                ) : null}
              </>
            }
          />
          <Stat
            icon={<Users className="h-4 w-4" />}
            label="Votações analisadas"
            value={alinhamento.total > 0 ? alinhamento.total : votos.length}
            hint={
              alinhamento.total > 0 ? 'com orientação' : 'recentes (nominais)'
            }
          />
          <Stat
            icon={<Inbox className="h-4 w-4" />}
            label="Proposições como autor"
            value={proposicoes.length}
            hint={
              <>
                {proposicoesPage.nextCursor ? 'primeira página' : ''}
                {comparacoes.percentilProposicoesCasa !== null ? (
                  <>
                    {proposicoesPage.nextCursor ? ' · ' : ''}
                    <span className="text-fg-quaternary">
                      {formatPercentil(comparacoes.percentilProposicoesCasa)} da{' '}
                      {casaLabel(parlamentar.casa)}
                    </span>
                  </>
                ) : null}
              </>
            }
          />
          <Stat
            icon={<TrendingDown className="h-4 w-4" />}
            label={`Gastos CEAP ${anoCorrente}`}
            value={
              gastos.totalRegistros === 0 ? '—' : formatBRL(gastos.totalGeral)
            }
            hint={
              <>
                {gastos.totalRegistros === 0
                  ? 'sem gastos registrados'
                  : `${gastos.totalRegistros} registros`}
                {comparacoes.percentilGastoCasa !== null &&
                gastos.totalRegistros > 0 ? (
                  <>
                    {' · '}
                    <span className="text-fg-quaternary">
                      {formatPercentil(comparacoes.percentilGastoCasa)} da{' '}
                      {casaLabel(parlamentar.casa)}
                    </span>
                  </>
                ) : null}
              </>
            }
          />
        </StatGroup>
      }
    />
  )
}
