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
                className="block h-full rounded-lg border border-border bg-surface p-4 transition-colors duration-150 hover:border-brand/60 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                href={page.href}
              >
                <h3 className="mb-1 font-medium text-foreground">
                  {page.title}
                </h3>
                <p className="text-foreground-muted text-sm">
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

      <p className="text-foreground-muted text-sm">
        Toda a documentação completa vive no repositório no GitHub —{' '}
        <a
          className={docsLinkClass}
          href="https://github.com/FabioCaffarello/brasil-a-vera/tree/main/docs"
          rel="noopener noreferrer"
          target="_blank"
        >
          docs/
        </a>
        .
      </p>
    </>
  )
}
