# ADR-049: Perfil biográfico do parlamentar ("Quem é")

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-06-22
> Status: proposed

> Evolução cívica de contexto. Respeita o trust em aggregate roots (princípio 3)
> e a moldura de copy neutra do [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4.

## Contexto

O perfil do parlamentar é rico em **atividade** (vota, propõe, relata, comparece,
discursa, patrimônio, gastos) mas **não diz quem a pessoa é** — só nome, partido,
UF e foto. Para o cidadão "conhecer quem o representa", falta o básico
biográfico.

**Diagnóstico empírico (2026-06-22, princípio 13)** — API da Câmara:

| Fonte | Dado |
| --- | --- |
| `GET /deputados/{id}` (detalhe — já buscado no backfill-CPF) | `escolaridade` ('Superior Incompleto'), `dataNascimento`, `municipioNascimento`/`ufNascimento` |
| `GET /deputados/{id}/profissoes` | `titulo` ('Empresário') — tipicamente 1 entrada |
| `GET /deputados/{id}/ocupacoes` | quase sempre vazio |

São **dados autodeclarados** no registro (TSE/Câmara), point-in-time.

## Decisão

### D1 — Enriquecer `parlamentar` com campos biográficos (Câmara)

`parlamentaresSchema.parlamentar` ganha colunas **nullable** (enriquecimento,
não chave): `escolaridade`, `data_nascimento`, `municipio_nascimento`,
`uf_nascimento`, `profissao`. Ficam na raiz e herdam seu trust (princípio 3).
Câmara-only nesta fase (o detalhe do Senado tem forma própria — follow-up).

### D2 — Ingestão por backfill (detalhe + profissões)

`backfill:camara:bio`: para deputados sem `escolaridade` preenchida, busca o
detalhe `/deputados/{id}` (escolaridade/nascimento) e `/deputados/{id}/profissoes`
(profissão). Serial + pacing (o detalhe throttla bursts — mesmo achado do
backfill-CPF). Idempotente; cadência mensal (bio quase não muda).

### D3 — Idade derivada, demais campos brutos

A **idade** é derivada de `data_nascimento` na exibição (função pura, L2 trivial);
os demais campos são L1 (brutos da fonte). A idade é recalculada a cada
render/revalidate — não é armazenada.

### D4 — Copy honesta (estende ADR-040 §4)

- **Autodeclarado, não verificado:** a copy deixa claro que escolaridade,
  profissão e naturalidade vêm da **autodeclaração** do parlamentar no registro,
  não de verificação independente.
- **Point-in-time:** reflete o que foi declarado; ocupação/profissão pode estar
  desatualizada. Sem juízo (ex.: não inferir competência da escolaridade).

## Alternativas Consideradas

### Alternativa A — ingerir ocupações
- **Descartada:** o endpoint `/ocupacoes` vem quase sempre vazio; baixo retorno.

### Alternativa B — capturar bio dentro do backfill-CPF
- **Descartada:** o backfill-CPF filtra `cpf IS NULL` (universo diferente) e tem
  outro propósito; misturar acopla dois enriquecimentos. Backfill próprio é mais
  claro (aceita-se a busca de detalhe redundante — ambos são esporádicos).

## Consequências

### Positivas
- O perfil passa a responder "quem é", não só "o que faz" — contexto cívico
  básico, barato (o detalhe já é buscado), sem fonte nova.

### Negativas
- **Câmara-only** — senadores sem bio até o follow-up do detalhe do Senado.
- **Autodeclarado** — escolaridade/profissão podem estar desatualizadas ou
  imprecisas; mitigado por D4 (copy).
- **Backfill com detalhe redundante** ao do CPF — custo de execução esporádico,
  não de modelagem.

### Neutras
- Sem tabela nova: colunas na raiz `parlamentar`, herdando trust.

## Classificação na Pirâmide de Confiança

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Escolaridade, nascimento, naturalidade, profissão | **L1** | Autodeclaração bruta da fonte oficial. |
| Idade (de `data_nascimento`) | **L2** | Cálculo determinístico trivial. |

## Não-objetivos (fora de escopo)

- **Senado** (detalhe com forma própria — follow-up).
- **Ocupações** (endpoint vazio).
- **Verificação** dos dados autodeclarados.
- **Juízo** a partir de escolaridade/profissão (D4).
- **Afirmações de número** antes de reconfirmar contra prod (DB local; Neon 402).

## Referências

- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — níveis L1–L4.
- API Câmara: `GET /deputados/{id}`, `GET /deputados/{id}/profissoes`.
- Diagnóstico empírico (2026-06-22).
