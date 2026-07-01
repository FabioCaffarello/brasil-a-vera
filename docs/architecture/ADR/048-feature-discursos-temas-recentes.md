# ADR-048: Feature de discursos — temas e discursos recentes

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-07-01
> Status: accepted (feature implementada — `Discursos` component + `getDiscursosParlamentar` + schema `discursos.discurso` em produção; ingestão ativa; `[A CONFIRMAR]` era gate de Neon-402 de junho, resolvido)

> Feature cívica (não-confronto) que ativa um dado já ingerido e parado.
> Respeita [ADR-016](016-cobertura-temporal-arquivamento.md) (texto longo por
> link, princípio 11) e a moldura de copy neutra do
> [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4.

## Contexto

A ingestão de discursos (#504, ADR-035) trouxe **metadados** de discursos das
duas casas, mas **nenhuma feature** os consome — só um toggle de alerta adiado.
É um dado parado de alto valor cívico: o slogan do projeto é "veja o que ele
faz", e o que o parlamentar **diz em plenário** é parte disso.

**Diagnóstico empírico (2026-06-22, princípio 13)** — medição contra o Postgres
local (Neon em 402; reconfirmar, **[A CONFIRMAR]**):

| Achado | Medição |
| --- | --- |
| Discursos ingeridos | **53.774** (50.587 Câmara + 3.187 Senado) |
| Parlamentares cobertos | **689** |
| Com `keywords` (temas) | ~99% |
| Com `sumario` e `url_texto` (inteiro teor) | ~99% |
| Keywords (exemplos) | "Governo federal, Agronegócio, Banco Nacional…"; "Frente Parlamentar da Agropecuária (FPA)" |

As `keywords` são a **indexação oficial da fonte** (Câmara/Senado), não geradas
por nós — exibi-las e contá-las é determinístico, sem IA.

## Decisão

### D1 — Feature: "O que discursa" no perfil

1. **Principais temas:** os `keywords` dos discursos do parlamentar agregados por
   **frequência** (top-N). Contagem determinística sobre a indexação da fonte.
2. **Discursos recentes:** lista dos mais recentes — `data`, `tipo`, `sumario` e
   **link para o inteiro teor** (`url_texto`).

Câmara e Senado. Por parlamentar, no perfil.

### D2 — Determinístico, sem IA

Nada de análise de sentimento, sumarização gerada, classificação temática por
modelo ou agrupamento por similaridade. Exibimos `sumario`/`keywords` **como
vêm da fonte** e contamos keywords. Mesmos inputs → mesmo output.

### D3 — Inteiro teor por link, não inline

O texto integral do discurso **não é armazenado** (ADR-016 / princípio 11):
liga-se via `url_texto` para a fonte. A Câmara não expõe URL estável em parte
dos discursos → quando `url_texto` é null, exibe-se só o sumário.

### D4 — Copy honesta (estende ADR-040 §4)

- **Discurso ≠ posição oficial nem voto.** A copy deixa claro que são falas em
  plenário/comissão; uma fala não é a posição do parlamentar nem o voto.
- **Tipos procedurais existem** ("Pela Ordem", "Breves Comunicações") — não são
  necessariamente pronunciamentos temáticos; o `tipo` é exibido como rótulo.
- **Os temas são indexação oficial**, não juízo nosso. Sem "discursa muito sobre
  X logo defende X". Sem ranking de "quem mais fala".

## Alternativas Consideradas

### Alternativa A — classificar temas por IA/NLP
- **Descartada (D2):** as keywords da fonte já dão o tema de forma determinística
  e auditável; IA introduziria L3/L4 e viés (ADR-019).

### Alternativa B — armazenar o inteiro teor para busca textual
- **Descartada (D3 / ADR-016):** texto longo infla o banco; o link para a fonte
  é o destino correto. Busca textual fica fora de escopo.

### Alternativa C — ranking de "parlamentares que mais discursam"
- **Descartada (D4):** volume de fala não é mérito; viraria placar valorativo.

## Consequências

### Positivas
- Ativa 53k discursos parados numa feature cívica de alto valor, **sem ingestão
  nova, sem schema, sem IA**.
- "Sobre o que meu parlamentar fala" é informação direta e acionável (link para
  ouvir/ler na fonte).

### Negativas
- **Discurso ≠ posição** — risco de leitura indevida; mitigado por D4 (copy).
- **Keywords ruidosas** — a indexação da fonte mistura temas e entidades
  (ministérios, frentes); exibidas como vêm, com a ressalva de origem.
- **`url_texto` ausente em parte da Câmara** → alguns discursos só com sumário.

### Neutras
- Sem tabela nova; query + UI sobre `discursos.discurso` existente. Trust herdado
  (L1 metadados da fonte; agregação de temas é L2 determinística).

## Classificação na Pirâmide de Confiança

| Dado derivado | Nível | Razão |
| --- | --- | --- |
| Discurso (data/tipo/sumário/link) | **L1** | Metadado bruto da fonte, com link. |
| Frequência de temas (keywords) | **L2** | Contagem determinística sobre L1. |

Sem L3/L4: nenhuma inferência além da contagem.

## Não-objetivos (fora de escopo)

- **Análise de sentimento / classificação temática por IA** (D2).
- **Armazenar inteiro teor** ou busca textual (D3 / ADR-016).
- **Ranking de volume de discurso** (D4).
- **Inferir posição/voto a partir de discurso** (D4).
- **Afirmações de número** antes de reconfirmar contra prod (DB local; Neon 402).

## Referências

- [ADR-016](016-cobertura-temporal-arquivamento.md) — texto longo por link (R2),
  princípio 11.
- [ADR-040](040-alinhamento-orientacao-de-bloco.md) §4 — copy neutra.
- [TRUST-PYRAMID.md](../TRUST-PYRAMID.md) — níveis L1–L4.
- Ingestão: #504 (metadados de discursos das duas casas, ADR-035).
- Diagnóstico empírico (2026-06-22): 53.774 discursos, 689 parlamentares, ~99%
  com keywords/sumário/link.
