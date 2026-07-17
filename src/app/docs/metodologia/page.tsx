import { Text } from '@fabio.caffarello/react-design-system/server'
import type { Metadata } from 'next'
import Link from 'next/link'

import {
  DocsHeader,
  docsLinkClass,
  ExternalLink,
} from '../_components/typography'

export const metadata: Metadata = {
  title: 'Metodologia — Brasil à Vera',
  description:
    'Como cada número da plataforma é calculado, classificado e auditado: pirâmide de confiança, alinhamento, fidelidade, coerência, afinidade, presença, gastos, patrimônio, colégio eleitoral e emendas.',
}

// SEM `revalidate` — deliberado. Todas as páginas de /docs renderizam por
// request (o auth() do Navbar no root layout torna o app dynamic) e por isso
// nunca ficam stale; o revalidate=86400 herdado da /sobre/metodologia optava
// ESTA página no cache incremental ISR, e em 2026-07-16 prod seguiu servindo
// a versão do dia anterior por até 24h pós-deploy — o smoke docs-anchors
// reprovou o deploy ao não achar a âncora nova. Conteúdo literal, sem DB:
// render por request é barato e sempre fresco.

// Página de metodologia consolidada (Sprint 14.3; sucede /sobre/metodologia,
// que redireciona para cá). Responde: "Como esse número foi calculado e em
// quê posso confiar?" — é o escudo de neutralidade exigido ANTES de publicar
// confrontos compostos (planejamento Wave 14 §4).
//
// SSG pura (sem DB). Parâmetros numéricos são hardcoded COM comentário
// apontando a constante-fonte — importar as constantes puxaria módulos com
// `db` (src/lib/queries/*) ou código de ingestão (fora do build Next) para
// uma página estática.
//
// Conteúdo derivado de:
//   docs/architecture/TRUST-PYRAMID.md
//   src/modules/parlamentares/domain/{alinhamento,fidelidade,coerencia}.ts
//   src/lib/queries/parlamentares.ts (TOP5_QUORUM_MINIMO/TOP5_JANELA_MESES)
//   src/modules/votacoes/domain/presenca.ts (PRESENCA_AMOSTRA_MINIMA)
//   ADRs 036/043/045/047/051/063/065/066 e rodapés das seções do perfil.

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

function GithubFile({
  path,
  children,
}: {
  path: string
  children: React.ReactNode
}) {
  return (
    <ExternalLink
      href={`https://github.com/FabioCaffarello/brasil-a-vera/blob/main/${path}`}
    >
      {children}
    </ExternalLink>
  )
}

const SECTIONS = [
  { id: 'piramide', label: 'Pirâmide de confiança' },
  { id: 'alinhamento', label: 'Índice de alinhamento' },
  { id: 'fidelidade', label: 'Fidelidade partidária — duas definições' },
  { id: 'coerencia', label: 'Índice de coerência' },
  { id: 'afinidade', label: 'Afinidade de voto (Top 5)' },
  { id: 'presenca', label: 'Presença em plenário' },
  { id: 'gastos', label: 'Gastos CEAP' },
  { id: 'gabinete', label: 'Gabinete (comissionados)' },
  { id: 'patrimonio', label: 'Patrimônio declarado' },
  { id: 'colegio', label: 'Colégio eleitoral' },
  { id: 'emendas', label: 'Emendas parlamentares' },
  {
    id: 'confronto-emendas-colegio',
    label: 'Confronto: emendas × colégio eleitoral',
  },
  { id: 'auditar', label: 'Como auditar' },
]

