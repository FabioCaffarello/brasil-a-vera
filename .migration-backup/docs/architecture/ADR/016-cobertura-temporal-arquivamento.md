# ADR-016: Cobertura temporal e arquivamento para R2

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-12
> Status: accepted

---

## Sumário

- [Contexto](#contexto)
- [Decisão](#decisão)
- [Alternativas Consideradas](#alternativas-consideradas)
- [Consequências](#consequências)
- [Referências](#referências)

---

## Contexto

O banco do Brasil a Vera cresce monotonicamente com a passagem do
tempo. As fontes oficiais (Câmara, Senado, TSE, Portal da Transparência)
publicam continuamente — sem política de retenção, cada legislatura
adiciona dados acumulativos que nunca são removidos.

Estimativa de ordem de magnitude (extrapolada a partir do volume
ingerido em 30 dias na Wave 0/1):

| Tabela | Linhas / 30 dias | Estimativa anual | 4 anos (1 legislatura) |
|---|---|---|---|
| `proposicao` | ~8.8k | ~100k | ~400k |
| `voto_nominal` | ~17k | ~200k | ~800k |
| `gasto` | ~57k | ~700k | ~2.8M |
| `tramitacao` (não ingerida ainda) | esperado dominante | ~1M+ | ~4M+ |

Estimativa de storage: **~1 GB por legislatura completa** quando
`tramitacao` for ingerida, dominada por texto longo (descrições de
eventos, ementas detalhadas).

Contexto de custo:

- **Free tier Neon**: 0.5 GB / projeto
- **Launch tier**: $19/mês + $0.35/GB-mês acima do incluso
- **Cloudflare R2**: 10 GB free / mês + sem custo de egress

Sem política temporal, o banco saltaria do free tier no primeiro ano
de operação completa, e o custo cresceria linearmente com o tempo
calendário — não com o uso ou tráfego.

Dados de legislaturas encerradas têm **alto valor histórico** (jornalistas,
pesquisadores, ONGs de transparência) mas **baixa demanda de consulta em
latência** (raramente alguém precisa de SLA de 100ms para olhar votos
da 53ª legislatura). Esse perfil casa perfeitamente com armazenamento
de objeto frio.

## Decisão

**Banco quente** (PostgreSQL/Neon) mantém:

- **Legislatura atual** (57ª — 2023-2026)
- **Legislatura anterior** (56ª — 2019-2022)

Total: **8 anos rolando** (sempre 2 legislaturas).

**Dados anteriores à 56ª legislatura** (pré-2019) são exportados para
**Cloudflare R2** trimestralmente em formato **Parquet** (primário) e
**CSV** (secundário, para acessibilidade educativa). Após export
bem-sucedido e verificação de integridade, as linhas correspondentes
são DELETADAS do banco quente.

Estrutura no R2 (bucket público `brasil-a-vera-archive`):

```
/legislatura-55/
  parlamentares.parquet
  parlamentares.csv
  proposicoes.parquet
  ...
/legislatura-54/
  ...
README.md (gerado: schemas, contagens, data de export)
```

Páginas de detalhe (parlamentar, proposição, votação) que tentarem
acessar dados em legislatura arquivada exibem:

- Mensagem informando que os dados estão em arquivo histórico
- Link direto para o objeto no R2 (`https://archive.brasil-a-vera.org/legislatura-N/<tabela>.parquet`)
- Sugestão de ferramenta de consulta (DuckDB, Pandas, Polars)

A transição entre "quente" e "frio" acontece em pipeline trimestral
(GitHub Actions) que:

1. Detecta legislaturas que saíram da janela "atual + anterior"
2. Exporta tabelas afetadas com `COPY ... TO STDOUT` (Postgres → arquivo)
3. Converte para Parquet
4. Faz upload para R2
5. Verifica integridade (contagem de linhas, sample comparison)
6. Apenas após verificação, executa DELETE no banco

## Alternativas Consideradas

### Manter tudo no Postgres

- **Prós**: zero complexidade adicional; queries cross-legislatura
  funcionam nativamente; nenhum pipeline novo.
- **Contras**: custo cresce indefinidamente com o tempo calendário,
  não com tráfego. Após ~3 anos de operação, ultrapassaria o free
  tier; após ~10 anos, custaria mais de $30/mês só de storage. Para
  um projeto cívico mantido por doação, é caminho de uma via para
  a morte por orçamento.
- **Veredicto**: descartado.

### Apagar dados sem arquivar

- **Prós**: máxima economia; banco minúsculo.
- **Contras**: perda histórica irrecuperável. Dados públicos
  brasileiros têm valor cívico permanente — apagar votos de uma
  legislatura encerrada quebra promessa implícita de transparência.
- **Veredicto**: descartado por razão de propósito do projeto.

### Sharding por legislatura (tabela por legislatura)

- **Prós**: queries dentro de uma legislatura ficam mais rápidas;
  drop de legislatura encerrada é `DROP TABLE` instantâneo.
- **Contras**: complexidade prematura. Queries cross-legislatura
  (afinidade histórica de voto, evolução de partido) viram UNION ALL
  de N tabelas. Schema evolution se multiplica. Sem evidência de
  necessidade de performance hoje.
- **Veredicto**: descartado por complexidade desproporcional ao
  benefício atual.

### Postgres + table partitioning por ano

- **Prós**: ferramenta nativa do Postgres para o problema; partições
  antigas podem ser detached. Performance preserva-se em queries
  dentro de partição.
- **Contras**: ainda usa storage no Postgres (Neon cobra GB
  independente de partição). Resolve performance, não custo. E o
  Neon serverless não permite tablespaces em discos diferentes.
- **Veredicto**: descartado para o problema de **custo**. Pode ser
  reintroduzido como otimização de **performance** quando volume
  dentro de uma legislatura crescer (Wave 3+).

### Backup-and-archive sem deletar (cópia em R2 + retenção infinita no Postgres)

- **Prós**: redundância máxima; zero risco de "perdi dado".
- **Contras**: paga storage duas vezes pelo mesmo dado. Não resolve
  o problema de orçamento.
- **Veredicto**: descartado.

## Consequências

### Positivas

- **Custo de storage estabiliza** em ~2 GB depois da terceira
  legislatura completa em operação (cada nova legislatura empurra a
  mais antiga pro R2). Previsível ao longo de décadas.
- **Pesquisadores acadêmicos ganham acesso direto** ao dataset
  histórico em formato amigo de Pandas/DuckDB/Polars. Parquet é
  padrão de fato em ciência de dados aberta.
- **Decisão de produto explícita** evita conversas recorrentes do
  tipo "por que falta X?". A resposta canônica fica: "está no R2,
  link aqui".
- **R2 não cobra egress** — pesquisadores podem baixar gigabytes
  livremente sem custo pro projeto.

### Negativas

- **Pipeline de archive precisa existir** (Wave 3+). Não é trabalho
  trivial: requer COPY do Postgres, conversão Parquet, upload R2,
  verificação, DELETE atômico. Falhas no meio podem causar
  inconsistência ou perda.
- **UI das páginas de detalhe precisa lidar com fallback**: quando
  um parlamentar consulta dados de mandato antigo, o response não
  vem do banco e a página precisa mostrar o link R2 com elegância.
- **Queries cross-legislatura** (ex: histórico completo de coerência
  de um parlamentar com 30 anos de mandato) ficam impossíveis na
  app pública sem download manual do arquivo. Aceitável: esse caso
  é de pesquisa, não de navegação cidadã.

### Neutras

- A definição de "legislatura atual + anterior" é configurável. Se
  surgir caso de uso de "últimos 3 mandatos", a janela pode crescer
  sem mudar a arquitetura — só o custo.

## Referências

- [Issue #36 — implementar pipeline de archive trimestral para R2](https://github.com/FabioCaffarello/brasil-a-vera/issues/36)
- [Issue #37 — UI fallback para dados arquivados em R2](https://github.com/FabioCaffarello/brasil-a-vera/issues/37)
- [ADR-014 — Idempotência sem chave natural](014-idempotency-without-natural-key.md) — padrão de DELETE+INSERT compatível com archive
- [ADR-017 — Budget mensal e observabilidade](017-budget-mensal-observabilidade.md) — mecanismo de controle de custo principal
- [Cloudflare R2 Pricing](https://www.cloudflare.com/products/r2/) — free tier 10 GB + zero egress
- [Apache Parquet](https://parquet.apache.org/)
- [DuckDB — Parquet support](https://duckdb.org/docs/data/parquet)
