# RDS Upstream Candidates

> Brasil a Vera · Design System · v1.0
> Última atualização: 2026-07-01
> Relação com: ADR-033, ADR-038, ADR-053

Inventário de padrões/componentes do BaV que poderiam ser upstreamados para o
`@fabio.caffarello/react-design-system`, beneficiando outros projetos do owner.

Critério de candidatura: componente BaV-agnóstico (sem regras de negócio
legislativas), reutilizável em qualquer projeto, já funciona bem aqui.

**Estado do programa:** A consolidação de primitivas e composições genéricas está
COMPLETA (ADR-038, 2026-06-16). O que resta local são: 5 wrappers de bundle
sancionados (`rds-accordion`, `-autocomplete`, `-dialog`, `-drawer`, `-toast`),
3 composições com identidade BaV ou gap RDS (`SectionCard`, `SectionNav`,
`PartyBadge`), e componentes de domínio puro que nunca serão upstream.

---

## Candidatos Confirmados

### 1. `SectionCard`

- **Componente local**: `src/design-system/compositions/section-card.tsx`
- **Descrição**: Card para seções de página de detalhe. Construído sobre `Card` do
  RDS (`asSection` + `aria-labelledby` + slots `icon`/`badge`). Adiciona
  `scroll-mt-28` embutido para compensar navbar sticky e integração com âncoras.
  API: `title`, `subtitle`, `icon`, `badge`, `children`, `className`, `id`.
- **Por que upstream**: é agnóstico de domínio — qualquer aplicação com páginas de
  detalhe (perfil, produto, entidade) pode usar. O `Card.asSection` do RDS não
  oferece a combinação de anchor-nav + scroll-offset + badge slot.
- **Dependências**: `Card` compound do RDS já tem o que precisa. Apenas empacotar
  a composição com a API local.
- **Issue a abrir no RDS**: `"feat: SectionCard — Card compound com scroll-offset e slot de anchor para páginas de detalhe"`

### 2. `SectionNav`

- **Componente local**: `src/design-system/compositions/section-nav.tsx`
- **Descrição**: Navegação lateral sticky para âncoras de seção. Usa
  `useScrollSpy` do próprio RDS (via `/hooks`). Destaca o item ativo conforme
  scroll. API: `items: { id, label, icon }[]`, `stickyTop`, `className`. Server
  Component-safe (o `useScrollSpy` é client, o resto é RSC).
- **Por que upstream**: padrão de navegação por âncoras existe em qualquer app
  com páginas longas (docs, perfis, dashboards). O RDS tem `useScrollSpy` mas
  não tem o componente de UI que o consome.
- **Dependências**: requer que o RDS já exporte `useScrollSpy` (já exporta).
- **Issue a abrir no RDS**: `"feat: SectionNav — sticky anchor nav com useScrollSpy para páginas de detalhe com múltiplas seções"`

### 3. `DetailLayout`

- **Componente local**: `src/components/detail/detail-layout.tsx`
- **Descrição**: Shell de página de detalhe. Aceita `sections: DetailSection[]` e
  deriva automaticamente o `SectionNav` (desktop), `Accordion` (mobile) e a
  pilha de `SectionCard` (desktop). Elimina a tríplice declaração por seção que
  cada rota repetia. API: `breadcrumb`, `header`, `stats`, `sections`,
  `desktopGridIds`, `mobileOrder`, `footer`.
- **Por que upstream**: qualquer app com páginas de detalhe responsivas
  (desktop: sidebar nav + cards; mobile: accordion) se beneficia. O padrão
  `desktop-nav/mobile-accordion` é comum em dashboards e perfis.
- **Dependências**: requer `SectionCard` e `SectionNav` (candidatos 1 e 2).
  Requer `Accordion` do RDS (já existe). Requer `Container` do RDS ou dimensão
  própria (nota: `max-w-4xl` local vs `max-w-screen-*` do RDS Container —
  verificar antes de upstream).
- **Issue a abrir no RDS**: `"feat: DetailLayout — shell responsivo para páginas de detalhe (desktop SectionNav + mobile Accordion)"`

---

## Candidatos Prováveis

