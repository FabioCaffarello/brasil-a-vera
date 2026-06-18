# ADR-041: Sinalização honesta de alinhamento não-calculado para federações

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-18
> Status: accepted

## Contexto

O ADR-040 documentou, em "Negativas", um efeito colateral do modelo de dados:
partidos em **federação** publicam a orientação de voto **apenas pela linha da
federação** (`codTipoLideranca = 'B'`, sigla `Fdr PT-PCdoB-PV`), não como uma
linha `P` da sigla individual (`PT`). O cálculo de alinhamento partidário
(`getAlinhamentoParlamentar`) faz join por
`orientacao_bancada.partido_sigla = parlamentar.partido_sigla` — então, para um
deputado federado, esse join encontra **~0 linhas**: o denominador colapsa.

Isto não é uma cobertura *parcial* (subconjunto de votações sem orientação);
é um **colapso estrutural** do denominador para perto de zero em toda a
bancada federada. As 3 federações vigentes na legislatura 2023–2026 são:

- **Federação Brasil da Esperança (FE BRASIL)** — PT, PCdoB, PV;
- **Federação PSOL REDE** — PSOL, REDE;
- **Federação PSDB Cidadania** — PSDB, Cidadania.

Juntas somam ~21,6% da Câmara, incluindo a 2ª maior bancada (PT).

O problema **não é** a ausência do número — é a **explicação falsa** que o
produto dá para essa ausência. Conforme o denominador real de cada deputado
federado, a UI hoje cai num de dois ramos, ambos enganosos:

- `total = 0` → "*A liderança deste partido ainda não publicou orientação...*"
  (falso: a liderança **publicou** — pela federação);
- `1 ≤ total < 50` → "*Amostra pequena (menos de 50 votações)*" (falso: o motivo
  não é amostra pobre, é a sigla da fonte);
- (caso de borda) `total ≥ 50` → exibe um **percentual** sobre matches `P`
  esparsos — um número genuinamente espúrio.

Mentir por omissão sobre 1/5 da Câmara contradiz o propósito do projeto. Este
ADR trata de **parar de exibir a explicação falsa**.

Restrição assumida (escopo fechado): **sinalizar, não calcular.** Não se ingere
federação, não se parseia `Fdr X-Y-Z` para computar alinhamento. O eventual
cálculo via parse é uma decisão de invariante própria, adiada (ver
"Referências").

## Decisão

1. **Detecção determinística por allowlist estática.** Um helper transversal
   (`src/shared/federacoes.ts`) declara as 3 federações vigentes e suas siglas-
   membro, e responde à pergunta verificável "*este partido está em federação?*"
   (`federacaoDoPartido(sigla)`). Comparação case-insensitive.

2. **A detecção só suprime e explica — nunca calcula.** Saber que um deputado
   está em federação é um **fato de detecção** (a allowlist é pública e
   estática). Esse fato é usado exclusivamente para **suprimir** qualquer número
   de alinhamento partidário e **substituir** a copy falsa por uma explicação
   verdadeira. Em nenhum momento a federação é usada para **inferir orientação**
   ou produzir um percentual.

3. **Supressão por construção, robusta aos três casos.** `getAlinhamentoParla-
   mentar` faz short-circuit quando o partido é federado: retorna o resultado
   vazio com um marcador (`emFederacao = true`, `federacaoNome`), **sem rodar o
   join**. Assim nenhum número é computado — seja o denominador real 0, 1–49 ou
   ≥50. O caso de borda do percentual espúrio fica eliminado por desenho, não
   por limiar.

4. **Copy honesta e neutra (herda ADR-040).** No perfil, o deputado federado vê
   que o alinhamento partidário **não é calculado** porque a fonte publica
   orientação pela federação, não pela sigla — explicitando que **não é amostra
   insuficiente**. Sem juízo, sem score, sem cor valorativa. A explicação se
   sustenta sozinha; a rastreabilidade (issue/ADR) vive no código e neste
   documento, não na UI do cidadão.

