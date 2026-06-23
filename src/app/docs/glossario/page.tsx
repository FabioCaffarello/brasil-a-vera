import type { Metadata } from 'next'

import { DocsHeader, ExternalLink, P, Section } from '../_components/typography'

export const metadata: Metadata = {
  title: 'Glossário — Brasil à Vera',
  description:
    'Termos do processo legislativo brasileiro com linguagem acessível ao lado da definição técnica.',
}

// Conteúdo derivado de docs/domain/LEGISLATIVE-PROCESS.md. Termos selecionados:
// vocabulário que aparece em algum lugar da UI ou que cidadão precisa
// para interpretar perfil/votação/proposição. Não duplicar o documento
// inteiro — recortar para o que o produto efetivamente expõe.

type TermEntry = {
  term: string
  technical: string
  acessivel: string
}

type Group = {
  title: string
  entries: TermEntry[]
}

const GROUPS: Group[] = [
  {
    title: 'Estrutura legislativa',
    entries: [
      {
        term: 'Câmara dos Deputados',
        technical:
          'Casa baixa do Congresso Nacional. 513 deputados federais eleitos a cada 4 anos.',
        acessivel: 'A casa dos deputados, com 513 membros.',
      },
      {
        term: 'Senado Federal',
        technical:
          'Casa alta do Congresso Nacional. 81 senadores eleitos para mandato de 8 anos, com renovação alternada de 1/3 e 2/3.',
        acessivel: 'A casa dos senadores, com 81 membros e mandato longo.',
      },
      {
        term: 'Legislatura',
        technical:
          'Período de 4 anos correspondente ao mandato dos deputados federais. A 57ª legislatura vai de 2023 a 2027.',
        acessivel: 'Um mandato de 4 anos da Câmara.',
      },
      {
        term: 'Bancada',
        technical:
          'Conjunto de parlamentares de um partido ou bloco numa casa.',
        acessivel: 'O grupo de parlamentares de um partido.',
      },
      {
        term: 'Bloco parlamentar',
        technical:
          'Aliança formal entre partidos com efeitos regimentais (tempo de fala, comissões).',
        acessivel: 'Aliança formal entre partidos para atuar junto.',
      },
      {
        term: 'Frente parlamentar',
        technical:
          'Grupo suprapartidário de parlamentares organizado em torno de um tema (educação, agro, ambiente).',
        acessivel: 'Grupo de parlamentares de vários partidos focado num tema.',
      },
      {
        term: 'Mesa Diretora',
        technical:
          'Órgão administrativo da Casa (presidente, vice, secretários). Conduz sessões.',
        acessivel: 'Diretoria que comanda a Câmara ou o Senado.',
      },
    ],
  },
  {
    title: 'Tipos de proposição',
    entries: [
      {
        term: 'PEC — Proposta de Emenda à Constituição',
        technical:
          'Altera a Constituição Federal. Quórum de aprovação: 3/5 dos membros (308 deputados ou 49 senadores), em dois turnos por Casa.',
        acessivel:
          'Proposta para mudar a Constituição — precisa de apoio muito amplo para ser aprovada.',
      },
      {
        term: 'PLP — Projeto de Lei Complementar',
        technical:
          'Regulamenta matérias que a Constituição reservou para lei complementar. Quórum: maioria absoluta (257 deputados ou 41 senadores).',
        acessivel:
          'Projeto de lei para assuntos que a Constituição exige aprovação reforçada.',
      },
      {
        term: 'PL — Projeto de Lei Ordinária',
        technical:
          'Cria regras gerais que não contrariem a Constituição. Quórum: maioria simples (50% + 1 dos presentes). Tipo mais comum.',
        acessivel:
          'Projeto de lei comum — precisa da maioria dos presentes na votação.',
      },
      {
        term: 'MPV — Medida Provisória',
        technical:
          'Tem força de lei imediata; editada pelo Presidente. Prazo de 60 + 60 dias para votação. Quórum de aprovação: maioria simples.',
        acessivel:
          'Decisão do Presidente com efeito imediato — o Congresso precisa aprovar para virar lei permanente.',
      },
      {
        term: 'PDC — Projeto de Decreto Legislativo',
        technical:
          'Regulamenta matérias de competência exclusiva do Congresso (tratados internacionais, sustação de atos do Executivo).',
        acessivel:
          'Decisão exclusiva do Congresso — não precisa de sanção presidencial.',
      },
      {
        term: 'PRC — Projeto de Resolução',
        technical:
          'Regulamenta assuntos internos de cada Casa (regimento interno, criação de comissões).',
        acessivel: 'Regras internas da Câmara ou do Senado.',
      },
    ],
  },
  {
    title: 'Tramitação',
    entries: [
      {
        term: 'Tramitação',
        technical:
          'Percurso da proposição pelas comissões e plenário, da apresentação à decisão final.',
        acessivel: 'O caminho da lei dentro do Congresso.',
      },
      {
        term: 'Tramitação conclusiva',
        technical:
          'Modalidade em que a proposição é decidida apenas nas comissões temáticas, sem chegar ao Plenário, salvo recurso.',
        acessivel: 'Votação só nos grupos temáticos, sem ir ao plenário.',
      },
      {
        term: 'Comissão permanente',
        technical:
          'Órgão temático fixo da Casa (Comissão de Educação, Comissão de Agricultura etc). Analisa proposições da sua área.',
        acessivel: 'Grupo que analisa leis de um tema específico.',
      },
      {
        term: 'CPI — Comissão Parlamentar de Inquérito',
        technical:
          'Comissão temporária criada para investigar fato determinado. Poderes de investigação próprios de autoridades judiciais.',
        acessivel: 'Investigação conduzida pelo Congresso.',
      },
      {
        term: 'Relator',
        technical:
          'Parlamentar designado pela comissão para analisar a proposição e apresentar parecer.',
        acessivel: 'Parlamentar responsável por avaliar o projeto.',
      },
      {
        term: 'Parecer',
        technical:
          'Opinião formal do relator sobre a proposição. Pode ser favorável, contrário ou pela aprovação com alterações.',
        acessivel: 'A análise oficial do relator.',
      },
      {
        term: 'Substitutivo',
        technical:
          'Nova versão integral do texto da proposição, geralmente apresentada pelo relator. Pode alterar profundamente o conteúdo original.',
        acessivel:
          'Reescrita completa do projeto, que pode mudar bastante o sentido.',
      },
      {
        term: 'Emenda',
        technical:
          'Alteração pontual ao texto da proposição apresentada por qualquer parlamentar durante a tramitação.',
        acessivel: 'Mudança específica num trecho do projeto.',
      },
      {
        term: 'Sanção',
        technical:
          'Aprovação do Presidente da República ao projeto aprovado pelo Congresso, transformando-o em lei.',
        acessivel: 'Assinatura do Presidente que transforma o projeto em lei.',
      },
      {
        term: 'Veto',
        technical:
          'Recusa do Presidente a parte ou totalidade do projeto aprovado pelo Congresso. Pode ser derrubado por maioria absoluta em sessão conjunta.',
        acessivel: 'Quando o Presidente recusa parte ou tudo do projeto.',
      },
      {
        term: 'Regime de urgência',
        technical:
          'Tramitação acelerada que pula etapas regimentais. Pode ser solicitado pelo plenário ou ter origem constitucional (MPs após 45 dias).',
        acessivel: 'Tramitação acelerada com menos etapas.',
      },
    ],
  },
  {
    title: 'Votação',
    entries: [
      {
        term: 'Votação nominal',
        technical:
          'Cada parlamentar registra seu voto eletronicamente. É a única modalidade com voto individual público.',
        acessivel: 'Votação em que dá para ver como cada um votou.',
      },
      {
        term: 'Votação simbólica',
        technical:
          'Presidente pede que favoráveis permaneçam sentados e contrários se levantem. Sem registro individual.',
        acessivel: 'Votação rápida sem registro de quem votou o quê.',
      },
      {
        term: 'Quórum',
        technical:
          'Número mínimo de presentes para iniciar a sessão (quórum de presença) ou aprovar a matéria (quórum de aprovação).',
        acessivel: 'Mínimo de parlamentares necessários.',
      },
      {
        term: 'Maioria simples',
        technical:
          'Mais da metade dos presentes (50% + 1 dos votantes). Padrão para PL, MPV, PDC, PRC.',
        acessivel: 'Maioria entre os que estão na sala.',
      },
      {
        term: 'Maioria absoluta',
        technical:
          'Mais da metade dos membros totais (257 deputados ou 41 senadores), independentemente de presença. Padrão para PLP.',
        acessivel: 'Maioria contando todos os parlamentares, presentes ou não.',
      },
      {
        term: 'Maioria qualificada (3/5)',
        technical:
          '3/5 dos membros totais (308 deputados ou 49 senadores). Padrão para PEC.',
        acessivel:
          'Apoio maior que a maioria — exigência para mudar a Constituição.',
      },
      {
        term: 'Orientação de bancada',
        technical:
          'Sinalização formal do líder partidário sobre como a bancada deve votar (SIM, NÃO, LIBERADO, OBSTRUÇÃO).',
        acessivel: 'Como o líder do partido recomenda que a bancada vote.',
      },
      {
        term: 'Obstrução',
        technical:
          'Tática para impedir o quórum: parlamentares se ausentam do plenário ou seguem orientação formal de não votar.',
        acessivel: 'Sair da sala para impedir que a votação aconteça.',
      },
      {
        term: 'Abstenção',
        technical:
          'Parlamentar presente na sessão que opta formalmente por não tomar lado SIM ou NÃO.',
        acessivel: 'Está presente mas escolhe não votar a favor nem contra.',
      },
    ],
  },
  {
    title: 'Recursos do parlamentar',
    entries: [
      {
        term: 'CEAP — Cota para Exercício da Atividade Parlamentar',
        technical:
          'Verba mensal destinada a despesas do mandato do deputado federal (passagens, hospedagem, escritório de apoio, divulgação, alimentação). Notas fiscais públicas via API da Câmara.',
        acessivel: 'Verba mensal do deputado para tocar o mandato.',
      },
      {
        term: 'Emenda parlamentar',
        technical:
          'Alteração no orçamento da União proposta por parlamentar ou bancada. Direciona recursos federais para destinações específicas.',
        acessivel:
          'Forma do parlamentar destinar dinheiro do orçamento para algum lugar.',
      },
    ],
  },
]