### 4. `AlinhamentoStrip` (como `ProgressStrip` genérico)

- **Componente local**: `src/components/parlamentar/alinhamento-strip.tsx`
- **Descrição**: Barra de progresso thin (h-1.5) com label abaixo. Usado para
  exibir percentuais com fallbacks semânticos por estado: `com_amostra`,
  `amostra_insuficiente`, `federacao`, `sem_dado`.
- **Por que upstream (provável, não confirmado)**: o padrão "barra fina + label
  descritivo + fallback textual por estado" é reutilizável. O RDS tem `Progress`
  mas não tem o slot de fallback textual integrado.
- **Bloqueio**: a lógica de estados (`AlinhamentoCardState`) está acoplada ao
  domínio BaV. Precisaria ser generalizada para `{ kind: 'value' | 'insufficient' | 'unavailable', value?: number }` antes do upstream. Não bloqueia extração mas aumenta o esforço.
- **Issue a abrir no RDS**: `"feat: ProgressStrip — barra de progresso thin com fallback textual por estado (value/insufficient/unavailable)"`

---

## Padrões que o RDS DEVERIA ter (mas não tem)

Gaps identificados durante a auditoria que motivaram soluções locais:

### Gap A: `DetailLayout` (descrito acima como candidato #3)

O RDS tem `DashboardLayout` mas não tem um layout para páginas de detalhe com
Accordion mobile. É o gap de maior impacto para o BaV.

### Gap B: `SectionNav` com scroll-spy integrado

O RDS tem `useScrollSpy` como hook mas não tem o componente visual de nav lateral
que o consome. A composição `SectionNav` do BaV preenche esse gap localmente.

### Gap C: `SectionCard` com anchor + scroll-offset

O `Card.asSection` do RDS não oferece scroll-offset configurável para compensar
navbars sticky. O BaV resolve com `scroll-mt-28` embutido no `SectionCard`.

---

## O que NUNCA vai ser upstream (domínio BaV)

Componentes com regras de negócio legislativas brasileiras:

| Componente | Razão |
|---|---|
| `PartyBadge` | Mapa hardcoded de siglas de partidos políticos brasileiros (PT, PL, MDB, etc.) — identidade específica do domínio eleitoral brasileiro |
| `TrustBadge` | Sistema L1-L4 é conceito interno do BaV — sem paralelo em outros projetos |
| `KpiStrip` do parlamentar | Campos: Alinhamento/Votações/Proposições/Gastos — puro domínio legislativo |
| `ParlamentarCard` | Exibe `partido_sigla`, `uf`, `casa`, foto oficial da Câmara/Senado |
| `ParesContraditorios` | Lógica de fatos contraditórios (RESTRITIVA/PERMISSIVA) — domínio de coerência legislativa |
| `AlinhamentoBlock` | Lógica de alinhamento à bancada parlamentar |
| `EvolucaoPatrimonial` | Camada B do Eixo 2 (bens TSE com correção IPCA) |
| `GastoResumo` | CEAP Câmara — gasto parlamentar |
| Todos os charts de votação | Hemiciclo, disciplina, por partido — domínio legislativo |
| Todos os componentes de `/painel` | Área logada com lógica LGPD/Clerk/alertas BaV |

---

## Dívida ADR-053 Ativa

Componentes em `src/components/` que não importam o RDS e PODERIAM/DEVERIAM usar:

### Casos confirmados de dívida (b) — deveriam usar RDS

| Componente | Gap | Ação sugerida |
|---|---|---|
| `src/components/site/navbar.tsx` | Não usa `Navigation` do RDS | Avaliar se o `Navigation` do RDS cobre a variante glass-strong com AuthSlot e SearchForm inline. Se não cobre → issue RDS |
| `src/components/site/nav-links.tsx` | Não usa `NavLink` do RDS | RDS tem `NavLink` primitive — verificar se a variante com active state via `usePathname` é coberta |
| `src/components/site/nav-mobile.tsx` | Hambúrguer + painel mobile custom | RDS tem `SideNavbar` — verificar cobertura de padrão hambúrguer/overlay |
| `src/components/parlamentar/afinidade-voto.tsx` | Lista de parlamentares com percentual — não usa nenhum RDS | Poderia usar `Card` + `Progress` do RDS para cada item |
| `src/components/parlamentar/alinhamento.tsx` | Bloco de alinhamento sem RDS | Poderia usar `Stat`/`StatGroup` para os KPIs |
| `src/components/votacao/votos-por-partido.tsx` | Tabela custom sem RDS | Poderia usar `Table` ou `DataGrid` do RDS |
| `src/components/votacao/votos-individuais.tsx` | Lista longa sem RDS | Candidato a `Table` do RDS |

