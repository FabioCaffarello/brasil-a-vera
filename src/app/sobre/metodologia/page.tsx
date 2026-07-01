import { Text } from '@fabio.caffarello/react-design-system/server'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Metodologia — Brasil à Vera',
  description:
    'Como cada número da plataforma é calculado, classificado e auditado: pirâmide de confiança, índice de alinhamento, índice de coerência e gastos CEAP.',
}

export const revalidate = 86400

// Página de metodologia — voltada para cidadão, jornalista e pesquisador.
// Responde: "Como esse número foi calculado e em quê posso confiar?"
// SSG pura (sem DB). Conteúdo derivado de:
//   docs/architecture/TRUST-PYRAMID.md
//   src/modules/parlamentares/domain/alinhamento.ts
//   src/modules/parlamentares/domain/coerencia.ts
//   src/modules/parlamentares/domain/direcao-classifier.ts

const linkClass =
  'text-fg-brand underline underline-offset-2 transition-colors hover:text-fg-brand/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface-canvas'

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="scroll-mt-20" id={id}>
      <h2 className="mb-4 font-semibold text-fg-primary text-xl tracking-tight">
        {title}
      </h2>
      <div className="space-y-4 text-base text-fg-primary leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function SubSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="mb-2 font-medium text-fg-secondary text-sm uppercase tracking-wide">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="body" className="text-fg-primary leading-relaxed">
      {children}
    </Text>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-line-default bg-surface-raised px-4 py-3 text-fg-tertiary text-sm leading-relaxed">
      {children}
    </div>
  )
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-md bg-surface-raised px-4 py-3">
      <code className="font-mono text-fg-primary text-sm">{children}</code>
    </div>
  )
}

const SECTIONS = [
  { id: 'piramide', label: 'Pirâmide de confiança' },
  { id: 'alinhamento', label: 'Índice de alinhamento' },
  { id: 'coerencia', label: 'Índice de coerência' },
  { id: 'gastos', label: 'Gastos CEAP' },
]