export default function GlossarioPage() {
  return (
    <>
      <DocsHeader
        title="Glossário"
        subtitle="Termos do processo legislativo com linguagem acessível ao lado da definição técnica."
      />

      <Section title="Como usar">
        <P>
          Cada termo aparece com a definição técnica primeiro e a versão em
          linguagem acessível em seguida. A acessibilidade de linguagem é
          princípio do produto, mas a precisão técnica não pode ser sacrificada
          — por isso, as duas versões.
        </P>
      </Section>

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <dl className="space-y-5">
            {group.entries.map((entry) => (
              <div
                className="rounded-lg border border-line-default bg-surface-base p-4"
                key={entry.term}
              >
                <dt className="font-medium text-fg-primary">{entry.term}</dt>
                <dd className="mt-2 space-y-2 text-sm">
                  <p className="text-fg-primary">{entry.technical}</p>
                  <p className="text-fg-tertiary italic">
                    Linguagem acessível: {entry.acessivel}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </Section>
      ))}

      <Section title="Glossário completo no repositório">
        <P>
          Esta página cobre o vocabulário que aparece na interface do Brasil a
          Vera. O documento canônico (com diagramas de tramitação e mais
          termos):
        </P>
        <ul className="space-y-2 leading-relaxed">
          <li className="pl-1">
            —{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/domain/LEGISLATIVE-PROCESS.md">
              LEGISLATIVE-PROCESS.md
            </ExternalLink>
          </li>
        </ul>
      </Section>
    </>
  )
}
