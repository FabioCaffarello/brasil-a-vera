# ADR-042: Modelagem e fonte-de-verdade da votação do Senado

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-20
> Status: proposed

---

## Contexto

Três issues abertas pela auditoria de cobertura de fontes
(`docs/audits/2026-06-cobertura-fontes.md`) convergiram para o **mesmo nó**:
como modelamos a identidade e a fonte-de-verdade de uma votação do Senado.

- **#500** — ingerir orientação de bancada do Senado (Eixo 1).
- **#501** — vincular votação→proposição no Senado.
- **#503** (parte Senado) — depende da mesma ingestão de votação.

Atacar as issues uma a uma reencontra o nó. Ele é anterior a todas elas.

### O problema: três endpoints, três identificadores incompatíveis

O Senado expõe **a mesma votação** por endpoints que não compartilham chave
numérica estável (probes empíricos 2026-06-20):

| Endpoint | id próprio | Carrega | Falta |
|---|---|---|---|
| `/votacao` (fonte atual do `votacao.source_id`) | `codigoSessaoVotacao` | votos nominais, `codigoMateria`, `idProcesso` | **orientação** |
| `/plenario/votacao/orientacaoBancada/{data}` | `codigoVotacaoSve` | **orientação** (`orientacoesLideranca[]`), votos nominais, matéria (sigla/nº/ano), sessão | `codigoMateria`/`idProcesso` |
| `/materia/votacoes/{codigoMateria}` | `CodigoSessaoVotacao` | votos nominais | orientação, SVE |

`codigoVotacaoSve` tem **o mesmo nome e valores diferentes** nos dois endpoints
(ex.: votação OFS 16/2025 de 2026-04-29 → `4385` no `/votacao` vs `12673` no
`orientacaoBancada`) — é um falso amigo, não uma chave de join. Varredura do
registro inteiro do `orientacaoBancada`: **nenhum** identificador do `/votacao`
aparece nele (sem `codigoMateria`, sem `codigoSessaoVotacao`).

### Probe dirigida (fundamenta a decisão)

