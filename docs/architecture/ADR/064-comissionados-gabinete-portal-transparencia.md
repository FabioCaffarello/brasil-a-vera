# ADR-064: Comissionados de gabinete via Portal da Transparência (Siape)

> Brasil a Vera · Arquitetura · v0.2
> Última atualização: 2026-07-14
> Status: accepted — **fonte em revisão** (emendado 2026-07-14; implementação
> bloqueada até probe de fonte alternativa — ver [Emenda](#emenda-2026-07-14--fonte-siape-falsificada-por-probe-empírico))

## Contexto

Cada parlamentar federal mantém um gabinete com servidores comissionados (cargos
DAS/CDS nomeados discricionariamente). Esse custo mensal — salários de até dezenas
de milhares de reais por servidor — é **custeado pelo erário** e **obrigatoriamente
público** por força da Lei de Responsabilidade Fiscal (LRF) e da Lei de Acesso à
Informação (LAI), sendo divulgado mensalmente no Portal da Transparência federal.

Nenhum produto de transparência cívica brasileiro exibe esse dado de forma clara
vinculado ao perfil do representante. Hoje o Brasil a Vera mostra o CEAP
(reembolso de despesas do parlamentar), mas não o custo do pessoal do gabinete —
que em muitos casos supera o CEAP.

**Fonte:** `api.portaldatransparencia.gov.br/api-de-dados/servidores`  
**Filtro:** `orgaoExercicio` = CD (Câmara) ou SF (Senado) + `lotacaoNome` contendo
o identificador do gabinete (ex.: `GABINETE DO DEP. [NOME]` ou matrícula).  
**Vínculo:** CPF do parlamentar → matrícula Siape; a API expõe nome, cargo, lotação
e remuneração (bruta e líquida) por competência mensal.

**Restrição estrutural:** Senadores com `cpf IS NULL` em `parlamentar` (gap
residual de ADR-055) não são vinculáveis. A seção some para esses casos
(fail-closed).

## Decisão

### D1 — Nova tabela `comissionado_gabinete`

Schema mínimo:

| Coluna | Tipo | Notas |
|--------|------|-------|
| `id` | UUID v7 | PK |
| `parlamentar_id` | UUID | FK → parlamentar.id |
| `nome` | text | Nome do servidor (público por LAI) |
| `descricao_cargo` | text | DAS/CDS/FC e nível |
| `orgao_exercicio` | text | CD ou SF |
| `municipio_exercicio` | text | Município de lotação |
| `uf_exercicio` | char(2) | UF |
| `remuneracao_bruta` | numeric(12,2) | R$ bruto mensal |
| `mes_referencia` | date | Competência (dia 01 do mês) |
| `source_url` | text | URL da query na API |
| `ingested_at` | timestamptz | |

Chave natural única: `(parlamentar_id, nome, mes_referencia)`.  
Idempotência: `ON CONFLICT DO UPDATE` atualiza remuneração (pode variar mês a mês).

### D2 — Ingestão mensal, cadência `monthly` no registry

Periodicidade: mensal (a API atualiza com defasagem de ~30 dias).  
Tier: após `t1` (depende de `parlamentar` e CPF preenchido).  
Nome no registry: `camara-comissionados` e `senado-comissionados`.

### D3 — Nível de confiança L1

Dado publicado diretamente pelo governo federal (Portal da Transparência).
Sem transformação de inferência. Trust level L1 + `source_url` obrigatório.

### D4 — Exibição: seção "Gabinete" no perfil do parlamentar

- Total de comissionados no último mês disponível.
- Custo total bruto mensal.
- Lista com nome, cargo e remuneração (todos públicos por LAI).
- Copy: "X servidores comissionados no gabinete. Custo mensal: R$ Y."
- Fail-closed: seção oculta se `cpf IS NULL` ou se ingestão retornar vazio.

### D5 — Copy neutra (estende ADR-040 §4)

Proibido qualificar o número de comissionados como "alto" ou "baixo" sem
comparativo contextual. O dado bruto é exibido; percentil vs mediana da casa
é incremento futuro.

## Alternativas Consideradas

### Alternativa A — Scraping da página HTML do Portal
- Não é uma API versionada; estrutura muda sem aviso.
- **Descartada:** API REST disponível e documentada.

### Alternativa B — Exibir apenas contagem, sem nomes/salários
- Nomes e salários de servidores públicos comissionados são obrigatoriamente
  públicos por LAI; omiti-los reduz o valor de accountability sem ganho legal.
- **Descartada:** dado completo é público; exibimos o que a lei garante.

### Alternativa C — Ingestão diária
- Comissionados mudam raramente dentro do mês; custo de API daily supera o valor.
- **Descartada:** mensal é suficiente.

## Consequências

### Positivas
- Abre nova dimensão de accountability ("custo total do gabinete") ainda inexplorada
  em produtos brasileiros.
- 100% público, sem risco legal.
- Complementa o CEAP: CEAP = despesas operacionais do parlamentar; Siape = custo
  de pessoal do gabinete.

### Negativas
- Depende de CPF preenchido em `parlamentar` (gap residual no Senado — ADR-055).
- API do Portal da Transparência tem limite de requisições (sleep entre calls).
- Rotatividade de comissionados pode resultar em nomes duplicados entre meses
  se a chave natural não for suficientemente estável.

### Neutras
- Senadores sem CPF ficam sem a seção (fail-closed), sem erro visível.
- A API exige token de acesso via `chave-api-dados` — adicionar ao GitHub Secrets.

## Classificação na Pirâmide de Confiança

| Dado | Nível | Razão |
|------|-------|-------|
| Nome, cargo, remuneração do servidor | **L1** | Bruto do Portal da Transparência |
| Vínculo parlamentar → comissionado | **L2** | Via CPF (heurística ADR-063 não envolvida; vínculo via CPF direto) |

## Não-objetivos (fora de escopo)

- Servidores efetivos (concursados) lotados nos órgãos CD/SF que não sejam do
  gabinete pessoal do parlamentar.
- Histórico multi-ano de comissionados de mandatos anteriores.
- Percentil ou ranking comparativo entre gabinetes (incremento futuro).

## Emenda 2026-07-14 — fonte SIAPE falsificada por probe empírico

Probe do bulk `202605_Servidores_SIAPE.zip` (mesma base que alimenta a API
`/servidores`) executado em 2026-07-14 — output literal em
[docs/audits/2026-07-probe-download-de-dados.md](../../audits/2026-07-probe-download-de-dados.md)
§A.5. Resultado: no `Cadastro.csv` (milhões de linhas), apenas **93
ocorrências** de Câmara/Senado — todas servidores do **Executivo**
cedidos ou em exercício nas casas (procuradores/advogados da AGU,
requisitados). **Secretários parlamentares não constam do SIAPE**: a
folha dos gabinetes é gerida pelas próprias casas legislativas e não é
publicada no Portal da Transparência federal.

Consequências:

- A premissa de fonte deste ADR ("Fonte:
  `api-de-dados/servidores`, filtro `orgaoExercicio` CD/SF") está
  **falsificada** — o filtro retornaria só cedidos do Executivo, não o
  gabinete. O 401 do token mascarava um problema de fonte, não de acesso.
- **Implementação (Sprint 14.0) bloqueada** até probe das fontes das
  próprias casas (Fase C do plano de probe): Dados Abertos da Câmara
  (secretários parlamentares por gabinete) e Transparência do Senado (RH).
- As decisões D1/D3–D5 (schema, trust level, exibição, copy) permanecem
  válidas em espírito; D2 e o vínculo via Siape serão revisados quando a
  fonte real for confirmada — via nova emenda ou ADR substituto.

## Referências

- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [ADR-055](055-cpf-senador-via-tse-candidatura.md) — vínculo CPF senador.
- [ADR-036](036-correcao-monetaria-patrimonio.md) — pirâmide de confiança L1-L4.
- Portal da Transparência — API Servidores: `api.portaldatransparencia.gov.br/api-de-dados/servidores`
- Lei de Acesso à Informação (LAI) — Lei 12.527/2011, Art. 7.
- Lei de Responsabilidade Fiscal (LRF) — Lei Complementar 101/2000.
