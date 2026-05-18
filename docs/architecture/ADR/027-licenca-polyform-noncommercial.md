# ADR-027: Licença PolyForm Noncommercial 1.0.0 e fechamento de contribuições externas

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-18
> Status: accepted

---

## Contexto

Até 2026-05-18, o projeto declarava no `README.md` estar sob **Apache License
2.0** (badge e seção "Licença"), mas o arquivo `LICENSE` na raiz **nunca existiu**.
A "licença" Apache 2.0 era, portanto, uma oferta unilateral textual sem o
texto canônico no repositório — situação juridicamente frágil.

Em paralelo, o owner observa dois riscos não tratados pelo posicionamento
Apache 2.0:

1. **Uso comercial não autorizado**. Apache 2.0 permite uso comercial
   irrestrito, inclusive como base para produtos pagos. Para um projeto cívico
   solo, mantido por doação, isso significa que um terceiro pode pegar o
   código (incluindo a metodologia de cálculo de coerência, alinhamento, e o
   modelo de dados consolidado de Câmara/Senado/TSE) e revender como produto
   sem retorno ao projeto.
2. **Ruído de contribuições externas não convidadas**. O projeto opera com
   regime de roles (`engineer`/`designer`) e `CODEOWNERS` aponta tudo para
   `@FabioCaffarello`. Branch protection com "Require review from Code Owners"
   bloqueia *merge* de PR externo, mas não impede que PRs externos sejam
   *abertos* — gera notificação, triagem mental, e expectativa frustrada do
   contribuidor.

A missão de transparência (declarada em `PRODUCT-VISION.md`) exige que **o
código permaneça publicamente auditável** — qualquer cidadão deve poder
verificar a metodologia. Mas auditabilidade ≠ direito de uso comercial. As
duas dimensões podem ser separadas via licenças "source-available".

## Decisão

### 1. Licença: PolyForm Noncommercial 1.0.0

Adotar **[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)**
como licença do projeto, em substituição à declaração Apache 2.0 (que nunca
chegou a ter `LICENSE` correspondente).

O texto canônico é gravado em `/LICENSE` com `Required Notice: Copyright (c)
2024-2026 Fabio Caffarello` no topo, sem modificações ao corpo da licença
(modificações invalidam o uso do nome PolyForm).

PolyForm Noncommercial permite:

- **Estudar** o código (inspeção da metodologia — núcleo da missão de transparência).
- **Modificar** para uso pessoal, pesquisa, educação, organizações sem fins lucrativos.
- **Distribuir** cópias, desde que mantenha avisos e o `Required Notice`.
- **Forkar** no GitHub (já garantido pelo TOS do GitHub, independente da licença).

PolyForm Noncommercial veda:

- **Qualquer uso comercial** (revenda, SaaS pago, uso interno em empresa com fim lucrativo).
- **Sublicenciamento** ou transferência das licenças concedidas.

### 2. Contribuições externas fechadas (auto-close de PRs)

Apenas membros do projeto (`OWNER`, `MEMBER`, `COLLABORATOR` no
`author_association` do GitHub) e bots de dependência (`dependabot[bot]`,
`renovate[bot]`) podem abrir PRs. PRs de outras origens são **fechados
automaticamente** pelo workflow `.github/workflows/close-external-prs.yml`,
com comentário orientando o contribuidor a abrir uma **issue** caso queira
reportar bug, propor feature ou se candidatar a contribuidor regular.

Issues continuam abertas para qualquer pessoa — é o canal cívico de feedback
sobre dados incorretos, sugestões de feature e propostas de contribuição.

## Alternativas Consideradas

### Manter Apache 2.0 (status quo)

- **Prós**: Já declarada (mesmo sem `LICENSE` no repo); OSI-approved; familiar.
- **Contras**: Permite uso comercial sem qualquer retorno; não resolve o ruído
  de PRs externos; e a inconsistência atual (declara mas não tem o arquivo)
  precisaria ser resolvida criando o `LICENSE.txt` Apache, o que *aumentaria*
  a fragilidade jurídica em vez de reduzir.