A hipótese a testar: sob a **espinha-`orientacaoBancada`**, o vínculo
votação→proposição (#501) é recuperável pela **chave natural `(tipo, numero,
ano)`** da matéria, já que `codigoMateria` não vem nesse feed. Dois critérios
de aceitação, **fail-closed** (não confirmar = reprovar):

**Critério 1 — `(tipo,numero,ano)` é único em `proposicao`?** ✅ **PASSA.**
A tabela tem `uniqueIndex('proposicao_tipo_numero_ano_unique')`; uma PEC
45/2019 da Câmara e do Senado são a *mesma linha unificada*
(`source_id_camara` + `source_id_senado`). Verificação: **0 duplicatas** de
`(tipo,numero,ano)` no banco (local, não-prod).

**Critério 2 — o mapa de siglas é total e determinístico?** ⚠️ **NÃO satisfeito.**
- *Determinismo:* ✅ `SIGLA_TABLE` do Senado é determinística
  (`PL, PLS→PL, PEC, PLP, PLC→PLP, MPV, PDL→PDC, PDS→PDC, PRS→PRC`; `null` caso
  contrário).
- *Totalidade:* ❌ Amostra de **237 votações (2019–2025), 138 com orientação**.
  Dessas 138: **112 (81%)** são siglas legislativas mapeáveis; **26 (19%)** são
  **órfãs por natureza** — `VETO/VET` (10), `RQS` requerimento (6), `PLV`
  projeto de conversão (6), `PLN` (3), `PRN` (1). Vetos e requerimentos **não
  são proposições** no nosso modelo (sem vínculo é o correto); `PLV/PLN/PRN` são
  artefatos legislativos fora dos 6 tipos do enum `tipo_proposicao`. **Piso de
  órfãos ≈ 19%, estrutural.**
- *Resolução dos 81% mapeáveis:* **não confirmável em dados locais.** Das 66
  tuplas mapeáveis distintas, **0 resolveram** contra `proposicao` — apesar de a
  cobertura local de proposições Senado-sourced ser densa em 2019–2025
  (1.000+/ano). Ex.: PEC 6/45/95/133-2019 ausentes embora o banco tenha 86 PECs
  de 2019 (incluindo 44 e 46). Causa provável: a ingestão incremental
  `/processo?dataAtualizacaoInicio=` não capturou *essas* matérias específicas
  (gap de janela, não de numeração). **A taxa real de resolução exige prod
  (Neon em HTTP 402 até ~2026-07-01); fail-closed: não demonstrada.**

**Conclusão da probe:** a chave `(tipo,numero,ano)` é **inequívoca (C1) mas não
comprovadamente total (C2)**. O vínculo proposição **não pode ser tratado como
"barato/garantido"** — tem piso de órfãos estrutural + resolução pendente de
validação em prod.

## Decisão

**A espinha da votação do Senado é o `/plenario/votacao/orientacaoBancada/{data}`
(date-driven).** Uma única ingestão de votação do Senado, keyed por
`codigoVotacaoSve` (consistente *dentro* desse feed), serve **votos nominais +
orientação** nativamente, sob a mesma identidade. As issues #500, #501 e a parte
Senado de #503 passam a ser **downstream de uma só ingestão**.

O vínculo votação→proposição (#501) é tratado como **enriquecimento
fail-closed** pela chave natural `(tipo, numero, ano)`:

1. Só siglas mapeáveis pela `SIGLA_TABLE` são candidatas; matéria órfã
   (VETO/RQS/PLV/PLN/PRN) **não recebe vínculo** — e isso é correto, não falha.
2. Resolução exige match **único** em `proposicao`; ambiguidade ou ausência →
   `proposicao_id = NULL`, **nunca um vínculo adivinhado**. Uma votação sem
   proposição vinculada continua válida.
3. O piso de órfãos (~19%) e a taxa de resolução são **logados com contagem
   visível** a cada ingestão (mesma disciplina de `warnings.ts`).

A recomendação **não** se apoia na premissa (reprovada) de que o vínculo é
barato. Apoia-se em **degradação graciosa**: a espinha-`orientacaoBancada` torna
o #500 (orientação — a feature de maior valor do Eixo 1) trivial e nativo, e
empurra a única junção frágil para o *enriquecimento* de proposição, onde
fail-closed custa "sem vínculo" (perda aceitável). A alternativa colocaria a
junção frágil sobre a *própria orientação*, arriscando perdê-la em silêncio.

## Alternativas Consideradas

### Alternativa 1 — espinha = `orientacaoBancada` (RECOMENDADA)
- Votos + orientação unificados nativamente sob `codigoVotacaoSve`; **zero
  junção** entre eles. #500 fica trivial.
- Contras: re-arquiteta `ingestion/senado/votacoes.ts`; muda a semântica de
  `votacao.source_id` para o Senado (de `codigoSessaoVotacao` para
  `codigoVotacaoSve`); **abre mão do `codigoMateria` limpo do `/votacao`** — o
  vínculo de #501 passa à chave natural fail-closed (C2 não garantido).

### Alternativa 2 — espinha = `/votacao` atual + reconciliar orientação por chave de conteúdo
- Mantém `codigoMateria`/`idProcesso` (vínculo de #501 limpo). #501 fica trivial.
- Contras: a orientação só casa com a votação por **(sessão + matéria + ordem
  temporal)** — junção de conteúdo (a "O2" já vetada como improviso), com
  desempate frágil quando uma matéria é votada N vezes na mesma sessão.
  Fail-closed aqui custa **perder a orientação** (a feature de maior valor) em
  silêncio — degradação pior que a Alt 1.

### Alternativa 3 — híbrido: espinha `orientacaoBancada` + `/votacao` como enriquecimento de `codigoMateria`
- Recuperaria `codigoMateria` para #501 buscando `/votacao` na mesma janela.
- Contras: o casamento `orientacaoBancada`↔`/votacao` exige a **mesma junção de
  conteúdo** da Alt 2 (sessão+matéria+ordem). Não evita a junção frágil — apenas
  a realoca. Registrada para referência; fora do escopo do incremento inicial.

### Rejeitada — junção por matéria+sessão+data como chave primária
Casamento por conteúdo como identidade da votação. Frágil (colide com múltiplas
votações por matéria/sessão), é improviso. Rejeitada.

## Consequências

### Positivas
- O nó é resolvido de uma vez: #500/#501/#503-Senado deixam de reencontrar o
  bloqueio de identidade; viram downstream de uma ingestão.
- #500 (orientação, Eixo 1) fica nativo e sem junção — destrava a simetria
  Câmara×Senado que o ADR-040 (emendado em #505) reabriu.
- Identidade da votação passa a vir do feed que de fato carrega orientação.

### Negativas
- **Re-arquitetura da ingestão de votação do Senado** e mudança de semântica do
  `source_id` para o Senado. Requer migração de dados das votações já ingeridas
  (re-key de `codigoSessaoVotacao` para `codigoVotacaoSve`) ou re-ingestão.
- **Vínculo votação→proposição (#501) deixa de ser "latente, custo zero".**
  Vira chave natural fail-closed com **piso de órfãos ≈19% estrutural** e taxa
  de resolução **pendente de validação em prod**. #501 deve ser reescrita sob
  esta premissa.
- Perde-se o `codigoMateria`/`idProcesso` limpo do `/votacao` como chave de
  vínculo.

### Neutras
- Votações simbólicas/secretas continuam sem orientação nem voto individual
  (limite da fonte, não da modelagem).
- `Maioria`/`Minoria`/`Banc Fem` e demais blocos são ingeridos como orientação
  (`tipo_lideranca='B'` pela regra A1' denylist, decidida no #500); a copy neutra
  do ADR-040 §4 se aplica integralmente.

## Invariante (regra durável)

**A identidade da votação do Senado é fundamentada por probe empírico, não por
premissa**, e deve ser **re-verificada se a API mudar**. O erro do ADR-040 foi
afirmar "o Senado não expõe orientação" sem probe; este ADR não repete isso —
toda afirmação acima tem probe datado anexado. Antes de marcar este ADR como
`accepted`, **validar a taxa de resolução de `(tipo,numero,ano)` em produção**
(Neon fora do 402, após ~2026-07-01); se a resolução for baixa mesmo com
cobertura total, reabrir a decisão de espinha.

## Referências

- Auditoria: `docs/audits/2026-06-cobertura-fontes.md`.
- ADR-040 (emendado em #505) — orientação de bloco; premissa "Senado não expõe
  orientação" falsificada, que motivou #500.
- Issues #500 (orientação Senado, `blocked`), #501 (votação→proposição Senado),
  #503 (CPF Senado / Trilha Patrimonial).
- API Senado: `/plenario/votacao/orientacaoBancada/{data}`, `/votacao`,
  `/materia/votacoes/{codigoMateria}` (probes empíricos 2026-06-20).
- `ingestion/senado/votacoes.ts`, `ingestion/senado/proposicoes-mapper.ts`
  (`SIGLA_TABLE`, `parseIdentificacao`), `src/modules/proposicoes/domain/schema.ts`
  (`proposicao_tipo_numero_ano_unique`).
