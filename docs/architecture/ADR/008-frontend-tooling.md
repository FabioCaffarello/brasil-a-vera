# ADR-008: Tooling de Frontend — Biome, Husky e React Flow

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-04-14
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

Após adotar o monolito Next.js ([ADR-007](007-monolith-first-strategy.md)) e TypeScript como linguagem principal ([ADR-002](002-backend-language-and-framework.md)), é necessário definir o toolchain de qualidade de código e a biblioteca de visualização de grafo. As decisões precisam ser consistentes com os princípios do projeto: simplicidade operacional, custo zero e experiência de contribuição baixo-fricção para um projeto open-source.

Três necessidades específicas:

1. **Linting e formatação** — garantir qualidade e consistência de código com configuração mínima
2. **Pre-commit hooks** — capturar erros localmente antes do push, reduzindo ciclo de feedback
3. **Visualização de grafo** — renderizar o Grafo Legislativo (~600 nós) de forma interativa e integrada ao React

## Decisão

Três ferramentas escolhidas como conjunto integrado:

### 1. Biome — Linting + Formatação Unificados

O projeto adota o [Biome](https://biomejs.dev/) como ferramenta unificada de linting e formatação, substituindo ESLint e Prettier.

**Motivação:**

- Biome executa lint + format em um único binário — sem precisar configurar dois projetos (`.eslintrc` + `.prettierrc`)
- Performance muito superior: Biome é escrito em Rust, processa código TypeScript/JavaScript significativamente mais rápido que ESLint + Prettier
- Configuração drasticamente mais simples: um único `biome.json` no lugar de `.eslintrc.js` com plugins + `.prettierrc`
- Suporte nativo a TypeScript, JSX, JSON — sem need de parsers adicionais
- Regra `noRestrictedImports` substitui `eslint-plugin-import/no-restricted-paths` para import boundaries entre bounded contexts
- Projeto ativo e alinhado com a filosofia de toolchain simplificado do monorepo

**Scripts npm:**

- `npm run lint` → `biome lint .`
- `npm run format` → `biome format --write .`
- `npm run check` → `biome check .` (lint + format juntos)
- CI usa: `biome ci .` (lint + format sem escrever — falha se houver diff)

### 2. Husky — Pre-commit Hooks

O projeto adota o [Husky](https://typicode.github.io/husky/) para executar verificações automaticamente antes de cada commit.

**Motivação:**

- Garante que nenhum commit com erro de lint ou formatação chegue ao repositório
- Reduz ruído de PRs com falhas de CI por problemas de estilo
- Complementa o CI: problemas são capturados localmente antes de push
- Configuração mínima, integrada ao `package.json` via script `prepare`

O hook roda `biome check` apenas nos arquivos staged (não no projeto inteiro), mantendo o pre-commit rápido mesmo em projetos grandes. Novos contribuidores ativam o Husky automaticamente ao rodar `npm install` — nenhum passo adicional é necessário.

### 3. React Flow — Visualização do Grafo Legislativo

O projeto adota o [React Flow](https://reactflow.dev/) como biblioteca para a visualização interativa do Grafo Legislativo (Wave 3), substituindo D3.js e Sigma.js.

**Motivação:**

- React Flow é uma biblioteca React nativa — integração natural com o monolito Next.js sem camada de adaptação (D3.js manipula o DOM diretamente, o que conflita com o virtual DOM do React)
- API declarativa: nós e arestas são componentes React com props tipadas — mais alinhado com a base de código TypeScript do projeto
- Interatividade built-in: zoom, pan, seleção, drag-and-drop e minimap são features nativas, sem implementar do zero como com D3.js
- Custom nodes como componentes React: o card de parlamentar no hover/click é um componente React puro, mantendo a arquitetura consistente
- Performance adequada para o escopo: ~600 nós (parlamentares Câmara + Senado) é exatamente o sweet spot do React Flow
- Licença MIT, ativa e bem mantida

**Capacidades nativas:**

- Layout força-dirigida via `@reactflow/layout`
- Nós customizados como componentes React (`<ParlamentarNode />`)
- Arestas customizadas com espessura proporcional ao peso da co-votação
- Minimap nativo para navegação em grafos grandes
- Controles de zoom/pan nativos
- Seleção múltipla de nós
- Background pattern nativo

**Para Wave 4+ (assembleias estaduais, milhares de nós):** se o volume ultrapassar a capacidade do React Flow, reavaliar Sigma.js (WebGL) naquele momento com dados reais. Não antecipar esta necessidade.

## Alternativas Consideradas

### Para Biome

#### ESLint + Prettier (substituído)

- **Prós**: ecossistema maduro, enorme variedade de plugins e regras customizáveis
- **Contras**: dois projetos de configuração separados, performance menor (JavaScript), múltiplos plugins para TypeScript/React/imports
- **Veredicto**: overhead de configuração e manutenção desproporcional para o projeto

#### oxlint

- **Prós**: linter rápido (Rust), compatível com regras ESLint
- **Contras**: sem formatter integrado (ainda requer Prettier), ecossistema menor, projeto mais recente
- **Veredicto**: resolve metade do problema — ainda precisa de Prettier para formatação

### Para Husky

#### lint-staged

- **Prós**: executa linters apenas em staged files, amplamente adotado
- **Contras**: é um complemento, não substituto de Husky — requer ESLint/Prettier separados; com Biome, o hook direto no Husky é suficiente
- **Veredicto**: desnecessário quando o Biome é a ferramenta unificada

#### lefthook

- **Prós**: alternativa ao Husky, escrito em Go, sem dependência de Node.js
- **Contras**: menos adotado na comunidade Node.js, adiciona dependência de runtime Go
- **Veredicto**: viável, mas Husky é mais natural no ecossistema npm

#### Sem pre-commit (descartado)

- **Prós**: zero overhead local
- **Contras**: problemas chegam ao CI, aumentando ciclo de feedback; PRs falham por estilo, gerando ruído
- **Veredicto**: custo de iteração maior para contribuidores

### Para React Flow

#### D3.js (substituído)

- **Prós**: biblioteca mais poderosa e flexível para visualização de dados, comunidade enorme
- **Contras**: manipulação direta do DOM conflita com o virtual DOM do React, API imperativa requer camada de adaptação, interatividade precisa ser implementada do zero
- **Veredicto**: excelente para visualizações custom, mas overhead de integração React injustificado quando React Flow resolve o caso de uso nativamente

#### Sigma.js

- **Prós**: WebGL (alta performance para milhares de nós), otimizado para grafos grandes
- **Contras**: API imperativa, integração React não nativa (requer wrapper), overhead de complexidade para ~600 nós
- **Veredicto**: reservado como alternativa para Wave 4+ se o volume de nós exigir WebGL

#### vis-network

- **Prós**: biblioteca madura para visualização de redes, funcional
- **Contras**: API jQuery-era, não React-first, design datado, manutenção menos ativa
- **Veredicto**: não alinhado com a stack React/TypeScript moderna do projeto

## Consequências

### Positivas

- **Toolchain simplificado** — um comando (`biome check`) substitui dois (`eslint . && prettier --check .`)
- **Erros capturados antes do commit** — Husky executa `biome check` nos arquivos staged, reduzindo ruído de CI
- **Visualização do grafo como componentes React puros** — consistente com a arquitetura do monolito Next.js
- **Configuração mínima para novos contribuidores** — `npm install` ativa tudo (Husky via `prepare`, Biome como devDependency)
- **Performance de tooling** — Biome (Rust) é significativamente mais rápido que ESLint + Prettier (JavaScript)

### Negativas

- **Biome tem cobertura menor de regras que ESLint com todos os plugins** — mitigação: o conjunto de regras `recommended` é suficiente para o projeto; regras customizadas são adicionadas conforme necessidade
- **React Flow tem limitação a ~1000-2000 nós com boa performance** — mitigação: o escopo atual (600 parlamentares) está bem dentro deste limite; Wave 4+ reavaliar com dados reais

### Neutras

- Biome está em evolução ativa — novas regras e funcionalidades são adicionadas regularmente
- A migração de ESLint para Biome é unidirecional — regras customizadas ESLint existentes precisam ser mapeadas para equivalentes Biome

## Referências

- [Biome — Linter e Formatter unificado](https://biomejs.dev/)
- [Biome — noRestrictedImports](https://biomejs.dev/linter/rules/no-restricted-imports/)
- [Husky — Git hooks](https://typicode.github.io/husky/)
- [React Flow](https://reactflow.dev/)
- [ADR-006 — Stack do Frontend](006-frontend-stack.md)
- [ADR-007 — Monolith First](007-monolith-first-strategy.md)
