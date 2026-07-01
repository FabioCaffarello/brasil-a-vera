# ADR-043: Fidelidade partidária — duas definições de "o partido" e reconstrução temporal

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-07-01
> Status: accepted (feature implementada — `FidelidadePartidaria` component + queries `fidelidadeTimeline/Bancada/Orientacao` em produção; `[A CONFIRMAR]` era gate de Neon-402 de junho, resolvido)

> Estende a **invariante de copy neutra** do [ADR-040](040-alinhamento-orientacao-de-bloco.md)
> (§Decisão item 4) para o confronto de fidelidade partidária do Eixo 1.
> Reusa o padrão **fail-closed** do [ADR-041](041-sinalizacao-alinhamento-federacao.md)
> (posição indefinida → exclui da métrica, não fabrica). Não altera a modelagem
> de votação do [ADR-042](042-modelagem-votacao-senado.md).

## Contexto

O Eixo 1 (coerência) quer habilitar o confronto **"votou contra o partido que o
elegeu"** — fidelidade partidária ao longo do mandato. Antes de modelar a
feature, mediu-se empiricamente se o dado em banco sustenta o confronto ou se só
há filiação atual (caso trivial).

**Diagnóstico empírico** (leitura direta contra o **DB local de desenvolvimento**;
o Neon de produção está em cota esgotada / HTTP 402 até 2026-07-01, então os
números abaixo precisam de reconfirmação contra prod — **[A CONFIRMAR]**):

| Medição | Resultado |
| --- | --- |
| `filiacao_partidaria` — total / encerradas (`data_fim`) | 1.551 / 825 |
| Cobertura de parlamentares com filiação | 726 / 726 (100%, zero sem filiação) |
| Parlamentares que **trocaram de partido** (≥2 filiações) | **405 / 726 (55,8%)** |
| Janela de `data_inicio` | **1980-09-24 → 2026-05-28** |
| Filiações iniciadas antes da eleição de 2022 | 821 (< 2022-01-01) |
| Janela de `voto_nominal` (via votação) | 2025-06-25 → 2026-06-16 (pleno) |
| Janela de `orientacao_bancada` | **2026-05-19 → 2026-06-16 (207 linhas)** |

Veredito do diagnóstico: **HABILITADO**. O histórico de filiação cobre o período
pré-eleição e sobrepõe-se integralmente à janela de votos, então é possível
reconstruir, para cada voto, qual partido o parlamentar integrava naquela data.

Desse diagnóstico emerge a **assimetria que motiva este ADR**: o dado bruto de
"posição do partido" existe em **duas formas com cobertura muito diferente**:

- a **orientação declarada pela liderança** (`orientacao_bancada`) — fonte
  oficial, mas hoje uma fatia fina (≈1 mês);
- a **maioria efetiva da bancada**, computável de `voto_nominal` — cobre o ano
  inteiro, mas é um cálculo, não uma declaração.

São coisas diferentes (uma é o que a liderança *disse*; a outra é o que a bancada
*fez*) e podem **divergir entre si**. Tratá-las como sinônimos achataria a
diferença e produziria uma métrica que não corresponde a nenhuma das duas
realidades. Este ADR registra as invariantes que impedem esse achatamento, antes
de qualquer schema, query ou UI.

## Decisão

### D1 — "O partido" são DUAS definições, exibidas separadas, nunca fundidas

No confronto de fidelidade, "o partido" tem **duas** definições distintas, com
classificação de confiança própria, **sempre apresentadas separadas**:

- **Orientação declarada da liderança** — `orientacao_bancada`, dado bruto da
  fonte oficial → **L1**.
- **Maioria derivada da bancada** — computada de `voto_nominal` → **L2**.