export default function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-3xl py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
          Metodologia
        </h1>
        <Text variant="body" className="mt-2 text-fg-tertiary text-lg">
          Como cada número da plataforma é calculado, classificado e auditado.
        </Text>
      </header>

      {/* Índice rápido */}
      <nav
        aria-label="Seções desta página"
        className="mb-12 rounded-lg border border-line-default bg-surface-raised p-5"
      >
        <p className="mb-3 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
          Nesta página
        </p>
        <ol className="space-y-1.5 text-sm">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a className={linkClass} href={`#${s.id}`}>
                {i + 1}. {s.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-14">
        {/* ── 1. Pirâmide de confiança ──────────────────────────────── */}
        <Section id="piramide" title="1. Pirâmide de confiança">
          <P>
            Todo dado exibido na plataforma carrega um nível de confiança
            explícito — um <em>badge</em> visível ao lado de cada métrica ou
            seção. Quatro níveis cobrem desde o dado oficial bruto até análises
            derivadas com julgamento editorial.
          </P>

          <div className="overflow-hidden rounded-lg border border-line-default">
            {[
              {
                badge: 'L1',
                label: 'Dado oficial',
                desc: 'Registro bruto vindo da API da Câmara ou do Senado, sem transformação interpretativa. Cada item carrega link para a fonte original.',
                example:
                  '"Deputado X votou SIM em 12/05/2026" — registro literal da API.',
              },
              {
                badge: 'L2',
                label: 'Agregação determinística',
                desc: 'Cálculo sobre dados L1 com fórmula pública. Mesmos inputs sempre produzem o mesmo output. A fórmula vive no repositório open source.',
                example:
                  '"73% de alinhamento com a bancada" — contagem de coincidências de voto vs. orientação.',
              },
              {
                badge: 'L3',
                label: 'Cálculo com parâmetros editoriais',
                desc: 'Fórmula aberta, mas com escolhas de threshold, janela temporal ou agrupamento que envolvem julgamento documentado.',
                example:
                  '"Top 5 com afinidade de voto" — janela de 12 meses, mínimo de 20 votações comparáveis.',
              },
              {
                badge: 'L4',
                label: 'Estimativa modelada',
                desc: 'Reservado para análises futuras baseadas em modelo ou heurística. Nenhum dado L4 está em produção hoje.',
                example:
                  'Estimativa de posicionamento ideológico — ainda não disponível.',
              },
            ].map((row, i) => (
              <div
                className={
                  i < 3
                    ? 'grid grid-cols-[3.5rem_1fr] border-b border-line-default'
                    : 'grid grid-cols-[3.5rem_1fr]'
                }
                key={row.badge}
              >
                <div className="flex items-center justify-center border-r border-line-default bg-surface-raised p-3">
                  <span className="font-mono font-bold text-fg-brand text-sm">
                    {row.badge}
                  </span>
                </div>
                <div className="p-4">
                  <p className="mb-1 font-medium text-fg-primary text-sm">
                    {row.label}
                  </p>
                  <p className="text-fg-secondary text-sm">{row.desc}</p>
                  <p className="mt-1.5 text-fg-tertiary text-sm italic">
                    Ex.: {row.example}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <P>
            Para a documentação técnica completa (isolamento estrutural entre
            camadas, regras por tabela no banco), veja{' '}
            <Link className={linkClass} href="/docs/piramide-de-confianca">
              Pirâmide de Confiança
            </Link>{' '}
            na seção de documentação.
          </P>
        </Section>

        {/* ── 2. Índice de alinhamento ──────────────────────────────── */}
        <Section id="alinhamento" title="2. Índice de alinhamento">
          <P>
            O índice de alinhamento mede com que frequência um parlamentar vota
            na mesma direção que a orientação oficial do seu partido. É um dado{' '}
            <strong>L2</strong>: agregação determinística sobre registros L1
            (votos nominais e orientações de bancada).
          </P>

          <SubSection title="Fórmula">
            <Formula>alinhamento = alinhados / total_comparáveis × 100</Formula>
            <P>
              Onde{' '}
              <code className="rounded bg-surface-raised px-1 font-mono text-sm">
                alinhados
              </code>{' '}
              é o número de votações em que o voto do parlamentar coincide com a
              orientação da bancada, e{' '}
              <code className="rounded bg-surface-raised px-1 font-mono text-sm">
                total_comparáveis
              </code>{' '}
              é o número de votações onde a comparação é válida — excluindo as
              situações abaixo.
            </P>
          </SubSection>

          <SubSection title="O que é excluído do cálculo">
            <ul className="space-y-2 text-sm text-fg-primary">
              <li>
                — <strong>Voto AUSENTE</strong>: o parlamentar não participou da
                votação. Não indica concordância nem discordância com a bancada.
              </li>
              <li>
                — <strong>Orientação LIBERADO</strong>: o partido não emitiu
                orientação unificada. Sem orientação, não há desvio possível.
              </li>
              <li>
                — <strong>Votações sem orientação registrada</strong>: quando a
                API da Câmara não retorna orientação para aquela sessão, a
                votação é ignorada.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Limites de amostra">
            <P>
              A plataforma exibe o índice apenas quando há pelo menos{' '}
              <strong>50 votações comparáveis</strong> na amostra. Abaixo desse
              limiar, o card mostra "amostra insuficiente" — o percentual
              poderia ser calculado, mas seria enganoso: 3 coincidências em 4
              votações equivalem a 75%, mas não dizem nada sobre o comportamento
              real.
            </P>
            <Note>
              <strong>Senado:</strong> a ingestão de orientações de bancada do
              Senado está em desenvolvimento (a API oficial não publica o campo
              de forma estruturada). Atualmente, parlamentares do Senado mostram
              "dados parciais" no índice de alinhamento.
            </Note>
          </SubSection>

          <SubSection title="Federados e blocos partidários">
            <P>
              Quando um partido participa de uma federação, a orientação de voto
              pode vir registrada no nome da federação (ex.: "Fdr PT-PSOL-REDE")
              ou do partido individual. A plataforma tenta cruzar ambos, mas
              votações onde só a orientação do partido-federado está disponível
              (sem equivalente na federação) são excluídas para evitar falso
              alinhamento.
            </P>
          </SubSection>
        </Section>

        {/* ── 3. Índice de coerência ──────────────────────────────── */}
        <Section id="coerencia" title="3. Índice de coerência">
          <P>
            O índice de coerência conta quantos <em>pares contraditórios</em> de
            votações existem no histórico de um parlamentar: situações em que
            ele votou na mesma direção (SIM+SIM ou NÃO+NÃO) em proposições de
            sentidos opostos sobre o mesmo tema. É um dado <strong>L3</strong>:
            envolve escolhas editoriais documentadas.
          </P>

          <SubSection title="Definição de par contraditório">
            <P>Um par contraditório existe quando:</P>
            <ol className="space-y-2 text-sm text-fg-primary">
              <li>
                1. Duas proposições tratam do <strong>mesmo tema</strong>{' '}
                (classificação temática da Câmara).
              </li>
              <li>
                2. As proposições têm{' '}
                <strong>direções semânticas opostas</strong>: uma é restritiva
                (proíbe, revoga, criminaliza…) e a outra é permissiva (autoriza,
                amplia, flexibiliza…).
              </li>
              <li>
                3. O parlamentar <strong>votou na mesma direção</strong> nas
                duas (SIM em ambas, ou NÃO em ambas) — sinalizando posições
                potencialmente inconsistentes sobre o mesmo assunto.
              </li>
            </ol>
          </SubSection>

          <SubSection title="Classificação de direção semântica">
            <P>
              A direção de cada proposição é inferida a partir da ementa usando
              correspondência de palavras-chave com delimitadores de palavra
              (sem NLP). Proposições com ambiguidade (ambas as categorias
              presentes) são descartadas do cálculo.
            </P>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
              <div className="rounded-md border border-line-default p-3">
                <p className="mb-2 font-medium text-fg-primary">Restritiva</p>
                <p className="text-fg-tertiary font-mono text-xs leading-relaxed">
                  revoga · proíbe · veda · criminaliza · restringe · limita ·
                  suspende · extingue
                </p>
              </div>
              <div className="rounded-md border border-line-default p-3">
                <p className="mb-2 font-medium text-fg-primary">Permissiva</p>
                <p className="text-fg-tertiary font-mono text-xs leading-relaxed">
                  autoriza · permite · flexibiliza · amplia · libera · cria ·
                  institui · concede · isenta
                </p>
              </div>
            </div>
          </SubSection>

          <SubSection title="O que o índice não cobre">
            <ul className="space-y-2 text-sm text-fg-primary">
              <li>
                — <strong>Contexto legislativo</strong>: uma proposição pode ser
                restritiva em relação a uma coisa e permissiva em relação a
                outra. A classificação por palavras-chave é uma aproximação —
                não lê a íntegra do texto.
              </li>
              <li>
                — <strong>Evolução de posições</strong>: o cálculo considera
                todo o histórico disponível. Mudança de posição ao longo do
                mandato conta como contradição, mesmo que seja coerência com uma
                mudança de contexto real.
              </li>
              <li>
                — <strong>Votos procedimentais</strong>: proposições sem tema
                associado e votações simbólicas são excluídas (só votações
                nominais com tema registrado entram).
              </li>
            </ul>
            <Note>
              Um número alto de pares não implica necessariamente má-fé — pode
              refletir complexidade do mandato, coalizões ou votações
              procedimentais. O índice é um ponto de partida para investigação,
              não uma sentença.
            </Note>
          </SubSection>

          <SubSection title="Ranking de coerência">
            <P>
              A página{' '}
              <Link className={linkClass} href="/rankings/coerencia">
                Rankings — Coerência
              </Link>{' '}
              lista parlamentares com mais e menos pares contraditórios. O
              ranking considera apenas parlamentares com pelo menos um par
              registrado — parlamentares sem pares (coerentes ou sem votações
              suficientes) aparecem na lista "menos pares".
            </P>
          </SubSection>
        </Section>

        {/* ── 4. Gastos CEAP ──────────────────────────────────────── */}
        <Section id="gastos" title="4. Gastos CEAP">
          <P>
            A Cota para o Exercício da Atividade Parlamentar (CEAP) é o
            orçamento mensal que cada deputado federal recebe para custear
            despesas relacionadas ao exercício do mandato — passagens,
            hospedagem, comunicação, consultoria e outros itens listados no
            regulamento da Câmara.
          </P>

          <SubSection title="O que a plataforma exibe">
            <ul className="space-y-2 text-sm text-fg-primary">
              <li>
                — <strong>Total do ano corrente</strong>: soma de todos os
                registros de gasto CEAP do parlamentar no ano civil em curso.
              </li>
              <li>
                — <strong>Percentil por casa</strong>: posição do parlamentar em
                relação aos colegas da mesma casa (Câmara ou Senado) — percentil
                90 significa que 90% dos colegas gastaram menos.
              </li>
              <li>
                — <strong>Mediana da casa</strong>: valor de referência para
                comparação contextualizada.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Limitações conhecidas">
            <ul className="space-y-2 text-sm text-fg-primary">
              <li>
                — <strong>Só ano corrente</strong>: a ingestão atual cobre
                apenas o ano em curso. Gastos de anos anteriores ainda não estão
                disponíveis na plataforma.
              </li>
              <li>
                — <strong>Câmara-only</strong>: os dados CEAP do Senado Federal
                usam formato de publicação diferente. A cobertura atual é
                exclusiva da Câmara dos Deputados.
              </li>
              <li>
                — <strong>Valor bruto, não auditado</strong>: os registros são
                os declarados pelos parlamentares à Câmara. A plataforma não
                cruza com notas fiscais ou qualquer outra verificação de
                legitimidade do gasto.
              </li>
              <li>
                — <strong>Ausência não é gasto zero</strong>: deputados que não
                enviaram registros ou enviaram com atraso podem aparecer com
                total zero — o dado é ausente, não necessariamente nulo.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Fonte oficial">
            <P>
              Os dados CEAP são publicados pela Câmara dos Deputados em formato
              aberto com atualização mensal. A plataforma ingere esses registros
              via API oficial e os exibe sem modificação de valores.
            </P>
            <Note>
              Gasto CEAP é dado <strong>L1</strong>: registro oficial sem
              transformação interpretativa. O total e o percentil são{' '}
              <strong>L2</strong>: agregações determinísticas com fórmula
              aberta.
            </Note>
          </SubSection>
        </Section>

        {/* Rodapé de auditoria */}
        <div className="border-t border-line-default pt-8 text-fg-tertiary text-sm">
          <p>
            Toda a lógica de cálculo descrita aqui vive no repositório open
            source. Para auditar as implementações:
          </p>
          <ul className="mt-3 space-y-1.5">
            <li>
              —{' '}
              <a
                className={linkClass}
                href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/src/modules/parlamentares/domain/alinhamento.ts"
                rel="noopener noreferrer"
                target="_blank"
              >
                alinhamento.ts
              </a>{' '}
              — cálculo do índice de alinhamento
            </li>
            <li>
              —{' '}
              <a
                className={linkClass}
                href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/src/modules/parlamentares/domain/coerencia.ts"
                rel="noopener noreferrer"
                target="_blank"
              >
                coerencia.ts
              </a>{' '}
              — lógica de pares contraditórios
            </li>
            <li>
              —{' '}
              <a
                className={linkClass}
                href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/src/modules/parlamentares/domain/direcao-classifier.ts"
                rel="noopener noreferrer"
                target="_blank"
              >
                direcao-classifier.ts
              </a>{' '}
              — classificador de direção semântica
            </li>
            <li>
              —{' '}
              <a
                className={linkClass}
                href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/TRUST-PYRAMID.md"
                rel="noopener noreferrer"
                target="_blank"
              >
                TRUST-PYRAMID.md
              </a>{' '}
              — especificação técnica completa da pirâmide de confiança
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
