import type { Metadata } from 'next'

import {
  DocsHeader,
  ExternalLink,
  Li,
  P,
  Section,
  Ul,
} from '../_components/typography'

export const metadata: Metadata = {
  title: 'Fontes e cadência — Brasil à Vera',
  description:
    'Quais APIs alimentam o Brasil à Vera, com que frequência ingerem dados, cobertura temporal e limitações conhecidas.',
}

// Conteúdo derivado de docs/architecture/DATA-SOURCES.md e
// docs/architecture/ADR/016-cobertura-temporal-arquivamento.md. Foco em
// linguagem para cidadão — não duplica a parte técnica (rate limits,
// endpoints exatos) que vive nos documentos canônicos.

type SourceCard = {
  name: string
  url: string
  scope: string
  cadence: { label: string; value: string }[]
  caveats: string[]
}

const SOURCES: SourceCard[] = [
  {
    name: 'Câmara dos Deputados',
    url: 'https://dadosabertos.camara.leg.br',
    scope:
      'Deputados em exercício, proposições, tramitação, votações nominais, orientação de bancada, gastos CEAP.',
    cadence: [
      { label: 'Votações', value: '4× por dia' },
      { label: 'Deputados / comissões', value: 'diário' },
      { label: 'Proposições / tramitação', value: 'semanal' },
      { label: 'Gastos CEAP', value: 'semanal' },
    ],
    caveats: [
      'Votações em comissões com tramitação conclusiva podem não ter voto nominal em plenário registrado.',
      'CEAP demora dias a semanas entre a despesa real e a publicação na API.',
    ],
  },
  {
    name: 'Senado Federal',
    url: 'https://legis.senado.leg.br/dadosabertos',
    scope:
      'Senadores em exercício, proposições (matérias), votações nominais. Sem CEAP equivalente.',
    cadence: [
      { label: 'Votações', value: '4× por dia' },
      { label: 'Senadores / matérias', value: 'diário' },
    ],
    caveats: [
      'A API não publica orientações de bancada — alinhamento partidário de senadores fica em empty state. Tracking em issue #83.',
      'Senado não tem cota de despesas equivalente à CEAP da Câmara.',
    ],
  },
]

const PLANNED: { name: string; status: string; targetWave: string }[] = [
  {
    name: 'TSE — doações de campanha, candidaturas, resultados',
    status:
      'Não ingerido ainda. Dados publicados em bulk CSV por eleição, encoding Latin-1, vinculação por CPF.',
    targetWave: 'Wave 3.3',
  },
  {
    name: 'Portal da Transparência (CGU) — emendas parlamentares, contratos',
    status:
      'Não ingerido ainda. Requer API key gratuita e respeito a rate limits específicos.',
    targetWave: 'Wave 3+',
  },
  {
    name: 'IBGE — indicadores demográficos e socioeconômicos',
    status:
      'Não ingerido ainda. Útil apenas para análises L3/L4 (correlação política × indicador social).',
    targetWave: 'Wave 3.4+',
  },
]