5. **Escopo restrito ao perfil (consumidor que mente ativamente).** Dos cinco
   consumidores do join de orientação, apenas `getAlinhamentoParlamentar`
   (perfil) **exibe texto falso**. Os outros quatro são **omissões silenciosas**
   ou superfícies distintas (página de partido, página de votação, agregado de
   ingestão) — tratados em issues de follow-up, não neste incremento. A
   invisibilidade estrutural de bancadas federadas inteiras na análise de
   disciplina/rebeldia (`getRebeldesByVotacao`) é a **mesma classe de
   desonestidade** e tem issue **prioritária**.

   **Atualização (2026-06-18, #482 + #484).** A invisibilidade estrutural na
   página de votação foi tratada para os dois consumidores que compartilham a
   raiz do join por sigla — `getRebeldesByVotacao` (#482) e
   `getDisciplinaPartidariaPorVotacao` (#484). A sinalização é **de nível-lista**
   (nota única no rodapé de cada seção, não marcação por deputado): uma nota
   factual explica que partidos em federação não entram porque a Câmara publica
   a orientação pela federação, não pela sigla. A detecção reusa `emFederacao`
   (`src/shared/federacoes.ts`) sobre os partidos que votaram, sem nova query.
   No mesmo incremento, o vocabulário valorativo "rebelde" (anterior a esta
   regra) foi renomeado para **"divergência da orientação"** (ADR-040 §4,
   retroatividade). Caso de borda residual (votação só com orientação de
   federados → bloco oculto sem nota) rastreado em #488. A página de partido
   (#483) e o agregado L2 (#485) permanecem follow-ups separados.

## Alternativas Consideradas

### Alternativa A — apenas trocar o texto do aviso "amostra insuficiente"
- Reescrever a copy do ramo de aviso para citar federação.
- Contras: não cobre o ramo `total = 0` nem o caso de borda `≥ 50` (percentual
  espúrio continuaria no ar). Re-rotular sem suprimir deixa a possibilidade de
  um número enganoso. Rejeitada em favor da supressão por construção.

### Alternativa B — calcular alinhamento parseando `Fdr X-Y-Z`
- Mapear a orientação da federação de volta para cada deputado-membro.
- Contras: muda a **invariante** do que "alinhamento partidário" significa (a
  quem a orientação da federação se aplica? como atribuir?). É uma capacidade
  nova com semântica própria, não um conserto de copy. Fora do escopo;
  registrada como ADR futuro **proposed/deferred**.

### Alternativa C — detectar federação consultando o banco (linhas `Fdr ...`)
- Inferir federação a partir da presença de orientações de bloco.
- Contras: acopla a detecção (fato estático e estável) ao estado de ingestão
  (variável), e arrisca falso-negativo quando a ingestão atrasa. A allowlist das
  3 federações é fato público e estável durante a legislatura. Rejeitada.

## Consequências

### Positivas
- O produto deixa de dar explicação falsa para ~21,6% da Câmara.
- A supressão é robusta aos três casos por construção — não depende de qual
  cenário a verificação empírica venha a confirmar.
- O short-circuit evita o join para deputados federados (menos custo de query).
- Helper de detecção é reusável pelos consumidores de follow-up.

### Negativas
- **Allowlist é manutenção manual.** Mudança no conjunto de federações (nova
  federação, dissolução) exige editar `federacoes.ts`. Aceito: federações são
  poucas, mudam por legislatura, e o custo de um fato estático é menor que o de
  inferência frágil.
- **Pendência rastreada — grafia das siglas.** A grafia exata em
  `parlamentar.partido_sigla` (`PCdoB` vs `PCDOB`, `Cidadania` vs `CIDADANIA`)
  ainda **não foi confirmada empiricamente** porque o banco de produção está sob
  cota de transferência esgotada (reseta 2026-07-01). Mitigação atual:
  comparação case-insensitive (uppercase). **A confirmar** com
  `SELECT DISTINCT partido_sigla FROM parlamentares.parlamentar` quando a cota
  voltar; ajustar a allowlist se necessário.
- **Verificação bloqueante adiada.** Pela mesma cota, não foi possível confirmar
  empiricamente se algum deputado federado acumula `≥ 50` matches `P` esparsos
  (o caso do número espúrio). A decisão de suprimir-por-construção torna a
  correção válida independentemente, mas a confirmação fica pendente para o PR
  pós-2026-07-01.

### Neutras
- Os blocos institucionais (Governo/Oposição, ADR-040) continuam sendo
  exibidos normalmente para deputados federados — a supressão é só do
  alinhamento **partidário pela sigla**.

## Referências

- ADR-040 — alinhamento com orientação de bloco; "Negativas" documenta o
  colapso por federação e a Alternativa C (reter federações).
- Issue #480 — cobertura degradada / colapso do alinhamento por federação.
- Follow-ups (consumidores fora do escopo deste incremento):
  - #482 (**prioritária**) — bancadas federadas invisíveis em
    disciplina/rebeldia (`getRebeldesByVotacao`); mesma classe de desonestidade.
  - #483 — rótulo "amostra insuficiente" falso na página de partido
    (`getFidelidadeInternaMedia`).
  - #484 — partidos federados ausentes da tabela de disciplina por votação
    (`getDisciplinaPartidariaPorVotacao`).
  - #485 — `pct_alinhamento` NULL sem sinalização no agregado L2 (card/comparar).
- ADR futuro (proposed/deferred) — cálculo de alinhamento de federação via
  parse de `Fdr X-Y-Z`; muda a invariante de atribuição, não decidido aqui
  (rastreado em #486).
- Verificação empírica pendente (cota Neon, reset 2026-07-01): buckets
  `=0` / `1–49` / `≥50` de matches `P` por deputado federado + grafia das
  siglas via `SELECT DISTINCT`.
- Detecção: `src/shared/federacoes.ts`.
- Domínio: `src/modules/parlamentares/domain/alinhamento.ts`.