- **Rejeitada**: não atende ao requisito de proteção contra uso comercial.

### BUSL-1.1 (Business Source License)

- **Prós**: Source-available; vetada por advogados de big tech (HashiCorp,
  CockroachDB, Sentry usam). Permite uso não-produtivo amplo.
- **Contras**: Cláusula canônica força `Change Date` em no máximo 4 anos,
  com conversão automática para Apache 2.0 nessa data. Para um projeto que
  busca proteção indefinida, BUSL é um relógio rodando.
- **Rejeitada**: o objetivo é proteção contínua, não open-source diferido.

### "All Rights Reserved" + código visível

- **Prós**: Restrição máxima por copyright default.
- **Contras**: Não concede direitos explícitos a ninguém. Mesmo contribuidores
  convidados ficam em zona cinzenta (não há grant explícito de modificação ou
  redistribuição). Forks via GitHub TOS continuam permitidos, mas o que o
  forker pode *fazer* com o fork é juridicamente indefinido.
- **Rejeitada**: PolyForm entrega proteção comparável com grant explícito e
  clareza para contribuidores.

### Repo privado

- **Prós**: Bloqueio total de uso.
- **Contras**: Contradiz frontalmente a missão de transparência declarada em
  `PRODUCT-VISION.md` — "transparência da metodologia é o escudo contra
  acusações de viés". Sem código auditável, o projeto não pode reivindicar
  apartidarismo.
- **Rejeitada**: viola um princípio mais importante que a proteção comercial.

## Consequências

### Positivas

- **Proteção contra uso comercial indefinida**. Sem cláusula de conversão.
- **Missão de transparência preservada**. Código continua publicamente
  legível, metodologia auditável, fork permitido para estudo.
- **Política de contribuições clara**. Sem expectativa frustrada — auto-close
  responde em <2min com explicação e caminho alternativo (issue).
- **`LICENSE` consistente com a realidade**. Substitui declaração Apache 2.0
  sem arquivo correspondente (estado anterior era pior juridicamente).

### Negativas

- **Não qualifica como "open source" pela OSI**. PolyForm Noncommercial não
  é OSI-approved (Open Source Definition exige permitir uso comercial). O
  projeto deixa de aparecer em listas e índices "open source brasileiro" e
  pode ser questionado por puristas. Aceitável — o ganho de proteção compensa
  o atrito ideológico.
- **GitHub Licensee não detecta PolyForm automaticamente**. A sidebar do repo
  no GitHub provavelmente mostrará "Other" em vez de um nome amigável.
  Cosmético; o `LICENSE` permanece autoritativo.
- **Pool de contribuidores reduzido**. Combinado com auto-close, contribuidores
  oportunistas (drive-by PR) deixam de chegar. Aceitável dado o regime
  operacional (CODEOWNERS já restringe revisão a `@FabioCaffarello`).

### Neutras

- **Fork continua permitido** (GitHub TOS). PolyForm não muda isso.
- **Apache 2.0 anterior**: como nunca houve `LICENSE` no repo, a "oferta"
  Apache era textual e frágil. Não há clones que tenham aceito formalmente
  Apache 2.0 sob um `LICENSE` autoritativo. Mudança não cria conflito de
  versões licenciadas.
- **ADRs anteriores que mencionam "open-source"** (ex.: ADR-009, justificativa
  Cloudflare Pages) não são reescritos — ADRs são imutáveis. O contexto
  histórico dessas decisões permanece válido.

## Referências

- [PolyForm Project — Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)
- [PolyForm FAQ](https://polyformproject.org/faq/)
- [GitHub Docs — pull_request_target](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target)
- [GitHub Docs — author_association](https://docs.github.com/en/graphql/reference/enums#commentauthorassociation)
- ADR-019 (disciplina arquitetural sem gargalo) — princípio de só endurecer
  política após observar o gargalo. Gargalo observado: declaração Apache 2.0
  sem `LICENSE` correspondente + ausência de proteção comercial em projeto
  com metodologia diferenciada.