export default function FontesPage() {
  return (
    <>
      <DocsHeader
        title="Fontes e cadência"
        subtitle="De onde vem cada dado e com que frequência o Brasil à Vera atualiza."
      />

      <Section title="Princípio de rastreabilidade">
        <P>
          Todo dado exibido carrega <em>de onde veio</em> e{' '}
          <em>quando chegou</em>. Cada registro guarda:
        </P>
        <Ul>
          <Li>
            <strong>URL da fonte oficial</strong> — link direto para o registro
            original na API que publicou o dado.
          </Li>
          <Li>
            <strong>Nome da fonte</strong> — ex: "Câmara dos Deputados API v2",
            "Senado Federal Dados Abertos".
          </Li>
          <Li>
            <strong>Timestamp da ingestão</strong> — momento em que o Brasil a
            Vera leu o dado pela última vez.
          </Li>
        </Ul>
        <P>
          Esse metadado permite que qualquer cidadão verifique independentemente
          cada dado exibido — basta clicar no link.
        </P>
      </Section>

      <Section title="Fontes oficiais em produção">
        <div className="space-y-6">
          {SOURCES.map((source) => (
            <article
              className="rounded-lg border border-line-default bg-surface-base p-5"
              key={source.name}
            >
              <header className="mb-3">
                <h3 className="font-semibold text-fg-primary">{source.name}</h3>
                <p className="text-fg-tertiary text-sm">
                  <ExternalLink href={source.url}>{source.url}</ExternalLink>
                </p>
              </header>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-fg-primary">O que ingere</dt>
                  <dd className="mt-1 text-fg-primary">{source.scope}</dd>
                </div>
                <div>
                  <dt className="font-medium text-fg-primary">
                    Cadência de atualização
                  </dt>
                  <dd className="mt-1">
                    <ul className="space-y-1 text-fg-primary">
                      {source.cadence.map((row) => (
                        <li key={row.label}>
                          <strong>{row.label}</strong>: {row.value}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-fg-primary">
                    Particularidades
                  </dt>
                  <dd className="mt-1">
                    <ul className="space-y-1 text-fg-primary">
                      {source.caveats.map((c) => (
                        <li key={c}>— {c}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Cobertura temporal">
        <P>
          O Brasil à Vera cobre as <strong>legislaturas 56 e 57</strong>{' '}
          (2019–2026). Legislaturas anteriores estão fora do escopo por agora —
          os dados existem nas fontes oficiais, mas a ingestão histórica seria
          custosa em tempo e armazenamento sem demanda empírica clara.
        </P>
        <Ul>
          <Li>
            Critério de inclusão e plano de arquivamento documentados em{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/ADR/016-cobertura-temporal-arquivamento.md">
              ADR-016
            </ExternalLink>
            .
          </Li>
        </Ul>
      </Section>

      <Section title="Fontes planejadas (não em produção)">
        <P>
          Fontes adicionais previstas no roadmap. Cada uma traz seu próprio
          conjunto de desafios (encoding, rate limits, vinculação entre IDs). A
          inclusão é gradual, conforme o produto consolida o uso das fontes
          atuais.
        </P>
        <div className="space-y-4">
          {PLANNED.map((p) => (
            <div
              className="rounded-lg border border-line-default border-dashed bg-surface-base/50 p-4"
              key={p.name}
            >
              <h3 className="font-medium text-fg-primary">{p.name}</h3>
              <p className="mt-1 text-fg-primary text-sm">{p.status}</p>
              <p className="mt-1 text-fg-tertiary text-xs">
                Previsão: {p.targetWave}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Tempo entre o fato e a plataforma">
        <P>
          Entre o momento em que um parlamentar vota uma matéria e o momento em
          que esse voto aparece no Brasil à Vera, há duas latências em série:
        </P>
        <Ul>
          <Li>
            <strong>Latência da fonte oficial</strong>: a Câmara publica
            votações no mesmo dia, frequentemente em minutos. CEAP demora dias a
            semanas. TSE publica bulk só pós-eleição.
          </Li>
          <Li>
            <strong>Latência do cron de ingestão</strong>: o Brasil à Vera lê a
            fonte oficial em janelas pré-definidas (ver cadência acima). No pior
            caso de votações, são até 6 horas entre o registro na fonte e a
            aparição no site.
          </Li>
        </Ul>
        <P>
          O timestamp da última ingestão fica visível na plataforma — basta
          consultar o badge L1 em qualquer registro.
        </P>
      </Section>

      <Section title="Tratamento de falhas">
        <P>
          APIs públicas brasileiras são frequentemente instáveis. O princípio
          operacional é simples:{' '}
          <strong>dados antigos são melhores que dados ausentes</strong>. Se um
          cron de ingestão falha, o sistema continua servindo o último snapshot
          bem-sucedido, com o timestamp visível, em vez de quebrar a tela.
        </P>
        <P>
          Todas as falhas de ingestão geram log estruturado e notificação para o
          mantenedor. Detalhes técnicos:
        </P>
        <Ul>
          <Li>
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/DATA-SOURCES.md#tratamento-de-falhas">
              DATA-SOURCES.md — Tratamento de Falhas
            </ExternalLink>
          </Li>
        </Ul>
      </Section>
    </>
  )
}