É **proibido fundir L1 e L2 numa métrica única** (ex.: um único "índice de
fidelidade" que misture as duas). Cada uma é uma leitura independente.

**Critério de quórum/maioria do L2 (definido aqui; implementação fora de escopo).**
A "posição da maioria da bancada" numa votação é definida por fórmula pública,
determinística e fixa:

- **Universo:** membros da bancada do partido **na data daquela votação** (ver D3).
- **Votos válidos:** apenas `SIM` e `NÃO`. `ABSTENCAO`, `OBSTRUCAO` e `AUSENTE`
  ficam **fora do denominador**.
- **Quórum mínimo:** pelo menos **metade** dos membros da bancada (na data)
  registrou voto válido. Abaixo disso, a posição é **indefinida**.
- **Maioria:** a opção (`SIM` ou `NÃO`) com **estritamente mais de 50%** dos
  votos válidos da bancada.
- **Indefinição → fail-closed:** se o quórum não é atingido **ou** há empate, a
  posição da bancada naquela votação é **indefinida** e o parlamentar é
  **excluído** do confronto L2 *naquela* votação. Não se fabrica posição (mesmo
  princípio do ADR-041 para federação ausente).

O limiar de quórum (metade) é uma **constante pública fixada neste ADR**, não um
parâmetro ajustável — é o que mantém o cálculo reproduzível e, portanto, L2 (e
não L3). Mudá-lo exige novo ADR e recálculo do histórico.

### D2 — Cópia distingue os dois tipos; cada termo nomeia sua fonte

Estendendo a invariante de copy neutra do ADR-040 (§Decisão item 4), cada termo
**nomeia explicitamente sua fonte**:

- **"divergiu da orientação da liderança"** — para o confronto contra L1
  (`orientacao_bancada`).
- **"votou diferente da maioria da bancada"** — para o confronto contra L2
  (maioria computada de `voto_nominal`).

É **proibido** um termo único genérico (ex.: "votou contra o partido", "infidelidade")
que achate L1 e L2 numa só rotulação. Permanecem válidas as proibições do
ADR-040: nada de "fidelidade", "rebeldia", "traição" ou sinônimos valorativos;
sem score agregado de ranqueamento; sem cor que sugira juízo; comparação
determinística por igualdade de strings.

### D3 — Fidelidade medida contra o partido vigente NA DATA DE CADA VOTO

- A fidelidade é apurada contra o partido ao qual o parlamentar estava filiado
  **na data de cada votação**, reconstruído temporalmente a partir de
  `data_inicio`/`data_fim` de `filiacao_partidaria` — **não** contra um partido
  de 2022 fixo.
- A migração partidária é exibida como **timeline factual**, sem rótulo de
  deslealdade ou juízo.

**Razão.** Confrontar um voto de 2026 contra a filiação de 2022 fabricaria
divergência a partir de dado faltante: a troca de partido dentro da janela
permitida (fora da janela de fidelidade da legislação eleitoral) é um ato
**legítimo**. Ancorar em 2022 transformaria uma mudança lícita em falsa
"traição". A reconstrução as-of (qual partido na data do voto) é a única leitura
factual.

## Alternativas Consideradas

> As decisões D1–D3 foram fechadas pelo owner. Esta seção registra os caminhos
> **descartados** para memória — não são reabríveis sem novo ADR.

### Alternativa A — métrica única de "fidelidade" fundindo L1 e L2
- Um só índice combinando orientação declarada e maioria da bancada.
- **Descartada (D1):** achata duas realidades distintas (o que a liderança disse
  × o que a bancada fez), que podem divergir; o número resultante não
  corresponderia a nenhuma fonte verificável e violaria a separação de níveis da
  Pirâmide de Confiança.

### Alternativa B — ancorar fidelidade no partido da eleição de 2022 (fixo)
- Comparar todo voto da legislatura contra o partido pelo qual o parlamentar se
  elegeu.
- **Descartada (D3):** fabrica divergência a partir de troca de partido
  legítima; converte mudança lícita em falso rótulo de deslealdade.

### Alternativa C — termo único genérico na copy ("votou contra o partido")
- Uma rotulação só para os dois confrontos.
- **Descartada (D2):** esconde do cidadão **qual** "partido" — a liderança ou a
  bancada — e contra qual nível de confiança a afirmação se sustenta.

## Consequências

### Positivas
- O cidadão vê a diferença entre **o que a liderança declarou** e **o que a
  bancada efetivamente fez** — duas leituras auditáveis, não um número opaco.
- A reconstrução as-of preserva a legitimidade da migração partidária: nenhuma
  troca lícita vira "traição" por artefato de medição.
- As invariantes ficam registradas como regra de projeto antes de existir
  código, evitando decisões ad-hoc em PR.
- O caminho L2 (maioria da bancada) **independe** de `orientacao_bancada` e, por
  isso, cobre toda a janela de `voto_nominal` (o ano inteiro), inclusive o
  Senado — onde a ingestão de orientação ainda é dívida (#500).

### Negativas
- **Cobertura desigual entre as duas definições.** Hoje o confronto L1
  (orientação declarada) só pode existir na fatia fina de `orientacao_bancada`
  (≈1 mês, 207 linhas no DB local), enquanto o L2 (maioria da bancada) cobre o
  ano. A UI terá de tornar essa diferença de cobertura explícita, não silenciá-la.
- **Custo de reconstrução temporal.** Apurar o partido vigente por data exige um
  join as-of (`data_voto ∈ [data_inicio, data_fim)`) sobre `filiacao_partidaria`
  em vez de um simples `parlamentar.partido_sigla` — mais caro e sujeito a
  lacunas/sobreposições no histórico de filiação (a tratar na implementação).
- **Exclusões fail-closed reduzem amostra.** Votações sem quórum de bancada ou
  com empate não entram no confronto L2; votações simbólicas/secretas (sem voto
  nominal) não entram em nenhum dos dois. A contagem factual exibida será sempre
  "X de Y votações **com posição definida**", nunca o total de deliberações.
- **Números do diagnóstico são do DB local.** Prod (Neon) estava em 402; os
  valores de cobertura precisam de reconfirmação **[A CONFIRMAR]** antes de
  qualquer afirmação pública derivada deles.

### Neutras
- A definição L2 vale igualmente para Câmara e Senado (depende só de
  `voto_nominal`), removendo, para *esta* leitura, a assimetria Câmara×Senado que
  o ADR-040 registrou para a orientação declarada.
- O critério de quórum (metade dos membros, maioria simples dos votos válidos)
  fica fixado como constante pública; alterá-lo é novo ADR + recálculo histórico.

## Classificação na Pirâmide de Confiança

Conforme [TRUST-PYRAMID.md](../TRUST-PYRAMID.md):

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Voto individual (`voto_nominal`) | **L1** | Dado bruto da fonte oficial, com link; zero interpretação. |
| Orientação declarada da liderança (`orientacao_bancada`) | **L1** | Declaração formal publicada pela fonte oficial. |
| Cada período de filiação (`filiacao_partidaria`, linha) | **L1** | Registro bruto da fonte (início/fim de filiação). |
| Timeline factual de migração partidária | **L1** | Sequência ordenada de registros L1, sem cálculo nem julgamento. |
| Partido vigente na data do voto (reconstrução as-of) | **L2** | Join determinístico `data_voto ∈ [data_inicio, data_fim)` sobre L1; mesmos inputs → mesmo output. |
| "Divergiu da orientação da liderança" (flag + contagem) | **L2** | Igualdade de strings determinística entre voto L1 e orientação L1, agregada por fórmula pública. |
| "Votou diferente da maioria da bancada" (flag + contagem) | **L2** | Agregação determinística de `voto_nominal` com regra de quórum/maioria pública e fixa (D1). |

Nenhum dado deste confronto é L3/L4: não há correlação interpretativa,
classificação de tema, threshold ajustável nem inferência. Tudo é igualdade de
strings ou agregação determinística com fórmula fixa.

## Não-objetivos (fora de escopo)

Este ADR **registra invariantes**; explicitamente **não** faz e **não** autoriza:

- **Nenhum schema, migration, query, agregação ou UI.** A implementação é
  trabalho posterior, sujeito a estas invariantes.
- **Score, índice ou ranking de fidelidade** entre parlamentares (ADR-040 §4).
- **Vocabulário valorativo** ("fidelidade", "rebeldia", "traição", "infidelidade",
  "deslealdade") em copy ou identificadores (ADR-040 §4, retroativo).
- **Fundir L1 e L2** numa métrica única (D1).
- **Ancorar a fidelidade no partido da eleição de 2022** ou em qualquer data fixa
  (D3).
- **Votações sem voto nominal** (simbólicas/secretas) — ficam fora; não se infere
  posição.
- **Federações e blocos partidários** (`Fdr ...`, `Bl ...`) como definição de "o
  partido" — tratamento próprio em #480 / ADR-041, não aqui.
- **Ingestão de orientação de bancada do Senado** — dívida da issue #500; o
  confronto L1 de senadores depende dela, mas a decisão é fora deste ADR. (O
  confronto L2 de senadores já é viável com `voto_nominal`.)
- **Classificação de tema do voto** ou qualquer uso de IA/NLP.
- **Afirmações públicas sobre os números de cobertura** antes de reconfirmá-los
  contra prod (DB local ≠ prod; **[A CONFIRMAR]**).

## Referências

- [ADR-040](040-alinhamento-orientacao-de-bloco.md) — alinhamento com orientação;
  invariante de copy neutra (§Decisão item 4) estendida aqui.
- [ADR-041](041-sinalizacao-alinhamento-federacao.md) — padrão fail-closed
  (posição indefinida → exclui, não fabrica).
- [ADR-042](042-modelagem-votacao-senado.md) — modelagem de votação do Senado.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — definição dos níveis L1–L4.
- Diagnóstico empírico de fidelidade (2026-06-20, leitura contra DB local;
  Neon prod em 402 — reconfirmar): `filiacao_partidaria`, `voto_nominal`,
  `orientacao_bancada`.
- Issue #500 — ingestão de orientação de bancada do Senado.
- Issue #480 — cobertura degradada do alinhamento partidário por federação.
- Domínio: `src/modules/parlamentares/domain/alinhamento.ts`.
