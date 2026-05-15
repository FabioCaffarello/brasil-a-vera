import type { Metadata } from 'next'

import { TrustBadge } from '@/components/trust/trust-badge'
import type { TrustLevel } from '@/shared/trust'

import {
  DocsHeader,
  ExternalLink,
  Li,
  P,
  Section,
  Ul,
} from '../_components/typography'

export const metadata: Metadata = {
  title: 'Pirâmide de Confiança — Brasil a Vera',
  description:
    'Os quatro níveis (L1, L2, L3, L4) que classificam todo dado exibido no Brasil a Vera, com exemplos e como reconhecer cada um.',
}

type LevelCard = {
  level: TrustLevel
  whatIs: string
  example: string
  howToRead: string
}

// Conteúdo derivado de docs/architecture/TRUST-PYRAMID.md mas adaptado para
// público cívico (visitante sem familiaridade com o vocabulário arquitetural).
const LEVELS: LevelCard[] = [
  {
    level: 'L1',
    whatIs:
      'Dado bruto vindo direto de uma fonte oficial (API da Câmara, API do Senado). Sem transformação interpretativa — apenas normalização de formato (encoding, datas).',
    example:
      '"Deputado X votou SIM na votação Y em 12/05/2026" — registro literal da API da Câmara.',
    howToRead:
      'Verificável independentemente: cada registro carrega um link para a fonte oficial. Se a plataforma mostra L1, o cidadão pode clicar e conferir na API original.',
  },
  {
    level: 'L2',
    whatIs:
      'Agregação determinística de dados L1 com fórmula pública. Mesmos inputs sempre geram o mesmo output. A fórmula vive no repositório open source.',
    example:
      '"Deputado X votou 73% alinhado com a bancada do partido em 2026" — contagem direta de coincidências de voto vs. orientação partidária.',
    howToRead:
      'Reprodutível: qualquer pessoa com acesso aos dados L1 e à fórmula deve chegar ao mesmo número. Se a fórmula muda, o histórico é recalculado.',
  },
  {
    level: 'L3',
    whatIs:
      'Cálculo derivado com fórmula aberta mas que envolve julgamento interpretativo (escolha de threshold, janela temporal, agrupamento por similaridade).',
    example:
      '"Top 5 deputados com afinidade de voto com X" — coincidência de voto sobre janela de 12 meses, com quórum mínimo de 20 votações comparáveis.',
    howToRead:
      'Auditável mas não neutro: a escolha dos parâmetros (12 meses, 20 votações) é decisão editorial documentada. Outra parametrização daria outro resultado.',
  },
  {
    level: 'L4',
    whatIs:
      'Estimativa baseada em modelo ou heurística. Reservado para análises futuras (Wave 3.4+) — ainda não em produção.',
    example:
      '"Estimativa de alinhamento ideológico de X com pauta governista" — modelo treinado sobre histórico de votos com viés explícito.',
    howToRead:
      'Quando estiver disponível, virá sob sub-marca "Brasil a Vera Labs" com identidade visual distinta. Nenhum dado L4 aparece hoje na plataforma.',
  },
]

export default function PiramideDeConfianca() {
  return (
    <>
      <DocsHeader
        title="Pirâmide de Confiança"
        subtitle="Como o Brasil a Vera classifica cada dado que exibe."
      />

      <Section title="O princípio">
        <P>
          Todo dado exibido no Brasil a Vera carrega um{' '}
          <em>nível de confiança</em> explícito. A regra é simples:{' '}
          <strong>fatos brutos</strong> aparecem separados de{' '}
          <strong>análises derivadas</strong>, e nenhum número aparece sem que o
          cidadão saiba de onde veio.
        </P>
        <P>
          Quatro níveis (L1, L2, L3, L4) cobrem desde o dado oficial sem
          transformação até estimativas modeladas. Cada um tem um <em>badge</em>{' '}
          próprio na interface, com cor distinta. Passe o mouse ou o foco sobre
          qualquer badge no site para ver uma explicação rápida do nível.
        </P>
      </Section>

      <Section title="Os quatro níveis">
        <ul className="space-y-6">
          {LEVELS.map(({ level, whatIs, example, howToRead }) => (
            <li
              key={level}
              className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <div className="mb-3">
                <TrustBadge trustLevel={level} />
              </div>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    O que é
                  </dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {whatIs}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    Exemplo
                  </dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300 italic">
                    {example}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-zinc-900 dark:text-zinc-100">
                    Como ler
                  </dt>
                  <dd className="mt-1 text-zinc-700 dark:text-zinc-300">
                    {howToRead}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Por que essa separação importa">
        <P>
          Plataformas de transparência costumam misturar fato e interpretação na
          mesma tela. Isso facilita a comunicação, mas confunde quem precisa
          decidir <em>em quê</em> confiar. Quando "votou SIM" e "tem 73% de
          alinhamento" aparecem com o mesmo peso visual, o cidadão deixa de
          distinguir o que é dado oficial do que é cálculo do site.
        </P>
        <P>
          A pirâmide é a estrutura que evita essa confusão. L1 é o que a Câmara
          publicou. L2 é o que o Brasil a Vera calculou com fórmula aberta. L3
          envolve escolhas editoriais (que ficam documentadas). L4, quando
          existir, virá em sub-marca separada.
        </P>
        <P>
          O <em>contrato de confiança</em> também é estrutural: nenhum cálculo
          L2/L3 pode ser feito sem ter dados L1 como base, e nenhum cálculo mais
          alto pode "contaminar" um mais baixo. Se todo código de L3 for
          removido amanhã, os dados L1 e L2 continuam funcionando intactos.
        </P>
      </Section>

      <Section title="Onde isso aparece na interface">
        <Ul>
          <Li>
            <strong>Badge em cada métrica</strong>: ao lado de cada número ou
            seção, o nível de confiança correspondente. Foque (Tab) ou passe o
            mouse para abrir o tooltip com descrição.
          </Li>
          <Li>
            <strong>Página inicial</strong>: a seção "Pirâmide de Confiança"
            traz um exemplo concreto de cada nível.
          </Li>
          <Li>
            <strong>Exports CSV</strong>: cada linha do CSV inclui a coluna{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              trust_level
            </code>{' '}
            — dado retirado do contexto da plataforma mantém a classificação.
          </Li>
        </Ul>
      </Section>

      <Section title="Documentação técnica completa">
        <P>
          Este texto é a versão cívica. Para quem quer entender a implementação
          arquitetural (tabelas no banco, regras por camada, isolamento
          estrutural), o documento canônico no repositório:
        </P>
        <Ul>
          <Li>
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/TRUST-PYRAMID.md">
              TRUST-PYRAMID.md
            </ExternalLink>
          </Li>
        </Ul>
      </Section>
    </>
  )
}
