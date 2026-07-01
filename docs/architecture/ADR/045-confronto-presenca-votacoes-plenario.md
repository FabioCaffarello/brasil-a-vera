# ADR-045: Confronto de presença em votações nominais de plenário

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-07-01
> Status: accepted (feature implementada — `Presenca` component + `getPresencaPlenario` + `/rankings/presenca` em produção; `[A CONFIRMAR]` era gate de Neon-402 de junho, resolvido)

> Confronto do Eixo 1 após fidelidade ([ADR-043](043-fidelidade-partidaria-duas-definicoes.md))
> e relatorias ([ADR-044](044-confronto-relatorias-influencia-e-autoria.md)). Reusa a
> moldura de copy neutra do [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 e o
> padrão fail-closed.

## Contexto

Presença/absenteísmo é uma métrica clássica de accountability: "seu parlamentar
faltou a quantas votações?". O Eixo 1 quer expor isso de forma factual e
determinística — sem IA, sem ranqueamento valorativo.

**Diagnóstico empírico (2026-06-21, princípio 13)** — medição contra o Postgres
local (Neon em 402; reconfirmar contra prod, **[A CONFIRMAR]**):

| Achado | Medição |
| --- | --- |
| Câmara **não registra ausência** em `voto_nominal` | 16 linhas `AUSENTE` em ~10.500; a API só retorna quem votou |
| Senado **registra ausência** | 1.558 `AUSENTE` (+ 6.609 `ABSTENCAO`); ≈ roster completo por votação |
| Coluna `votacao.ausentes` | **NULL** (não populada) |
| Votações nominais de **plenário** | Câmara **23** (≈434 votantes/513), Senado **142** |
| Votações de comissão/simbólicas | 1.315 na Câmara — sem voto nominal por parlamentar |
| **`getMetricasComparacao` (`/comparar`) está incorreto na Câmara** | presença média **100%** em 523 deputados |

**A falha do `/comparar`.** `comparar.ts` calcula presença como
`presente = votos não-AUSENTE` sobre `total = linhas de voto do parlamentar`.
Como a Câmara não grava `AUSENTE`, `total` = votações **comparecidas**, não
elegíveis → o percentual é ~100% para todo deputado (sem sinal). Só funciona no
Senado, que grava ausência.

**O denominador correto.** "Presença" só é apurável em **votações nominais de
plenário**, onde toda a casa é esperada e a ausência de registro do parlamentar
significa ausência de fato. Em votações de comissão, só os membros votam — não
votar não é "faltar". Votações simbólicas não têm registro nominal.

## Decisão

### D1 — Métrica: presença em votações nominais de plenário

- **Universo (denominador):** votações **nominais de plenário** da casa do
  parlamentar (`orgao` de plenário — Câmara `'PLEN'`, Senado plenário), no
  período, **dentro da janela de mandato** do parlamentar.
- **Presente:** o parlamentar tem voto registrado **≠ `AUSENTE`** na votação.
- **Ausente:** votação de plenário elegível sem voto registrado (Câmara) ou com
  `AUSENTE` (Senado).
- **Presença % = presentes / elegíveis.**

Comissões, votações simbólicas e sessões não-deliberativas **ficam fora** — não
têm registro nominal por parlamentar e/ou não têm eligibilidade da casa inteira.

### D2 — Fórmula única, nota de método por casa; fail-closed na janela

- A mesma fórmula vale para as duas casas. A **nota de método** difere e deve ser
  exibida: na **Câmara** a ausência é **inferida** (sem linha numa votação
  nominal de plenário = faltou); no **Senado** a ausência é **registrada**
  (`AUSENTE`).
- **Fail-closed na janela de mandato:** votações de plenário fora do período em
  que o parlamentar estava em exercício **não entram** no denominador — senão um
  parlamentar empossado no meio do período apareceria com absenteísmo fabricado.
  A janela é derivada do próprio registro (primeira/última participação) ou do
  mandato; a regra exata é decisão de implementação, mas a invariante é: **não
  inflar ausência com período de não-mandato**.
- **Amostra:** a cobertura de votações nominais de plenário é pequena (Câmara ~23
  no período medido) e cresce com a ingestão. Abaixo de um limiar, a UI sinaliza
  "amostra estatisticamente frágil" (como o alinhamento partidário já faz).
- Determinístico: contagem sobre `voto_nominal` × `votacao`. Sem IA.

### D3 — Corrige a presença do `/comparar`

A presença exibida em `/comparar` (`getMetricasComparacao`) passa a usar o
denominador correto (votações nominais de plenário elegíveis), substituindo o
cálculo atual (`total` = comparecidas) que produz ~100% na Câmara. Não se mantêm
os dois métodos — o antigo é incorreto, não uma alternativa.

### D4 — Copy neutra (estende ADR-040 §4)

Termo factual: **"presença em votações nominais de plenário"** / "faltou a N de M
votações". **Sem** ranking de "faltões", **sem** cor de juízo, **sem** score
agregado que ordene parlamentares. Contagem factual; o cidadão conclui. A nota de
método (inferida × registrada) é **obrigatória e não dispensável**.

## Alternativas Consideradas

> Decisões fechadas pelo owner; registro para memória.

### Alternativa A — manter o cálculo atual do `/comparar`
- **Descartada (D3):** é incorreto na Câmara (denominador = comparecidas → 100%),
  não uma leitura alternativa.

### Alternativa B — incluir votações de comissão no denominador
- **Descartada (D1):** em comissão só os membros votam; não votar não é faltar.
  Misturaria eligibilidade e inflaria/deflacionaria a presença sem sentido.

### Alternativa C — usar a coluna `votacao.ausentes`
- **Descartada:** está NULL (não populada); e é um total agregado, não permite
  atribuir a ausência a um parlamentar.

## Consequências

### Positivas
- Métrica de accountability factual, determinística, sem fonte nova nem IA, nas
  duas casas — e **corrige** uma feature hoje enganosa (`/comparar`).
- Denominador honesto (plenário nominal) evita o falso 100%.

### Negativas
- **Amostra pequena** (Câmara ~23 votações de plenário no período) → percentual
  estatisticamente frágil até a ingestão acumular; mitigado por sinalização (D2),
  não por dado.
- **Assimetria de método** Câmara (inferida) × Senado (registrada) — exposta na
  nota, não escondida.
- **Janela de mandato aproximada** — sem roster por votação, a eligibilidade é
  aproximada pela janela de participação; suplências/posses no meio do período
  podem distorcer. Documentado; refinável.
- A ausência na Câmara conflui faltas com obstruções não-registradas — mas em
  votação nominal de plenário o não-registro é o melhor sinal disponível.

### Neutras
- Não há tabela nova: a métrica deriva de `voto_nominal` + `votacao` (com filtro
  de `orgao` de plenário). Trust herdado da votação (raiz), princípio 3.

## Classificação na Pirâmide de Confiança

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Voto/ausência individual (`voto_nominal`) | **L1** | Bruto da fonte. |
| Presença % (presentes / elegíveis de plenário) | **L2** | Agregação determinística com fórmula pública. |

Nenhum dado é L3/L4: sem correlação interpretativa, sem inferência além da
ausência-por-não-registro (que é a semântica explícita da votação nominal de
plenário).

## Não-objetivos (fora de escopo)

- **Comissões, votações simbólicas, sessões não-deliberativas** no denominador.
- **Presença física** em sessão/eventos/discursos (sem dado nominal — a API de
  eventos da Câmara não é ingerida; ADR de inventário).
- **Ranking ou score** de "faltosos"; vocabulário valorativo (ADR-040 §4).
- **Roster oficial por votação** (não disponível) — a eligibilidade é aproximada
  pela janela de mandato.
- **Afirmações públicas de número** antes de reconfirmar contra prod (DB local ≠
  prod; Neon em 402; **[A CONFIRMAR]**).

## Referências

- [ADR-043](043-fidelidade-partidaria-duas-definicoes.md), [ADR-044](044-confronto-relatorias-influencia-e-autoria.md) — confrontos anteriores do Eixo 1.
- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — níveis L1–L4.
- Diagnóstico empírico (2026-06-21, DB local): Câmara 16 `AUSENTE`/~10.500;
  Senado 1.558; 23 votações nominais de plenário Câmara; `/comparar` 100% médio.
- Código: `src/lib/queries/comparar.ts` (`getMetricasComparacao`, presença a
  corrigir).
