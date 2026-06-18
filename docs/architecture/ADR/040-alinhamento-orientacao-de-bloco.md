# ADR-040: Alinhamento com orientação de bloco (Governo/Oposição)

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-18
> Status: accepted

## Contexto

O Eixo 1 (coerência) hoje mede alinhamento voto-vs-orientação **apenas
partido-a-partido**: para cada votação nominal, comparamos o voto individual
do deputado com a orientação formalizada pela liderança do **seu próprio
partido** (`getAlinhamentoParlamentar`, join `orientacao_bancada.partido_sigla
= parlamentar.partido_sigla`).

O endpoint `GET /votacoes/{id}/orientacoes` da API da Câmara, já consumido pelo
cron diário, retorna mais do que orientações partidárias. Cada linha tem
`codTipoLideranca`:

- `P` — orientação de **partido** (`PL`, `PDT`, `NOVO`...), com
  `codPartidoBloco` preenchido. É o que ingerimos hoje.
- `B` — orientação de **bloco**, com `codPartidoBloco = null`. Aparece em duas
  naturezas:
  - **blocos institucionais de posicionamento**: `Governo`, `Oposição`,
    `Maioria`, `Minoria`;
  - **federações / blocos partidários**: `Fdr PT-PCdoB-PV`, `Fdr PSOL-REDE`,
    `Bl UniPpPsd...`.

Até aqui, `ingestion/camara/orientacoes.ts` filtrava `codTipoLideranca === 'P'`
e **descartava todas as linhas `B`**. O dado de bloco institucional já chega no
pipeline diário e é jogado fora.

