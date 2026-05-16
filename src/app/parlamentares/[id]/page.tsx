import { notFound } from 'next/navigation'

import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { AlinhamentoBancada } from '@/components/parlamentar/alinhamento'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'
import { ParesContraditorios } from '@/components/parlamentar/pares-contraditorios'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
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
  if (!parlamentar) return { title: 'Parlamentar — Brasil a Vera' }
  const cargo = parlamentar.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const title = `${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) — Brasil a Vera`
  const description = `${cargo} pelo ${parlamentar.partidoSigla}/${parlamentar.uf}. O que vota, propõe e gasta.`
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <header className="mb-3">
        <h2 className="font-medium text-foreground-muted text-sm uppercase tracking-wide">
          {title}
        </h2>
        {hint && <p className="mt-0.5 text-foreground-muted text-xs">{hint}</p>}
      </header>
      {children}
    </section>
  )
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

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
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

      {/* Tier 1 — ação legislativa (cobertura ≥ 22%). Ordem: o que votou →
          se seguiu a bancada → o que propôs → como gastou. Sprint 3.1
          Tarefa 3 — hierarquia reflete cobertura empírica. */}
      <Section
        title="Votos recentes"
        hint="Apenas votações nominais (com voto individual registrado). Comissões frequentemente decidem em votação simbólica — esses casos não aparecem aqui."
      >
        <VotosRecentes votos={votos} />
      </Section>

      <Section
        title="Alinhamento à bancada"
        hint="% de votos que coincidem com a orientação do partido. Mede a fidelidade prática à liderança partidária — não compromisso ideológico."
      >
        <AlinhamentoBancada alinhamento={alinhamento} casa={parlamentar.casa} />
      </Section>

      <Section
        title="Proposições onde é autor ou coautor"
        hint="Limitado às proposições já ingeridas no Brasil a Vera. Pode não refletir toda a produção legislativa histórica do parlamentar."
      >
        <ProposicoesAutor proposicoes={proposicoes} />
      </Section>

      <Section
        title={`Gastos parlamentares — ${anoCorrente}`}
        hint="Cota para Exercício da Atividade Parlamentar (CEAP) reportada pela Câmara. Senado tem regime próprio, ainda não ingerido."
      >
        <GastosResumoBlock ano={anoCorrente} resumo={gastos} />
      </Section>

      {/* Tier 3 — análises comparativas (cobertura < 15%). Movidas para
          seção secundária com separador visual + heading explicativo para
          não competir com o conteúdo principal quando vazias. Sprint 3.1
          Tarefa 3 — wireframe aprovado em 2026-05-15. */}
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
          <Section
            title="Top 5 maior afinidade de voto"
            hint="Outros parlamentares que mais coincidem no voto. Mostra concordância prática, não alinhamento ideológico declarado."
          >
            <Top5Afinidade afinidades={afinidades} />
          </Section>

          <Section
            title="Pares de votos em direções opostas"
            hint="Mesmo tema, direções inversas (uma restritiva, outra permissiva), voto idêntico. A plataforma é o espelho — o cidadão tira a conclusão."
          >
            <ParesContraditorios
              pares={paresContraditorios}
              stats={coerenciaStats}
            />
          </Section>
        </div>
      </div>
    </div>
  )
}
