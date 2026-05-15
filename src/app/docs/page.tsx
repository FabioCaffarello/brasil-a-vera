import type { Metadata } from 'next'
import Link from 'next/link'

import {
  DocsHeader,
  docsLinkClass,
  ExternalLink,
  Li,
  P,
  Section,
  Ul,
} from './_components/typography'

export const metadata: Metadata = {
  title: 'Documentação — Brasil a Vera',
  description:
    'Guia do Brasil a Vera: pirâmide de confiança, como ler um perfil, glossário do processo legislativo e fontes de dados.',
}

// Hub /docs — entrada da seção de documentação. Sub-páginas em rotas
// explícitas (não dynamic segment) conforme decisão C do plano Sprint 3.2.
// Conteúdo derivado de docs/architecture/TRUST-PYRAMID.md,
// docs/domain/LEGISLATIVE-PROCESS.md e docs/architecture/DATA-SOURCES.md.

const SUBPAGES = [
  {
    href: '/docs/piramide-de-confianca',
    title: 'Pirâmide de Confiança',
    description:
      'Os quatro níveis (L1, L2, L3, L4) que classificam todo dado da plataforma.',
  },
  {
    href: '/docs/como-ler-um-perfil',
    title: 'Como ler um perfil',
    description:
      'O que cada seção do perfil parlamentar mostra, o que ainda não cobre, e como interpretar os números.',
  },
  {
    href: '/docs/glossario',
    title: 'Glossário',
    description:
      'Termos do processo legislativo brasileiro com linguagem acessível ao lado da definição técnica.',
  },
  {
    href: '/docs/fontes',
    title: 'Fontes e cadência',
    description:
      'Quais APIs alimentam a plataforma, com que frequência ingerem dados, e quais limitações são conhecidas.',
  },
] as const

export default function DocsHub() {
  return (
    <>
      <DocsHeader
        title="Documentação"
        subtitle="Guia para visitantes, contribuidores e desenvolvedores curiosos."
      />

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

      <Section title="Por onde começar">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SUBPAGES.map((page) => (
            <li key={page.href}>
              <Link
                href={page.href}
                className="block h-full rounded-lg border border-zinc-200 bg-white p-4 transition-colors duration-150 hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-primary-700 dark:hover:bg-primary-950"
              >
                <h3 className="mb-1 font-medium text-zinc-900 dark:text-zinc-100">
                  {page.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {page.description}
                </p>
              </Link>
            </li>
          ))}
        </ul>
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

      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Toda a documentação completa vive no repositório no GitHub —{' '}
        <a
          href="https://github.com/FabioCaffarello/brasil-a-vera/tree/main/docs"
          target="_blank"
          rel="noopener noreferrer"
          className={docsLinkClass}
        >
          docs/
        </a>
        .
      </p>
    </>
  )
}
