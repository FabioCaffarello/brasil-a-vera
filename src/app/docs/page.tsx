import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Documentação — Brasil a Vera',
  description:
    'Guia rápido do Brasil a Vera: o que é, como usar, fontes de dados e limitações conhecidas.',
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Documentação
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Guia rápido para visitantes, contribuidores e desenvolvedores
          curiosos.
        </p>
      </header>

      <Section title="O que é o Brasil a Vera">
        <P>
          Plataforma open source de transparência política brasileira, mantida
          por doação e projetada para ter custo operacional próximo de zero. O
          objetivo é consolidar dados públicos do Legislativo (Câmara dos
          Deputados, Senado Federal) em uma interface acessível para qualquer
          cidadão.
        </P>
        <P>
          O slogan resume o propósito:{' '}
          <em>Você escolheu quem te representa. Agora veja o que ele faz.</em>
        </P>
      </Section>

      <Section title="Como navegar">
        <Ul>
          <Li>
            <Link href="/parlamentares" className={linkClass}>
              /parlamentares
            </Link>{' '}
            — listagem de deputados e senadores com filtros por casa, partido e
            UF.
          </Li>
          <Li>
            <Link href="/parlamentares" className={linkClass}>
              /parlamentares/[id]
            </Link>{' '}
            — perfil completo: votos, proposições, gastos, alinhamento
            partidário e top afinidades de voto.
          </Li>
          <Li>
            <Link href="/proposicoes" className={linkClass}>
              /proposicoes
            </Link>{' '}
            — proposições legislativas (PL, PEC, PLP, MPV, PDC, PRC) com
            tramitação detalhada.
          </Li>
          <Li>
            <Link href="/votacoes" className={linkClass}>
              /votacoes
            </Link>{' '}
            — votações nominais com voto individual por parlamentar e orientação
            partidária (Câmara).
          </Li>
          <Li>
            <Link href="/partidos/PT" className={linkClass}>
              /partidos/[sigla]
            </Link>{' '}
            — bancada, fidelidade interna média, temas de proposições e gastos
            agregados por partido.
          </Li>
          <Li>
            <Link href="/comparar" className={linkClass}>
              /comparar
            </Link>{' '}
            — comparativo lado a lado de 2 a 3 parlamentares (concordância par a
            par, gastos, presenças).
          </Li>
          <Li>
            <Link href="/busca" className={linkClass}>
              /busca
            </Link>{' '}
            — busca livre por nome, número de proposição ou sigla.
          </Li>
        </Ul>
      </Section>

      <Section title="Fontes de dados">
        <Ul>
          <Li>
            <strong>Câmara dos Deputados</strong> —{' '}
            <ExternalLink href="https://dadosabertos.camara.leg.br/swagger/api.html">
              dadosabertos.camara.leg.br
            </ExternalLink>{' '}
            (proposições, votações, votos nominais, orientação partidária,
            CEAP).
          </Li>
          <Li>
            <strong>Senado Federal</strong> —{' '}
            <ExternalLink href="https://legis.senado.leg.br/dadosabertos/docs/">
              legis.senado.leg.br/dadosabertos
            </ExternalLink>{' '}
            (senadores, proposições, votações, votos nominais).
          </Li>
          <Li>
            Cobertura temporal atual: <strong>legislaturas 56 e 57</strong>{' '}
            (2019–2026). Vide{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/ADR/016-cobertura-temporal-arquivamento.md">
              ADR-016
            </ExternalLink>
            .
          </Li>
        </Ul>
      </Section>

      <Section title="Pirâmide de Confiança">
        <P>
          Todo dado exibido carrega um nível de confiança explícito. Detalhes
          completos em{' '}
          <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/TRUST-PYRAMID.md">
            TRUST-PYRAMID.md
          </ExternalLink>
          .
        </P>
        <Ul>
          <Li>
            <strong>L1</strong> — dado bruto da fonte oficial (nome, partido,
            voto registrado).
          </Li>
          <Li>
            <strong>L2</strong> — agregação determinística (total de votos, soma
            de gastos, contagem de proposições).
          </Li>
          <Li>
            <strong>L3</strong> — métrica derivada com fórmula aberta
            (concordância par a par, alinhamento à bancada, índice de
            coerência).
          </Li>
          <Li>
            <strong>L4</strong> — estimativa modelada (reservado para Wave 3+,
            ainda não em produção).
          </Li>
        </Ul>
      </Section>

      <Section title="Limitações conhecidas">
        <Ul>
          <Li>
            <strong>Alinhamento partidário — Senado</strong>: a API do Senado
            não publica orientações partidárias de bancada. Senadores permanecem
            em empty state na seção de alinhamento. Tracking em{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/issues/83">
              issue #83
            </ExternalLink>
            .
          </Li>
          <Li>
            <strong>Amostra mínima do alinhamento</strong>: o cálculo de
            alinhamento partidário exige ≥ 50 votos comparáveis (não AUSENTE,
            não LIBERADO). Conforme o cron de votações acumula histórico, mais
            parlamentares atingem o threshold.
          </Li>
          <Li>
            <strong>Senado — limitação CEAP</strong>: o Senado não possui
            equivalente direto da Cota para Exercício da Atividade Parlamentar;
            gastos não cobrem senadores.
          </Li>
          <Li>
            <strong>Cobertura de tramitação</strong>: cresce a cada execução do
            cron semanal de ingestão. Proposições compartilhadas Câmara↔Senado
            têm rastros separados por casa (
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/issues/74">
              #74
            </ExternalLink>
            ).
          </Li>
        </Ul>
      </Section>

      <Section title="Como contribuir">
        <P>
          O projeto é open source sob licença permissiva. Issues, PRs e
          discussões de arquitetura são bem-vindos.
        </P>
        <Ul>
          <Li>
            Código:{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera">
              github.com/FabioCaffarello/brasil-a-vera
            </ExternalLink>
          </Li>
          <Li>
            Guia de contribuição:{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/contributing/CONTRIBUTING.md">
              CONTRIBUTING.md
            </ExternalLink>
          </Li>
          <Li>
            Decisões arquiteturais:{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/tree/main/docs/architecture/ADR">
              docs/architecture/ADR
            </ExternalLink>
          </Li>
          <Li>
            Roadmap:{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/product/ROADMAP.md">
              ROADMAP.md
            </ExternalLink>
          </Li>
        </Ul>
      </Section>
    </div>
  )
}

const linkClass =
  'text-zinc-900 underline underline-offset-2 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      <div className="space-y-4 text-base text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-2 leading-relaxed">{children}</ul>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="pl-1">— {children}</li>
}

function ExternalLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  )
}
