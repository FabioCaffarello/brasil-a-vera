# ADR-039: Migração de resíduos de cor para o RDS (charts + on-success)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-16
> Status: **accepted** (estende o
> [ADR-034](034-token-bridge-rds-e-promocao-fase-b.md) e revoga parte da seção
> "Resíduos ratificados que NÃO migram" do
> [ADR-038](038-consolidacao-primitivas-no-rds.md); decidido pelo owner em sessão,
> 2026-06-16). É o "novo ADR" que o ADR-038 §Resíduos previa como pré‑condição
> para mexer nestes tokens.

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [O que NÃO migra (ainda)](#o-que-não-migra-ainda)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O [ADR-038](038-consolidacao-primitivas-no-rds.md) aposentou a camada local de
primitivas **genéricas** em favor do RDS, mas isolou três **resíduos de cor**
como "ratificados, não migram sem novo ADR" porque o RDS, à época (v4.2), **não
expunha equivalente**:

- a **paleta categórica de charts** (`--chart-1..5`, Okabe‑Ito) e o `--accent`
  roxo de data‑viz ([ADR-024](024-acentos-secundarios-accent-roxo.md),
  [ADR-034 §5](034-token-bridge-rds-e-promocao-fase-b.md));
- o par on‑color **`text-success-foreground`** (texto sobre `bg-success` sólido);
- as cores cruas de **`PartyBadge`** (22 siglas, decisão D4 da Wave 6).

Para fechar esses gaps **upstream** em vez de carregá‑los como dívida BaV
permanente, abrimos três issues no repo do RDS — mesmo loop consumer↔RDS dos
#221–#225:

- **#229** — paleta categórica Okabe‑Ito (`--color-chart-1..8` + `getChartColor`);
- **#230** — solid status fills + par on‑color (`fg-on-success`);
- **#228** — `DataBadge` server‑safe (`label` + `source` + `tone`).

O RDS entregou os três na **v4.3.0** (consumida no bump #458). Com o equivalente
upstream existindo, a premissa do ADR-038 §Resíduos deixou de valer para charts e
on‑success: **manter a cópia BaV agora é dupla‑camada de _token_**, o mesmo
anti‑padrão que o ADR-038 fechou para componentes. Falta a decisão explícita de
**revogar a ratificação** e adotar os tokens do RDS — o que este ADR faz.

A migração **não é cosmética neutra**: medido empiricamente contra a v4.3.0,

- a paleta do RDS é o Okabe‑Ito **canônico vívido em hex** (`#e69f00` laranja,
  `#56b4e9` azul‑céu, `#009e73` verde…), em **ordem diferente** da BaV (BaV
  `--chart-1` é azul‑céu `oklch(0.6 0.13 240)` ≈ RDS `chart-2`; BaV `--chart-1` ≠
  RDS `chart-1`, que é laranja). Adotar muda **hue e ordem** dos ~5 charts;
- o `fg-on-success` do RDS é **branco sempre**, enquanto o `--success-foreground`
  BaV é **theme‑aware** (branco no claro, quase‑preto `oklch(0.12)` no escuro,
  porque o `bg-success` BaV no dark é um verde **claro** `oklch(0.72)`). Trocar só
  o texto regrediria o contraste no dark; o caminho seguro é adotar o **par
  sólido** do RDS (`success-solid` = emerald‑700 + `fg-on-success` branco), que é
  estável nos dois temas — um pequeno deslocamento do verde.

Por isso a mudança exige ADR (não é item da fase mecânica do ADR-038) e cada PR de
consumo carrega QA visual literal (princípio 13).

## Decisão

1. **Charts adotam a paleta do RDS** (#229, v4.3). Os componentes de data‑viz
   passam a referenciar a escala categórica do RDS (`var(--color-chart-N)` /
   `getChartColor(i)`), e os tokens BaV `--chart-1..5` + o mapeamento
   `@theme inline` correspondente em `globals.css` são **removidos** (a ponte
   `layer(rds)` já fornece `--color-chart-1..8`). Aceita‑se a mudança de hue/ordem
   como **upgrade** para o Okabe‑Ito canônico (8 cores, colorblind‑safe). PR
   dedicado com QA visual dos charts (gastos, patrimônio, mix‑composição,
   apoio‑partido, disciplina), desktop+mobile, claro+escuro.

2. **`success` adota o par sólido do RDS** (#230, v4.3). `bg-success
   text-success-foreground` → par `success-solid` + `text-fg-on-success` (RDS),
   estável nos dois temas. O token BaV `--success-foreground` (e o
   `--color-success-foreground` no `@theme inline`) são **removidos**. PR dedicado
   com QA de contraste claro+escuro nos consumidores (`proposicao/perfil-header`,
   `proposicao/proposicao-card`).

3. **`accent` (DataBadge) fica DEFERIDO ao upstream.** O `tone="accent"` (roxo
   data‑viz, 16 call sites de badge L3) **não tem par** no `DataBadgeTone` do RDS
   v4.3 (`neutral|success|warning|error|info|primary|secondary`). Em vez de
   rebaixá‑lo para `info`/`secondary` (perderia a semântica categórica), abrimos a
   issue upstream **[RDS #232](https://github.com/FabioCaffarello/react-design-system/issues/232)**
   (tom `accent`/data‑viz no DataBadge). Até ela fechar, o `DataBadge` **local
   permanece** como carrier do `accent` — com o número da issue no cabeçalho do
   arquivo (regra do ADR-038 item 2a) — e é consumido no próximo bump, fechando o
   loop como nos #221–#230. Os demais tons (`brand`→`primary`, `default`→`neutral`,
   `destructive`→`error`, `success`, `warning`) já têm par e migram junto quando o
   DataBadge consolidar.

4. **Processo por PR** (princípio 13 + ADR-033/038): cada fatia roda `npm run ci`
   + `npm run build` + `vitest run` + `guard:rds-noop` + `guard:rds-primitive`,
   com QA visual side‑by‑side e output literal no corpo do PR. O **owner mergeia**.

## O que NÃO migra (ainda)

- **`PartyBadge`** (22 cores oficiais de partido) — segue ratificado pela decisão
  D4 da Wave 6 (espelhar identidade oficial, não tokenizar). **Fora do escopo**
  deste ADR; mudaria por decisão de produto, não por gap de DS.
- **`accent` enquanto a [RDS #232](https://github.com/FabioCaffarello/react-design-system/issues/232)
  não fechar** — fica local por gap documentado (item 3), não por ratificação.

Esta seção, somada à adoção de charts/on‑success acima, **substitui** a lista
"Resíduos ratificados que NÃO migram" do
[ADR-038](038-consolidacao-primitivas-no-rds.md): dos três itens lá, dois migram
(charts, on‑success) e um vira gap‑com‑issue (accent); só `PartyBadge` segue
ratificado.

## Alternativas Consideradas

### Alternativa A — Manter os tokens BaV (status quo do ADR-038 §Resíduos)
- Zero trabalho; preserva exatamente o visual atual.
- **Contra:** agora que o RDS v4.3 expõe os equivalentes, manter a cópia é
  **dupla‑camada de token** — o anti‑padrão que o ADR-038 fechou para componentes,
  reaberto na camada de cor. Drift visual futuro entre a paleta BaV e a do RDS.

### Alternativa B — Migrar `accent` rebaixando para `info`/`secondary`
- Consolidaria o `DataBadge` 100% já, sem esperar upstream.
- **Contra:** `accent` é um **par categórico de data‑viz** (roxo), não um estado;
  `info` (azul) colide com semântica informativa e `secondary` (cinza) apaga a
  distinção dos 16 badges L3. Perda de informação visual. Rejeitada em favor do
  loop upstream (#232).

### Alternativa C (escolhida) — Adotar charts+on‑success agora; deferir accent ao upstream
- Fecha os dois gaps com par limpo no RDS já; mantém o terceiro local com issue
  linkada até o RDS expor o tom. Consistente com o loop consumer↔RDS (#221–#230).
- **Contra:** o `DataBadge` segue local mais um ciclo; charts/on‑success implicam
  mudança visual real (mitigada por QA por PR).

## Consequências

### Positivas
- Paleta de data‑viz e par on‑color passam a ter **fonte única** (RDS) — fim da
  dupla‑camada de token; paleta cresce de 5 → 8 cores Okabe‑Ito canônicas.
- Contraste de `success` fica **estável nos dois temas** (par sólido), corrigindo
  a fragilidade do swap só‑texto no dark.
- O loop consumer↔RDS continua sendo o mecanismo para gaps (accent → #232), não a
  cópia local permanente.

### Negativas
- **Mudança visual real**: hue/ordem dos charts e tom do verde de `success`
  deslocam. Exige QA por PR e pode surpreender quem conhece o visual atual.
- O `DataBadge` permanece local mais um ciclo (acoplado à cadência da RDS #232).

### Neutras
- `globals.css` perde os blocos `--chart-1..5` e `--success-foreground` (claro +
  dark + `@theme inline`), encolhendo a superfície de token BaV.
- `src/design-system/tokens/colors.ts` (`chart1..5`, `successForeground`) passa a
  apontar para os tokens do RDS ou é podado conforme o consumo.

## Referências

- [ADR-038 — Fase de consolidação de primitivas no RDS](038-consolidacao-primitivas-no-rds.md)
  (§"Resíduos ratificados que NÃO migram", revogada em parte por este ADR)
- [ADR-034 — Token bridge do RDS e Fase B](034-token-bridge-rds-e-promocao-fase-b.md) (§5)
- [ADR-024 — Acentos secundários / accent roxo](024-acentos-secundarios-accent-roxo.md)
- [ADR-033 — Adoção do RDS como pacote externo](033-adocao-react-design-system-externo.md)
- RDS #228 (DataBadge), #229 (paleta charts), #230 (on‑success), #232 (accent/data‑viz) — repo `FabioCaffarello/react-design-system`
- PR #458 — bump RDS ^4.2.0 → ^4.3.0
- Princípio 13 (CLAUDE.md): validação empírica antes de mergear.