### Casos legítimos (a) — sem RDS por razão válida

| Componente | Razão |
|---|---|
| Todos em `src/components/charts/` e `/votacao/charts/` | Charts são Recharts — sem equivalente no RDS (ADR-025 decidiu Recharts) |
| `src/components/parlamentar/grafo-participacao*.tsx` | ReactFlow — biblioteca de grafo especializada, sem equivalente no RDS |
| `src/components/comparar/concordancia-matrix.tsx` | Grid de comparação legislativa — domínio específico |
| `src/components/preview/create-preview.tsx` | OG image generation — Next.js `ImageResponse`, server-only |
| `src/components/parlamentar/compartilhar-button.tsx` | Web Share API + clipboard — browser API wrapping |
| Todos os componentes de `/painel` com forms | Formulários Clerk/LGPD com estado client-side complexo |
| `src/components/proposicao/barra-progresso-tramitacao.tsx` | Visualização de 5 estágios de tramitação legislativa — domínio específico |

---

## Issues para abrir no RDS

### Issue 1: `feat: SectionCard — Card compound com scroll-offset e slot de anchor`

**Tipo**: feature request
**Componente**: `SectionCard`
**Descrição**: Composição sobre `Card` que adiciona suporte a anchor navigation
com scroll-offset configurável. Necessário para páginas de detalhe que usam
navbar sticky.
**Caso de uso no BaV**: 3 perfis (parlamentar, proposição, votação) + comparar + busca.
**Proposta de API**:
```tsx
<SectionCard
  id="votos"
  title="Votações recentes"
  subtitle="Últimos 30 dias"
  icon={<VoteIcon />}
  badge={<TrustBadge level="L1" />}
  scrollOffset="3.5rem" // compensa navbar sticky
>
  {/* conteúdo */}
</SectionCard>
```

---

### Issue 2: `feat: SectionNav — sticky anchor nav com scroll-spy para páginas longas`

**Tipo**: feature request
**Componente**: `SectionNav`
**Descrição**: Navegação lateral sticky que usa `useScrollSpy` (já no RDS) para
destacar a seção ativa. Padrão comum em docs, perfis, dashboards.
**Caso de uso no BaV**: sidebar de navegação nos 3 perfis principais.
**Proposta de API**:
```tsx
<SectionNav
  items={[
    { id: 'votos', label: 'Votações', icon: <VoteIcon /> },
    { id: 'gastos', label: 'Gastos', icon: <WalletIcon /> },
  ]}
  stickyTop="3.5rem"
/>
```

---

### Issue 3: `feat: DetailLayout — shell responsivo desktop-nav / mobile-accordion`

**Tipo**: feature request
**Componente**: `DetailLayout`
**Descrição**: Shell de página de detalhe que aceita `sections[]` e deriva
automaticamente `SectionNav` (desktop sticky) + `Accordion` (mobile) +
`SectionCard` stack (desktop). Elimina boilerplate de tríplice declaração.
**Caso de uso no BaV**: todas as 3 rotas de perfil (parlamentar, proposição,
votação). Reduziu ~150 linhas de boilerplate por rota na ADR-053.
**Proposta de API**:
```tsx
<DetailLayout
  breadcrumb={<Breadcrumb ... />}
  header={<PerfilHeader ... />}
  stats={<KpiStrip ... />}
  sections={[
    {
      id: 'votos',
      navLabel: 'Votações',
      title: 'Votações recentes',
      icon: <VoteIcon />,
      content: <VotacoesRecentes />,
    },
  ]}
  desktopGridIds={['votos', 'gastos']} // grid 2-col nesses
  defaultOpenMobile={['votos']}
/>
```