export default function MetodologiaPage() {
  return (
    <div>
      <DocsHeader
        subtitle="Como cada número da plataforma é calculado, classificado e auditado."
        title="Metodologia"
      />

      {/* Índice rápido */}
      <nav
        aria-label="Seções desta página"
        className="mb-12 rounded-lg border border-line-default bg-surface-raised p-5"
      >
        <p className="mb-3 font-medium text-fg-tertiary text-xs uppercase tracking-wide">
          Nesta página
        </p>
        <ol className="columns-1 gap-8 space-y-1.5 text-sm sm:columns-2">
          {SECTIONS.map((s, i) => (
            <li key={s.id}>
              <a className={docsLinkClass} href={`#${s.id}`}>
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
                desc: 'Registro bruto vindo das fontes oficiais (Câmara, Senado, TSE, Portal da Transparência), sem transformação interpretativa. Cada item carrega link para a fonte original.',
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
                desc: 'Fórmula aberta, mas com escolhas de threshold, janela temporal, agrupamento ou heurística de vínculo que envolvem julgamento documentado. Em caso de ambiguidade, o dado é omitido (fail-closed) — nunca inventado.',
                example:
                  '"Top 5 com afinidade de voto" — janela de 12 meses, mínimo de 20 votações comparáveis.',
              },
              {
                badge: 'L4',
                label: 'Estimativa modelada',
                desc: 'Reservado para análises futuras baseadas em modelo ou heurística estatística. Nenhum dado L4 está em produção hoje.',
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
            <Link className={docsLinkClass} href="/docs/piramide-de-confianca">
              Pirâmide de Confiança
            </Link>
            . O princípio editorial que governa tudo: a plataforma exibe{' '}
            <strong>fatos isolados com critério explícito</strong> — nunca soma
            confrontos num índice ou nota de parlamentar.
          </P>
        </Section>

        {/* ── 2. Índice de alinhamento ──────────────────────────────── */}
        <Section id="alinhamento" title="2. Índice de alinhamento">
          <P>
            Mede com que frequência um parlamentar vota na mesma direção que a
            orientação oficial do seu partido. É um dado <strong>L2</strong>:
            agregação determinística sobre registros L1 (votos nominais e
            orientações de bancada).
          </P>

          <SubSection title="Fórmula">
            <Formula>alinhamento = alinhados / total_comparáveis × 100</Formula>
            <P>
              Uma votação é <em>comparável</em> quando o parlamentar votou e a
              bancada orientou. Ficam fora: voto <strong>AUSENTE</strong>{' '}
              (ausência não é concordância nem discordância), orientação{' '}
              <strong>LIBERADO</strong> (sem orientação, não há desvio possível)
              e votações sem orientação registrada na fonte.
            </P>
          </SubSection>

          <SubSection title="Limites de amostra">
            <P>
              O índice só aparece com pelo menos{' '}
              {/* ALINHAMENTO_AMOSTRA_MINIMA em src/modules/parlamentares/domain/alinhamento.ts */}
              <strong>50 votações comparáveis</strong>. Abaixo disso o card
              mostra "amostra insuficiente" — 3 coincidências em 4 votações
              equivalem a 75%, mas não dizem nada sobre o comportamento real.
            </P>
            <P>
              Quando um partido participa de federação, a orientação pode vir no
              nome da federação ou do partido individual; votações onde só uma
              das formas existe são excluídas para evitar falso alinhamento.
            </P>
          </SubSection>
        </Section>

        {/* ── 3. Fidelidade partidária ──────────────────────────────── */}
        <Section
          id="fidelidade"
          title="3. Fidelidade partidária — duas definições"
        >
          <P>
            "Votar com o partido" tem dois significados diferentes, e a
            plataforma <strong>nunca os funde num número só</strong>: cada um
            aparece com sua fonte nomeada.
          </P>

          <SubSection title="Definição 1 — divergiu da orientação da liderança (L1→L2)">
            <P>
              Compara o voto nominal com a{' '}
              <strong>orientação formalizada pela liderança</strong> do partido
              vigente na data do voto (registro oficial de orientação de
              bancada). É o desvio da posição declarada.
            </P>
          </SubSection>

          <SubSection title="Definição 2 — votou diferente da maioria da bancada (L2)">
            <P>
              Compara o voto nominal com a{' '}
              <strong>maioria efetiva dos votos da bancada</strong> do partido
              na mesma votação, derivada dos próprios votos nominais. É o desvio
              do comportamento real dos colegas — que pode divergir da
              orientação declarada.
            </P>
          </SubSection>

          <SubSection title="Partido vigente na data">
            <P>
              Parlamentares mudam de partido. As duas definições usam o partido{' '}
              <em>vigente na data de cada votação</em>, reconstruído a partir do
              histórico de filiações — não o partido atual. A timeline de
              migração partidária aparece no perfil como fato, sem rótulo de
              "infidelidade".
            </P>
          </SubSection>
        </Section>

        {/* ── 4. Índice de coerência ──────────────────────────────── */}
        <Section id="coerencia" title="4. Índice de coerência">
          <P>
            Conta quantos <em>pares contraditórios</em> de votações existem no
            histórico de um parlamentar: situações em que ele votou na mesma
            direção (SIM+SIM ou NÃO+NÃO) em proposições de sentidos opostos
            sobre o mesmo tema. É um dado <strong>L3</strong>: envolve escolhas
            editoriais documentadas.
          </P>

          <SubSection title="Definição de par contraditório">
            <ol className="space-y-2 text-fg-primary text-sm">
              <li>
                1. Duas proposições tratam do <strong>mesmo tema</strong>{' '}
                (classificação temática oficial).
              </li>
              <li>
                2. As proposições têm{' '}
                <strong>direções semânticas opostas</strong>: uma restritiva
                (proíbe, revoga, criminaliza…), outra permissiva (autoriza,
                amplia, flexibiliza…). A direção é inferida da ementa por
                correspondência de verbos inequívocos — sem NLP; ambiguidade
                descarta a proposição do cálculo.
              </li>
              <li>
                3. O parlamentar <strong>votou na mesma direção</strong> nas
                duas.
              </li>
            </ol>
            <P>
              O princípio de calibração é{' '}
              <strong>falso negativo &gt; falso positivo</strong>: preferimos
              deixar de detectar um par real a apontar um par falso.
            </P>
          </SubSection>

          <SubSection title="O que o índice não cobre">
            <Note>
              Contexto importa — substitutivos, mudança de partido, relatoria e
              mudança real de contexto podem explicar a diferença. Um número
              alto de pares é um ponto de partida para investigação, não uma
              sentença. Metodologia completa em{' '}
              <GithubFile path="docs/future/COHERENCE-ENGINE.md">
                COHERENCE-ENGINE.md
              </GithubFile>
              .
            </Note>
          </SubSection>
        </Section>

        {/* ── 5. Afinidade de voto ──────────────────────────────── */}
        <Section id="afinidade" title="5. Afinidade de voto (Top 5)">
          <P>
            Lista os 5 parlamentares que mais votaram igual ao dono do perfil. É
            um dado <strong>L3</strong>: a fórmula é aberta, mas o quórum e a
            janela são parâmetros editoriais.
          </P>
          <SubSection title="Fórmula e parâmetros">
            <Formula>
              afinidade = votos_coincidentes / votações_em_comum × 100
            </Formula>
            <P>
              Conta apenas votações em que <em>ambos</em> votaram
              (SIM/NÃO/Abstenção — AUSENTE de qualquer lado exclui a votação).
              Parâmetros:{' '}
              {/* TOP5_QUORUM_MINIMO / TOP5_JANELA_MESES em src/lib/queries/parlamentares.ts */}
              mínimo de <strong>20 votações em comum</strong> na janela dos{' '}
              <strong>últimos 12 meses</strong>; ordenação por percentual, com a
              base maior como desempate.
            </P>
            <P>
              O quórum foi recalibrado de 5 para 20 votações após medição
              empírica: com quórum 5, 18,4% dos pares atingiam 100% de afinidade
              por coincidência estatística de amostras minúsculas.
            </P>
          </SubSection>
        </Section>

        {/* ── 6. Presença em plenário ──────────────────────────────── */}
        <Section id="presenca" title="6. Presença em plenário">
          <P>
            Percentual de votações nominais de plenário em que o parlamentar
            registrou voto, dentro do período de mandato. É um dado{' '}
            <strong>L2</strong>.
          </P>
          <SubSection title="Recorte">
            <P>
              Considera <em>somente</em> votações nominais de plenário — não
              inclui comissões nem votações simbólicas (que não têm registro
              individual). Exibido apenas com{' '}
              {/* PRESENCA_AMOSTRA_MINIMA em src/modules/votacoes/domain/presenca.ts */}
              <strong>10 ou mais votações</strong> no período. Ausência em
              votação não distingue falta de ausência justificada — é o registro
              bruto da fonte.
            </P>
          </SubSection>
        </Section>

        {/* ── 7. Gastos CEAP ──────────────────────────────────────── */}
        <Section id="gastos" title="7. Gastos CEAP">
          <P>
            A Cota para o Exercício da Atividade Parlamentar (CEAP) é o
            orçamento mensal que cada deputado federal recebe para custear
            despesas do mandato. Os registros individuais são{' '}
            <strong>L1</strong>; total do ano, percentil e mediana da casa são{' '}
            <strong>L2</strong>.
          </P>

          <SubSection title="O que a plataforma exibe">
            <ul className="space-y-2 text-fg-primary text-sm">
              <li>
                — <strong>Total do ano corrente</strong>: soma dos registros do
                ano civil em curso.
              </li>
              <li>
                — <strong>Percentil por casa</strong>: percentil 90 significa
                que 90% dos colegas da mesma casa gastaram menos.
              </li>
              <li>
                — <strong>Mediana da casa</strong>: referência de comparação.
              </li>
            </ul>
          </SubSection>

          <SubSection title="Limitações conhecidas">
            <ul className="space-y-2 text-fg-primary text-sm">
              <li>
                — <strong>Só ano corrente</strong> e{' '}
                <strong>Câmara-only</strong> (o Senado publica gastos em formato
                distinto, ainda não coberto).
              </li>
              <li>
                — <strong>Valor declarado, não auditado</strong>: a plataforma
                não cruza com notas fiscais nem verifica legitimidade.
              </li>
              <li>
                — <strong>Ausência não é gasto zero</strong>: registros
                atrasados podem aparecer como total zero — dado ausente, não
                nulo.
              </li>
            </ul>
          </SubSection>
        </Section>

        {/* ── 8. Gabinete (comissionados) ──────────────────────────── */}
        <Section id="gabinete" title="8. Gabinete (comissionados)">
          <P>
            Servidores comissionados lotados no gabinete de cada parlamentar,
            segundo o quadro de pessoal publicado pela própria casa. Junto com
            os gastos CEAP e as emendas, compõe o retrato do{' '}
            <em>custo do mandato</em>. Nomes, cargos e remunerações de
            comissionados são públicos por força da LAI. Dados{' '}
            <strong>L1</strong>; o custo mensal somado é <strong>L2</strong>.
          </P>

          <SubSection title="Fonte e vínculo por casa">
            <ul className="space-y-2 text-fg-primary text-sm">
              <li>
                — <strong>Câmara</strong>: arquivo aberto de funcionários; o
                vínculo com o deputado é <strong>determinístico</strong> (a
                própria fonte referencia o gabinete pelo identificador oficial
                do deputado). Entram secretários parlamentares e cargos de
                natureza especial lotados em gabinete; servidores efetivos e
                pessoal de liderança ficam fora.
              </li>
              <li>
                — <strong>Senado</strong>: API administrativa aberta; o vínculo
                é pelo <strong>nome do senador</strong> na lotação ("Gabinete do
                Senador X", "Escritório de Apoio N do Senador X") — match por
                nome normalizado, fail-closed em ambiguidade. Somente
                comissionados ativos (desligados ficam fora do snapshot).
              </li>
            </ul>
          </SubSection>

          <SubSection title="Remuneração — recorte honesto por casa">
            <ul className="space-y-2 text-fg-primary text-sm">
              <li>
                — <strong>Senado</strong>: remuneração básica da folha oficial
                (competência mais recente publicada), somando as folhas do mês.
                Não inclui vantagens, indenizações ou descontos. O casamento
                comissionado↔folha é por nome normalizado (os identificadores
                internos dos dois conjuntos não são compatíveis); homônimos na
                folha ficam <em>sem</em> valor atribuído — nunca chutamos.
              </li>
              <li>
                — <strong>Câmara</strong>: a casa publica nome, grupo e nível do
                cargo, mas{' '}
                <strong>não a remuneração por nível em formato aberto</strong> —
                por isso a seção mostra o quadro sem valores. Quando houver
                fonte estável, o custo entra como cálculo L2.
              </li>
            </ul>
            <Note>
              A nomeação de comissionados é prerrogativa do mandato prevista em
              resolução das casas — o número de servidores e os cargos são fatos
              administrativos, não indicativos de irregularidade.
            </Note>
          </SubSection>
        </Section>

        {/* ── 9. Patrimônio declarado ──────────────────────────────── */}
        <Section id="patrimonio" title="9. Patrimônio declarado">
          <P>
            Bens declarados à Justiça Eleitoral nas candidaturas (TSE, pleitos
            de 2014, 2018 e 2022). Cada bem é <strong>L1</strong>; total,
            composição e evolução são <strong>L2</strong>. O vínculo
            candidatura→parlamentar é feito por CPF (Câmara: 100%; Senado: 88,9%
            — senadores sem CPF público ficam sem a seção, nunca com dado
            inventado).
          </P>

          <SubSection title="Evolução corrigida pela inflação">
            <P>
              Na trajetória entre pleitos, os valores nominais são corrigidos
              pelo <strong>IPCA (IBGE) para preços de dezembro de 2022</strong>{' '}
              — sem isso, todo patrimônio "cresceria" por efeito da inflação. Os
              pontos são discretos por candidatura: o patrimônio entre pleitos é
              desconhecido — não assumimos zero nem interpolamos.
            </P>
          </SubSection>

          <SubSection title="Variação vs pares">
            <P>
              O confronto "variou mais que X% dos parlamentares da casa" compara
              apenas parlamentares <em>com o mesmo par de pleitos</em> —
              percentil sobre a mesma régua temporal.
            </P>
            <Note>
              É a declaração de bens à Justiça Eleitoral — não é renda nem
              movimentação bancária. Declaração é do candidato; o TSE não audita
              valores.
            </Note>
          </SubSection>
        </Section>

        {/* ── 9. Colégio eleitoral ──────────────────────────────── */}
        <Section id="colegio" title="10. Colégio eleitoral">
          <P>
            De quais municípios vieram os votos do parlamentar em cada pleito,
            segundo a votação nominal oficial do TSE (candidato × município ×
            zona; as zonas do mesmo município são somadas). Votos por município
            são <strong>L1</strong>; o percentual de concentração é{' '}
            <strong>L2</strong>.
          </P>
          <SubSection title="Recorte e denominador">
            <P>
              A plataforma armazena os{' '}
              {/* TOP_MUNICIPIOS_PERSISTIDOS em ingestion/tse/votacao-municipal-mapper.ts */}
              <strong>20 maiores municípios</strong> de cada pleito e exibe os 5
              maiores. O percentual usa como denominador o{' '}
              <strong>total oficial de votos do candidato no pleito</strong>{' '}
              (soma integral, computada antes do corte) — nunca a soma parcial.
            </P>
            <Note>
              Deputados federais e senadores são eleitos por circunscrição{' '}
              <em>estadual</em> — a distribuição municipal é informativa, não um
              vínculo formal de representação.
            </Note>
          </SubSection>
        </Section>

        {/* ── 10. Emendas parlamentares ──────────────────────────────── */}
        <Section id="emendas" title="11. Emendas parlamentares">
          <P>
            Emendas individuais ao orçamento federal, conforme o Portal da
            Transparência (CGU). Valores por emenda e destino são{' '}
            <strong>L1</strong>; totais por ano e top municípios são{' '}
            <strong>L2</strong>; o vínculo autor→parlamentar é{' '}
            <strong>L3</strong>.
          </P>

          <SubSection title="Vínculo por nome (L3, fail-closed)">
            <P>
              A fonte identifica o autor por nome, não por CPF. O vínculo é o
              match exato do nome normalizado (sem acentos, caixa alta) contra o
              nome parlamentar <em>e</em> o nome civil. Dois parlamentares
              distintos com o mesmo nome normalizado → ambíguo →{' '}
              <strong>nunca vincula</strong>. Ex-parlamentares fora da base
              ficam de fora.
            </P>
          </SubSection>

          <SubSection title="Recortes">
            <ul className="space-y-2 text-fg-primary text-sm">
              <li>
                — Apenas emendas <strong>individuais</strong> (bancada, comissão
                e relator não têm autor individual) e a partir de{' '}
                <strong>2015</strong> (2014 não tem autor informado na fonte).
              </li>
              <li>
                — Parte relevante do valor não tem município específico (destino
                múltiplo, estadual ou nacional) — exibido como bucket próprio,
                nunca omitido.
              </li>
              <li>
                — Valores pagos podem crescer após o ano da emenda (restos a
                pagar); a base é reprocessada mensalmente por inteiro.
              </li>
            </ul>
            <Note>
              A indicação de emendas individuais é prerrogativa constitucional
              com execução obrigatória — os valores e destinos são fatos
              orçamentários, não indicativos de irregularidade.
            </Note>
          </SubSection>
        </Section>

        {/* ── 11. Confronto emendas × colégio ─────────────────────── */}
        <Section
          id="confronto-emendas-colegio"
          title="12. Confronto: emendas × colégio eleitoral"
        >
          <P>
            Cruza duas seções do perfil para responder:{' '}
            <em>
              que fração do dinheiro indicado via emendas foi para os municípios
              que elegeram o parlamentar?
            </em>{' '}
            É um cálculo <strong>L2</strong> sobre os vínculos descritos nas
            seções 9 e 10.
          </P>

          <SubSection title="Fórmula">
            <Formula>
              confronto = empenhado_em_municípios_do_colégio /
              empenhado_com_município_identificado × 100
            </Formula>
            <ul className="space-y-2 text-fg-primary text-sm">
              <li>
                — <strong>Numerador</strong>: valor empenhado de emendas
                destinado a municípios que casam com os{' '}
                <strong>20 maiores municípios do colégio eleitoral</strong> do
                pleito mais recente do parlamentar.
              </li>
              <li>
                — <strong>Denominador</strong>: valor empenhado com município de
                destino identificado (o bucket "sem município específico" fica
                fora do cálculo e é reportado à parte).
              </li>
              <li>
                — <strong>Ponte entre fontes</strong>: o TSE identifica
                municípios por código próprio e a CGU pelo código IBGE — o
                casamento é feito por <em>nome normalizado + UF</em>,
                determinístico e fail-closed (município que não casa conta no
                denominador, nunca no numerador).
              </li>
            </ul>
          </SubSection>

          <SubSection title="Como ler o número">
            <Note>
              A legislação permite — e politicamente se espera — que emendas
              individuais atendam a base eleitoral do autor. O confronto é{' '}
              <strong>contexto factual, não acusação</strong>: um percentual
              alto significa aderência à base; um percentual baixo significa
              destinação pulverizada. Nenhum dos dois é, por si, irregular. O
              recorte usa os 20 maiores municípios do colégio (não o colégio
              completo) — o número real de aderência pode ser maior, nunca menor
              que o exibido.
            </Note>
          </SubSection>
        </Section>

        {/* ── 12. Como auditar ──────────────────────────────────────── */}
        <Section id="auditar" title="13. Como auditar">
          <P>
            Todo o código é aberto e auditável, e toda decisão de cálculo passa
            por validação empírica registrada em pull request com output literal
            (princípio interno de que hipótese sobre comportamento real não
            basta — mede-se antes de publicar). Implementações citadas nesta
            página:
          </P>
          <ul className="space-y-1.5 text-fg-tertiary text-sm">
            <li>
              —{' '}
              <GithubFile path="src/modules/parlamentares/domain/alinhamento.ts">
                alinhamento.ts
              </GithubFile>{' '}
              — índice de alinhamento (amostra mínima de 50)
            </li>
            <li>
              —{' '}
              <GithubFile path="src/modules/parlamentares/domain/fidelidade.ts">
                fidelidade.ts
              </GithubFile>{' '}
              — as duas definições de fidelidade (ADR-043)
            </li>
            <li>
              —{' '}
              <GithubFile path="src/lib/coerencia/direcao-classifier.ts">
                direcao-classifier.ts
              </GithubFile>{' '}
              e{' '}
              <GithubFile path="src/lib/queries/coerencia.ts">
                coerencia.ts
              </GithubFile>{' '}
              — pares contraditórios ·{' '}
              <GithubFile path="docs/future/COHERENCE-ENGINE.md">
                COHERENCE-ENGINE.md
              </GithubFile>
            </li>
            <li>
              —{' '}
              <GithubFile path="src/lib/queries/parlamentares.ts">
                parlamentares.ts
              </GithubFile>{' '}
              — afinidade Top 5 (quórum 20, janela 12 meses)
            </li>
            <li>
              —{' '}
              <GithubFile path="src/modules/votacoes/domain/presenca.ts">
                presenca.ts
              </GithubFile>{' '}
              — presença em plenário (amostra mínima de 10)
            </li>
            <li>
              —{' '}
              <GithubFile path="ingestion/tse/votacao-municipal-mapper.ts">
                votacao-municipal-mapper.ts
              </GithubFile>{' '}
              — colégio eleitoral (top-20, soma de zonas; ADR-065)
            </li>
            <li>
              —{' '}
              <GithubFile path="ingestion/cgu/emendas-mapper.ts">
                emendas-mapper.ts
              </GithubFile>{' '}
              — vínculo de emendas por nome (ADR-066)
            </li>
            <li>
              —{' '}
              <GithubFile path="docs/architecture/TRUST-PYRAMID.md">
                TRUST-PYRAMID.md
              </GithubFile>{' '}
              — especificação completa da pirâmide de confiança
            </li>
          </ul>
          <P>
            As fontes oficiais e cadências de atualização estão em{' '}
            <Link className={docsLinkClass} href="/docs/fontes">
              Fontes e cadência
            </Link>
            .
          </P>
        </Section>
      </div>
    </div>
  )
}
