# ADR-057 — Votações em Comissão do Senado

**Status:** Accepted
**Data:** 2026-06-24
**Sprint:** 12.3

## Contexto

O Senado publica votações nominais de comissões via o mesmo endpoint `/votacao`
que serve o plenário. A distinção entre plenário (`siglaColegiado = 'SF'`) e
comissão (qualquer outra sigla: `CCJ`, `CAE`, `CAS`, etc.) está no campo
`informeLegislativo.siglaColegiado` de cada registro.

A tabela `votacao` existente foi projetada para votações plenárias de ambas as
Casas. Absorver votações de comissão nela criaria tensões estruturais:

- `aprovada` (boolean) não se aplica — comissões registram `resultadoVotacao`
  como texto livre ("Aprovada", "Rejeitada", ou valores raros como "Sem
  conclusão").
- `orgao` em `votacao` era preenchido com `siglaColegiado`, mas a semântica de
  comissão é diferente: a sigla identifica *quem deliberou*, não onde o plenário
  se reuniu.
- Câmara não publica endpoint equivalente de comissão ainda — misturar na mesma
  tabela forçaria NULLs estruturais e impediria paridade futura limpa.

## Decisão

Criar tabela separada `votacoes.votacao_comissao_senado` (e filha
`voto_nominal_comissao_senado`) para registrar votações nominais em comissões do
Senado. A tabela `votacao` permanece inalterada — sem merge até que a Câmara
exponha endpoint equivalente.

### Separação Câmara/Senado

A tabela é Senado-only. Não tem coluna `casa` (redundante) nem `aprovada`
(inválido para comissões). O campo `resultado` é `text` — preserva o valor da
API sem mapear para boolean.

### Chave natural

`UNIQUE(source_id)` onde `source_id = codigoSessaoVotacao`. O endpoint /votacao
garante unicidade por código de sessão independente de colegiado.

### Vínculo proposição

`materia_source_id` armazena `codigoMateria` como text. Sem FK para `proposicao`
nesta sprint — backfill posterior (mesmo padrão de `votacao.codigo_materia` →
`votacao.proposicao_id`).

### Voto nominal com `parlamentar_id` nullable

Senadores de mandatos anteriores ou suplências não constam na tabela
`parlamentar` da legislatura corrente. `senador_source_id` (text) é sempre
gravado; `parlamentar_id` (uuid) é preenchido quando o lookup encontra o
registro — `SET NULL` em cascade de delete.

### Filtro de ingestão

O script `ingestion/senado/votacoes-comissao.ts` reutiliza o endpoint
`/votacao` com o mesmo range de datas da ingestão plenária, mas descarta
registros onde `informeLegislativo.siglaColegiado === 'SF'` (ou null/ausente —
conservador: sem colegiado identificável não é comissão rastreável).

**Validação empírica (princípio 13):** antes de mergear o script de ingestão,
executar localmente e registrar no PR: (a) quantas votações foram filtradas como
SF, (b) quantas passaram como comissão, (c) amostra de `comissao_sigla` para
confirmar que não há plenário escapando pelo filtro.

## Consequências

- Queries de perfil de senador (Sprint 12.3 PR3) consultam
  `voto_nominal_comissao_senado JOIN votacao_comissao_senado` — path separado
  das queries de plenário existentes.
- Alinhamento futuro Câmara: quando a Câmara expuser endpoint de comissão,
  criaremos `votacao_comissao_camara` ou unificamos via view — decisão adiada.
- Nenhuma mudança nas tabelas `votacao` e `voto_nominal`.

## Alternativas descartadas

**Absorver em `votacao` com coluna `tipo_sessao`:** adicionaria NULL estrutural
em `aprovada` e misturaria semânticas de comissão e plenário no mesmo aggregate.
Rejeitado por aumentar complexidade de queries existentes.

**Endpoint dedicado por comissão (`/comissao/{sigla}/votacao`):** não existe na
API pública do Senado. A filtragem por `siglaColegiado` no endpoint `/votacao`
é a única abordagem disponível.