Expor o confronto voto-individual-vs-orientação-do-**Governo**/**Oposição**
adiciona uma referência de leitura que independe do partido do parlamentar:
"como este deputado votou em relação à posição do Governo nesta legislatura".
É factual, determinístico (igualdade de strings entre orientação e voto) e não
exige nenhuma fonte nova — só parar de descartar dado que já temos.

Restrições assumidas para este incremento (escopo fechado):

- **Câmara-only.** O Senado não expõe orientação de bancada nem de bloco em
  endpoint público (confirmado empiricamente; ver issue #83). Não inventamos
  substituto.
- **Moldura neutra obrigatória.** A feature é cívica, não um juízo. Não
  ranqueamos parlamentares por "fidelidade".

## Decisão

1. **Reter o bloco institucional que já chega no pipeline.** A ingestão passa a
   gravar, além das orientações partidárias (`P`), as orientações dos quatro
   blocos institucionais — `Governo`, `Oposição`, `Maioria`, `Minoria` —
   identificados por `codTipoLideranca === 'B'` e nome na allowlist. Federações
   e blocos partidários (`Fdr ...`, `Bl ...`) **continuam descartados** neste
   incremento.

2. **Discriminador explícito no schema.** A tabela `votacoes.orientacao_bancada`
   ganha a coluna `tipo_lideranca` (enum `'P' | 'B'`), default `'P'` para
   backfill das linhas existentes. A PK permanece `(votacao_id, partido_sigla)`
   — os nomes de bloco institucional não colidem com nenhuma sigla de partido
   real, então a coluna discrimina sem necessidade de entrar na chave. Linhas de
   bloco são gravadas com `tipo_lideranca = 'B'` **explícito**, nunca herdando o
   default.

3. **Aditivo, não substitutivo.** O alinhamento partidário atual permanece
   intacto. Adiciona-se uma query e uma seção de UI separadas para o
   alinhamento de bloco. Consumidores que listam todas as orientações de uma
   votação (`getOrientacoesByVotacao`) passam a filtrar `tipo_lideranca = 'P'`
   para preservar comportamento; os demais consumidores fazem join por
   `partido_sigla = parlamentar.partido_sigla` e são naturalmente imunes às
   linhas de bloco.

4. **Invariante de copy neutra (regra durável).** Para a feature de bloco e
   qualquer evolução do Eixo 1:
   - O termo canônico é **"alinhamento com a orientação"**. É **proibido**
     "fidelidade", "rebeldia", "traição" ou sinônimos valorativos na copy
     voltada ao bloco.
   - **Sem score agregado** que ranqueie parlamentares; **sem cor** que sugira
     juízo (verde = bom / vermelho = ruim). Mostra-se a **contagem factual**
     (X de Y votações) e **quais** votações. O cidadão conclui.
   - Determinístico: a comparação é igualdade de strings entre orientação e
     voto. Sem IA, sem classificação de tema.
   - **Retroatividade (adendo 2026-06-18).** Esta invariante **alcança copy e
     identificadores anteriores à sua adoção** — não é apenas prospectiva. A
     superfície de disciplina por votação (Wave 9, PRs #279/#297, anterior a
     este ADR) usava "rebelde / rebeldia / rebelou-se", termo valorativo coibido
     por esta regra. Foi renomeada para **"divergência da orientação"** (factual:
     "votou diferente da orientação"). A anterioridade ao ADR **não é isenção**;
     nenhuma copy ou identificador novo pode reintroduzir o vocabulário
     valorativo. Ver #482 e ADR-041 §5.

5. **UI Câmara-only com assimetria explícita.** No perfil de deputado,
   renderizam-se os blocos **Governo** e **Oposição** (Maioria/Minoria ficam
   persistidos mas não renderizados nesta versão). No perfil de senador,
   exibe-se nota explicando que a fonte do Senado não publica orientação — sem
   substituto fabricado.

## Alternativas Consideradas

### Alternativa A — distinguir bloco por prefixo na própria sigla
- Gravar `"BLOCO:Governo"` em `partido_sigla` para diferenciar de partido.
- Contras: polui a chave natural, exige string-parsing em todo consumidor,
  frágil. Rejeitada em favor da coluna discriminadora.

### Alternativa B — `tipo_lideranca` dentro da PK
- PK `(votacao_id, partido_sigla, tipo_lideranca)`.
- Contras: as siglas de bloco institucional não colidem com partidos reais, então
  a coluna na chave não resolve nenhum conflito existente — seria especulativa
  (CLAUDE.md: "não código especulativo"). Rejeitada; coluna fora da PK.

### Alternativa C — também reter federações (`Fdr ...`)
- Resolveria a cobertura degradada do alinhamento partidário para partidos
  federados (ver "Negativas" abaixo).
- Contras: é outra capacidade ("encadear"), com semântica própria (a quem a
  federação se aplica?). Fora do escopo deste incremento; registrada em issue
  para tratamento futuro.

## Consequências

### Positivas
- Nova referência de leitura cívica (voto vs. Governo/Oposição) sem fonte nova
  nem custo de ingestão adicional — só deixamos de descartar dado.
- Coluna discriminadora deixa o schema autoexplicativo e os consumidores
  filtráveis sem heurística de string.
- Invariante de copy neutra fica registrada como regra de projeto, não como
  decisão ad-hoc de um PR.

### Negativas
- **Assimetria Câmara×Senado** permanece: senadores não têm a métrica. Mitigado
  por nota explícita no perfil.
- **Cobertura degradada do alinhamento partidário por federação** (achado
  empírico, fora do escopo deste ADR): partidos federados (PT, PSOL, PP...)
  frequentemente publicam orientação **apenas** pela linha da federação
  (`codTipoLideranca = 'B'`, `Fdr ...`), não como linha `P` da sigla. Logo o
  alinhamento partidário pode não casar orientação para esses deputados em
  parte das votações. Não tratado aqui; documentado na issue #480.

### Neutras
- `Maioria` e `Minoria` são ingeridos e persistidos mas não renderizados nesta
  versão — disponíveis para uso futuro sem nova migration.

## Referências

- API Câmara: `GET /votacoes/{id}/orientacoes` (probe empírico 2026-06-18,
  votações `2633410-8` e `2610975-23`).
- ADR-018 — cache de edge para queries de server component.
- Issue #83 — Senado não publica orientação de bancada.
- Issue #480 — cobertura degradada do alinhamento partidário por federação.
- Domínio: `src/modules/parlamentares/domain/alinhamento.ts`
  (`classifyAlinhamento`, `calcularAlinhamento`).
