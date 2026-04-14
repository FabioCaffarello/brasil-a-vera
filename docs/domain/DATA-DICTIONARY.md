# Dicionário de Dados

> Brasil a Vera · Domínio · v0.1
> Última atualização: 2026-04-14
> Status: draft

---

## Sumário

- [Convenções](#convenções)
- [Parlamentares](#parlamentares)
- [Proposições](#proposições)
- [Votações](#votações)
- [Gastos](#gastos)
- [Eleitoral](#eleitoral)
- [Trust Metadata](#trust-metadata)
- [Enums e Tipos](#enums-e-tipos)

---

## Convenções

- **Nomes de campo**: snake_case
- **IDs**: UUID v7 internos; IDs das APIs oficiais preservados como `source_id`
- **Datas**: ISO 8601 (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:MM:SSZ`)
- **Valores monetários**: `decimal(15,2)`, em BRL
- **Trust level**: campo obrigatório em toda entidade (ver [Pirâmide de Confiança](../architecture/TRUST-PYRAMID.md))
- **Source URL**: URL da fonte oficial (obrigatório para dados L1)

---

## Parlamentares

Bounded context: Parlamentares (ver [Bounded Contexts](../architecture/BOUNDED-CONTEXTS.md))

### parlamentar

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `source_id` | string | Sim | L1 | API | ID na fonte oficial |
| `nome` | string | Sim | L1 | API | Nome parlamentar (como é conhecido) |
| `nome_civil` | string | Não | L1 | API | Nome civil completo |
| `cpf` | string | Não | L1 | TSE | CPF (para vinculação com TSE) |
| `casa` | enum | Sim | L1 | API | CAMARA ou SENADO |
| `partido_sigla` | string | Sim | L1 | API | Sigla do partido atual |
| `partido_nome` | string | Sim | L1 | API | Nome do partido atual |
| `uf` | string(2) | Sim | L1 | API | Unidade federativa |
| `url_foto` | string | Não | L1 | API | URL da foto oficial |
| `situacao_mandato` | enum | Sim | L1 | API | EXERCICIO, AFASTADO, SUPLENCIA, LICENCA |
| `legislatura` | int | Sim | L1 | API | Número da legislatura (ex: 57) |
| `trust_level` | enum | Sim | L1 | Sistema | Sempre L1 para dados de parlamentar |
| `source_url` | string | Sim | L1 | Sistema | URL do registro na fonte oficial |
| `ingested_at` | timestamp | Sim | — | Sistema | Momento da ingestão |
| `source_updated_at` | timestamp | Não | L1 | API | Última atualização na fonte |

### filiacao_partidaria

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `parlamentar_id` | UUID | Sim | — | Sistema | FK para parlamentar |
| `partido_sigla` | string | Sim | L1 | API | Sigla do partido |
| `data_inicio` | date | Sim | L1 | API | Início da filiação |
| `data_fim` | date | Não | L1 | API | Fim da filiação (null se atual) |

### membro_comissao

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `parlamentar_id` | UUID | Sim | — | Sistema | FK para parlamentar |
| `comissao_source_id` | string | Sim | L1 | API | ID da comissão na fonte |
| `comissao_nome` | string | Sim | L1 | API | Nome da comissão |
| `tipo_participacao` | enum | Sim | L1 | API | TITULAR, SUPLENTE |
| `data_inicio` | date | Sim | L1 | API | Início da participação |
| `data_fim` | date | Não | L1 | API | Fim da participação |

---

## Proposições

Bounded context: Proposições

### proposicao

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `source_id` | string | Sim | L1 | API | ID na fonte oficial |
| `tipo` | enum | Sim | L1 | API | PL, PEC, PLP, MPV, PDC, PRC |
| `numero` | int | Sim | L1 | API | Número da proposição |
| `ano` | int | Sim | L1 | API | Ano de apresentação |
| `ementa` | text | Sim | L1 | API | Ementa oficial |
| `ementa_detalhada` | text | Não | L1 | API | Ementa detalhada (quando disponível) |
| `situacao` | enum | Sim | L1 | API | TRAMITANDO, APROVADA, REJEITADA, ARQUIVADA, TRANSFORMADA_EM_NORMA |
| `regime` | string | Não | L1 | API | Regime de tramitação |
| `trust_level` | enum | Sim | L1 | Sistema | Sempre L1 |
| `source_url` | string | Sim | L1 | Sistema | URL na fonte oficial |
| `ingested_at` | timestamp | Sim | — | Sistema | Momento da ingestão |

### proposicao_tema

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `proposicao_id` | UUID | Sim | — | Sistema | FK para proposicao |
| `codigo_tema` | int | Sim | L1 | API | Código oficial do tema |
| `nome_tema` | string | Sim | L1 | API | Nome do tema |

### proposicao_autor

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `proposicao_id` | UUID | Sim | — | Sistema | FK para proposicao |
| `parlamentar_id` | UUID | Não | — | Sistema | FK para parlamentar (se aplicável) |
| `nome` | string | Sim | L1 | API | Nome do autor |
| `tipo_autoria` | enum | Sim | L1 | API | AUTOR, COAUTOR |

### tramitacao

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `proposicao_id` | UUID | Sim | — | Sistema | FK para proposicao |
| `data` | datetime | Sim | L1 | API | Data/hora do passo |
| `orgao` | string | Sim | L1 | API | Órgão (comissão, plenário) |
| `descricao` | text | Sim | L1 | API | Descrição do despacho |
| `situacao` | string | Não | L1 | API | Situação resultante |

---

## Votações

Bounded context: Votações

### votacao

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `source_id` | string | Sim | L1 | API | ID na fonte oficial |
| `proposicao_id` | UUID | Não | — | Sistema | FK para proposicao (se vinculada) |
| `data_hora` | datetime | Sim | L1 | API | Data e hora da votação |
| `descricao` | text | Sim | L1 | API | Descrição/objeto da votação |
| `orgao` | string | Sim | L1 | API | Órgão onde ocorreu (Plenário, Comissão) |
| `votos_sim` | int | Sim | L1 | API | Total de votos SIM |
| `votos_nao` | int | Sim | L1 | API | Total de votos NÃO |
| `abstencoes` | int | Sim | L1 | API | Total de abstenções |
| `ausentes` | int | Não | L1 | API | Total de ausentes |
| `aprovada` | bool | Sim | L1 | API | Se foi aprovada |
| `trust_level` | enum | Sim | L1 | Sistema | Sempre L1 |
| `source_url` | string | Sim | L1 | Sistema | URL na fonte oficial |

### voto_nominal

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `votacao_id` | UUID | Sim | — | Sistema | FK para votacao |
| `parlamentar_id` | UUID | Sim | — | Sistema | FK para parlamentar |
| `voto` | enum | Sim | L1 | API | SIM, NAO, ABSTENCAO, AUSENTE, OBSTRUCAO |
| `trust_level` | enum | Sim | L1 | Sistema | Sempre L1 |

### orientacao_bancada

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `votacao_id` | UUID | Sim | — | Sistema | FK para votacao |
| `partido_sigla` | string | Sim | L1 | API | Sigla do partido |
| `orientacao` | enum | Sim | L1 | API | SIM, NAO, LIBERADO, OBSTRUCAO |

---

## Gastos

Bounded context: Gastos

### gasto

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `source_id` | string | Não | L1 | API | ID na fonte (quando disponível) |
| `parlamentar_id` | UUID | Sim | — | Sistema | FK para parlamentar |
| `tipo` | enum | Sim | L1 | API | CEAP, VERBA_GABINETE, AUXILIO_MORADIA |
| `categoria_codigo` | int | Sim | L1 | API | Código da categoria de gasto |
| `categoria_descricao` | string | Sim | L1 | API | Descrição da categoria |
| `fornecedor_nome` | string | Sim | L1 | API | Nome do fornecedor |
| `fornecedor_cnpj_cpf` | string | Não | L1 | API | CNPJ ou CPF do fornecedor |
| `valor` | decimal(15,2) | Sim | L1 | API | Valor bruto (BRL) |
| `valor_glosa` | decimal(15,2) | Não | L1 | API | Valor glosado |
| `data_emissao` | date | Sim | L1 | API | Data de emissão do documento |
| `url_documento` | string | Não | L1 | API | URL do documento fiscal |
| `trust_level` | enum | Sim | L1 | Sistema | Sempre L1 |
| `source_url` | string | Sim | L1 | Sistema | URL na fonte oficial |

---

## Eleitoral

Bounded context: Eleitoral (Wave 2+)

### candidatura

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `parlamentar_id` | UUID | Não | — | Sistema | FK para parlamentar (vinculação) |
| `ano_eleicao` | int | Sim | L1 | TSE | Ano da eleição |
| `cargo` | string | Sim | L1 | TSE | Cargo disputado |
| `uf` | string(2) | Sim | L1 | TSE | UF da candidatura |
| `partido_sigla` | string | Sim | L1 | TSE | Partido na eleição |
| `numero_urna` | int | Sim | L1 | TSE | Número na urna |
| `votos` | int | Não | L1 | TSE | Total de votos recebidos |
| `situacao` | string | Sim | L1 | TSE | ELEITO, NAO_ELEITO, SUPLENTE, etc. |
| `trust_level` | enum | Sim | L1 | Sistema | Sempre L1 |

### doacao

| Campo | Tipo | Obrigatório | Trust Level | Fonte | Descrição |
|-------|------|-------------|-------------|-------|-----------|
| `id` | UUID | Sim | — | Sistema | Identificador interno |
| `candidatura_id` | UUID | Sim | — | Sistema | FK para candidatura |
| `doador_nome` | string | Sim | L1 | TSE | Nome do doador |
| `doador_cnpj_cpf` | string | Não | L1 | TSE | CNPJ ou CPF do doador |
| `valor` | decimal(15,2) | Sim | L1 | TSE | Valor da doação (BRL) |
| `data` | date | Sim | L1 | TSE | Data da doação |
| `fonte_recurso` | string | Sim | L1 | TSE | Origem (fundo eleitoral, pessoa física, etc.) |

---

## Trust Metadata

Campos transversais presentes em todas as entidades (ver [Pirâmide de Confiança](../architecture/TRUST-PYRAMID.md)):

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `trust_level` | enum (L1, L2, L3, L4) | Sim | Nível de confiança do dado |
| `source_url` | string | Sim (L1) | URL do dado na fonte oficial |
| `source_name` | string | Sim | Nome da fonte (ex: "Câmara dos Deputados API v2") |
| `formula_url` | string | Sim (L2) | URL da fórmula/metodologia |
| `disclaimer` | string | Sim (L3/L4) | Texto de disclaimer |
| `ingested_at` | timestamp | Sim | Momento da ingestão/cálculo |

---

## Enums e Tipos

### Casa

| Valor | Descrição |
|-------|-----------|
| `CAMARA` | Câmara dos Deputados |
| `SENADO` | Senado Federal |

### TipoProposicao

| Valor | Descrição |
|-------|-----------|
| `PL` | Projeto de Lei Ordinária |
| `PEC` | Proposta de Emenda à Constituição |
| `PLP` | Projeto de Lei Complementar |
| `MPV` | Medida Provisória |
| `PDC` | Projeto de Decreto Legislativo |
| `PRC` | Projeto de Resolução |

### TipoVoto

| Valor | Descrição |
|-------|-----------|
| `SIM` | Favorável |
| `NAO` | Contrário |
| `ABSTENCAO` | Abstenção |
| `AUSENTE` | Ausente |
| `OBSTRUCAO` | Obstrução |

### SituacaoProposicao

| Valor | Descrição |
|-------|-----------|
| `TRAMITANDO` | Em tramitação |
| `APROVADA` | Aprovada |
| `REJEITADA` | Rejeitada |
| `ARQUIVADA` | Arquivada |
| `TRANSFORMADA_EM_NORMA` | Transformada em norma jurídica |

### TipoGasto

| Valor | Descrição |
|-------|-----------|
| `CEAP` | Cota para Exercício da Atividade Parlamentar |
| `VERBA_GABINETE` | Verba de gabinete |
| `AUXILIO_MORADIA` | Auxílio-moradia |

### DirecaoProposicao (Motor de Coerência)

| Valor | Descrição |
|-------|-----------|
| `RESTRITIVA` | Restringe, proíbe, revoga |
| `PERMISSIVA` | Autoriza, permite, flexibiliza |
| `NAO_CLASSIFICADA` | Direção ambígua ou não determinável |

### TrustLevel

| Valor | Descrição |
|-------|-----------|
| `L1` | Dados brutos — fonte oficial |
| `L2` | Agregações determinísticas |
| `L3` | Correlações observadas |
| `L4` | Impacto / consequências |
