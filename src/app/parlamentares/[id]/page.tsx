import { notFound } from 'next/navigation'

import { Top5Afinidade } from '@/components/parlamentar/afinidade-voto'
import { GastosResumoBlock } from '@/components/parlamentar/gastos-resumo'
import { PerfilHeader } from '@/components/parlamentar/perfil-header'
import { ProposicoesAutor } from '@/components/parlamentar/proposicoes-autor'
import { VotosRecentes } from '@/components/parlamentar/votos-recentes'
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
  return {
    title: `${parlamentar.nome} (${parlamentar.partidoSigla}/${parlamentar.uf}) — Brasil a Vera`,
    description: `${cargo} pelo ${parlamentar.partidoSigla}/${parlamentar.uf}. O que vota, propõe e gasta.`,
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
    <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900">
      <header className="mb-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
        </h2>
        {hint && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {hint}
          </p>
        )}
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
  const [votos, proposicoes, gastos, afinidades] = await Promise.all([
    getVotosRecentes(parlamentar.id, 10),
    getProposicoesAutoradas(parlamentar.id, 5),
    getGastosResumo(parlamentar.id, anoCorrente),
    getTop5Afinidade(parlamentar.id),
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

      <Section
        title="Votos recentes"
        hint="Apenas votações nominais (com voto individual registrado). Comissões frequentemente decidem em votação simbólica — esses casos não aparecem aqui."
      >
        <VotosRecentes votos={votos} />
      </Section>

      <Section
        title="Top 5 maior afinidade de voto"
        hint="Outros parlamentares que mais coincidem no voto. Mostra concordância prática, não alinhamento ideológico declarado."
      >
        <Top5Afinidade afinidades={afinidades} />
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
    </div>
  )
}
