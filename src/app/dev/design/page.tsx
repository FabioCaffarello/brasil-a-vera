import {
  Badge,
  Chip,
  FilterChips,
  InputBase,
  Label,
  Separator,
  Skeleton,
  Stat,
  StatGroup,
} from '@fabio.caffarello/react-design-system/server'
import {
  Clock,
  Database,
  FileText,
  Inbox,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Vote,
} from 'lucide-react'
import { DataBadge } from '@/design-system/compositions/data-badge'
import { HeroSection } from '@/design-system/compositions/hero-section'
import { KpiCard } from '@/design-system/compositions/kpi-card'
import { PartyBadge } from '@/design-system/compositions/party-badge'
import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import { Button } from '@/design-system/primitives/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/design-system/primitives/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/design-system/primitives/dialog'
import { Toaster } from '@/design-system/primitives/sonner'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/design-system/primitives/tabs'

import { Swatch } from './_components/swatch'

/**
 * /dev/design — Sprint 4.0 PR 7.
 *
 * Rota INTERNA para QA visual manual do design system. Renderiza as
 * primitivas Tier 1 (button, card, skeleton, sonner, dialog, input, tabs)
 * + grade de tokens semânticos (cores). Badge, Label e Separator foram
 * consolidados no RDS (ADR-038, WS3-a) e são importados de
 * `@fabio.caffarello/react-design-system/server` — o showroom passa a
 * exibir as variantes reais do RDS.
 *
 * Não-indexável (metadata.robots no layout pai + X-Robots-Tag no
 * next.config.ts). Probe smoke `dev-routes-noindex` valida.
 *
 * Quando este arquivo for atualizado para incluir novas primitivas
 * Tier 2/Tier 3, repetir o padrão: imports → seção dedicada com variantes
 * exibidas lado a lado. Sem lógica de domínio aqui — esta rota só
 * existe para showcase visual.
 */
export default function DesignSystemPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-12 px-6 py-12">
      <header className="space-y-2">
        <h1 className="font-semibold text-3xl tracking-tight">
          Design System — Brasil à Vera
        </h1>
        <p className="text-foreground-muted">
          Rota interna não-indexável. Renderiza as 10 primitivas Tier 1 + tokens
          semânticos da Sprint 4.0 para QA visual manual em dark theme.
        </p>
        <p className="font-mono text-foreground-subtle text-xs">
          Governança: ADR-021 · Tokens: docs/design/DESIGN-TOKENS.md · WCAG:
          docs/architecture/WCAG-AUDIT.md
        </p>
      </header>

      <Separator />

      {/* ============================ TOKENS ============================ */}
      <section aria-labelledby="tokens-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="tokens-title">
          Tokens semânticos (cor)
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          <Swatch
            className="bg-background"
            description="var(--color-background)"
            label="Fundo da página"
            token="background"
          />
          <Swatch
            className="bg-surface"
            description="var(--color-surface)"
            label="Card padrão"
            token="surface"
          />
          <Swatch
            className="bg-surface-elevated"
            description="var(--color-surface-elevated)"
            label="Card CTA / hover"
            token="surface-elevated"
          />
          <Swatch
            className="bg-brand"
            description="var(--color-brand)"
            label="Marca / CTA"
            token="brand"
          />
          <Swatch
            className="bg-success"
            description="var(--color-success)"
            label="Estado positivo"
            token="success"
          />
          <Swatch
            className="bg-warning"
            description="var(--color-warning)"
            label="Disclaimer / amostra"
            token="warning"
          />
          <Swatch
            className="bg-destructive"
            description="var(--color-destructive)"
            label="Estado negativo"
            token="destructive"
          />
          <Swatch
            className="border-2 border-border"
            description="var(--color-border)"
            label="Borda decorativa"
            token="border"
          />
        </div>
      </section>

      <Separator />

      {/* ============================ BUTTON ============================ */}
      <section aria-labelledby="button-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="button-title">
          Button
        </h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Variantes</Label>
            <div className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tamanhos</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" aria-label="Caixa de entrada">
                <Inbox />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estados</Label>
            <div className="flex flex-wrap gap-3">
              <Button disabled>Disabled</Button>
              <Button asChild>
                <a href="/parlamentares">asChild → &lt;a&gt;</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* ============================ BADGE ============================ */}
      <section aria-labelledby="badge-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="badge-title">
          Badge
        </h2>
        <div className="flex flex-wrap gap-3">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="neutral" style="outline">
            Outline
          </Badge>
        </div>
      </section>

      <Separator />

      {/* ============================ CARD ============================ */}
      <section aria-labelledby="card-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="card-title">
          Card
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quem representa seu estado?</CardTitle>
              <CardDescription>
                Encontre seus parlamentares por UF e município.
              </CardDescription>
            </CardHeader>
            <CardContent>
              Conteúdo principal do card. Pode incluir listas, tabelas,
              gráficos.
            </CardContent>
            <CardFooter>
              <Button>Explorar</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Votações da semana</CardTitle>
              <CardDescription>
                As principais matérias votadas nos últimos 7 dias.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Item 1</p>
              <p>Item 2</p>
              <p>Item 3</p>
            </CardContent>
            <CardFooter className="gap-2">
              <Badge variant="neutral" style="outline">
                10 votações
              </Badge>
              <Button variant="link">Ver todas →</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      <Separator />

      {/* ============================ SKELETON ============================ */}
      <section aria-labelledby="skeleton-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="skeleton-title">
          Skeleton
        </h2>
        <p className="text-foreground-muted text-sm">
          Placeholders animados (respeitam <code>prefers-reduced-motion</code>).
        </p>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </section>

      <Separator />

      {/* ============================ INPUT + LABEL ============================ */}
      <section aria-labelledby="input-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="input-title">
          InputBase + Label
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="busca">Buscar parlamentar</Label>
            <InputBase
              id="busca"
              placeholder="Nome, partido, UF…"
              type="search"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (disabled)</Label>
            <InputBase
              disabled
              id="email"
              placeholder="você@email.com"
              type="email"
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* ============================ TABS ============================ */}
      <section aria-labelledby="tabs-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="tabs-title">
          Tabs
        </h2>
        <Tabs defaultValue="votos">
          <TabsList>
            <TabsTrigger value="votos">Votos recentes</TabsTrigger>
            <TabsTrigger value="proposicoes">Proposições</TabsTrigger>
            <TabsTrigger value="gastos">Gastos CEAP</TabsTrigger>
          </TabsList>
          <TabsContent value="votos">
            <Card>
              <CardContent className="pt-6">
                Lista de votações nominais (placeholder visual).
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="proposicoes">
            <Card>
              <CardContent className="pt-6">
                Proposições autoradas (placeholder visual).
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="gastos">
            <Card>
              <CardContent className="pt-6">
                Resumo de gastos CEAP (placeholder visual).
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      <Separator />

      {/* ============================ DIALOG ============================ */}
      <section aria-labelledby="dialog-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="dialog-title">
          Dialog
        </h2>
        <p className="text-foreground-muted text-sm">
          Click no Trigger abre. Esc fecha. Click fora fecha.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Abrir Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar ação</DialogTitle>
              <DialogDescription>
                Esta é uma exibição do Dialog primitive. Em produção, será usado
                para confirmações destrutivas em rotas autenticadas (Sprint
                4.5).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <Separator />

      {/* ============================ COMPOSITIONS — WAVE 6 ============================ */}
      <section aria-labelledby="compositions-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="compositions-title">
          Compositions — Wave 6
        </h2>
        <p className="text-foreground-muted text-sm">
          Padrões visuais sem domínio acoplado. Configuráveis via props.
          Boundary import: importam apenas de{' '}
          <code>design-system/primitives</code>,{' '}
          <code>design-system/tokens</code> e <code>lib/cn</code> (ADR-021
          §Regra de import boundary).
        </p>

        {/* ----- INTEGRATED EXAMPLE — mock de perfil parlamentar ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">
            Exemplo integrado — mock de perfil parlamentar
          </h3>
          <p className="text-foreground-muted text-sm">
            Demonstração das 8 composições da Wave 6 trabalhando juntas em um
            layout realista (mock — não usa dados reais). Antecipa como ficará o
            reskin de <code>/parlamentares/[id]</code> na Sprint 6.3.
          </p>

          <div className="overflow-hidden rounded-lg border border-border bg-background">
            {/* Hero do perfil */}
            <HeroSection
              variant="gradient"
              kicker={
                <DataBadge
                  label="L2"
                  source="Câmara"
                  tone="accent"
                  icon={<Sparkles className="h-3 w-3" />}
                />
              }
              title="Jane Doe (exemplo)"
              description="Deputada Federal pela bancada de SP. Mock — dados ilustrativos para QA visual. Em produção, este header virá de queries server-side."
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  <PartyBadge sigla="PT" name="Partido dos Trabalhadores" />
                  <span className="text-foreground-muted text-sm">
                    · SP · 57ª Legislatura
                  </span>
                </div>
              }
            />

            {/* KPI strip */}
            <div className="p-6">
              <StatGroup layout="strip" cols={4}>
                <Stat
                  icon={<Vote className="h-4 w-4" />}
                  label="Alinhamento"
                  value="87%"
                  hint="▲ 5 pp vs trimestre"
                  tone="success"
                />
                <Stat
                  icon={<TrendingUp className="h-4 w-4" />}
                  label="Votos analisados"
                  value="124"
                  hint="últimos 30 dias"
                />
                <Stat
                  icon={<Inbox className="h-4 w-4" />}
                  label="Proposições"
                  value="12"
                  hint="como autor"
                  tone="neutral"
                />
                <Stat
                  icon={<TrendingDown className="h-4 w-4" />}
                  label="Gastos CEAP"
                  value="R$ 38k"
                  hint="▼ 12% vs trimestre"
                  tone="error"
                />
              </StatGroup>
            </div>

            {/* SectionNav sticky */}
            <SectionNav
              items={[
                { id: 'mock-votos', label: 'Votos', icon: <Vote /> },
                {
                  id: 'mock-bancada',
                  label: 'Bancada',
                  icon: <TrendingUp />,
                },
                {
                  id: 'mock-gastos',
                  label: 'Gastos',
                  icon: <TrendingDown />,
                },
              ]}
            />

            {/* 3 SectionCards demonstrando ids para o SectionNav */}
            <div className="space-y-6 p-6">
              <SectionCard
                id="mock-votos"
                icon={<Vote className="h-5 w-5" />}
                title="Votos recentes"
                subtitle="Últimas 10 votações nominais com cobertura de imprensa"
                badge={<DataBadge label="L2" source="Câmara" tone="brand" />}
              >
                <FilterChips label="Filtrar por sessão" className="mb-4">
                  <Chip selected>Todas</Chip>
                  <Chip count={10}>Plenário</Chip>
                  <Chip count={3}>Comissões</Chip>
                </FilterChips>
                <p className="text-foreground-muted text-sm">
                  Conteúdo da seção entraria aqui em produção (tabela de votos
                  individuais, mapping para nominais Câmara, etc).
                </p>
              </SectionCard>

              <SectionCard
                id="mock-bancada"
                icon={<TrendingUp className="h-5 w-5" />}
                title="Alinhamento de bancada"
                subtitle="% de votos no mesmo sentido que a orientação do partido"
                badge={<DataBadge label="L3" source="análise" tone="accent" />}
              >
                <StatGroup layout="grid" cols={3}>
                  <Stat value="87%" label="Alinhamento médio" />
                  <Stat value="8%" label="Divergência" />
                  <Stat value="5%" label="Ausências em votos" />
                </StatGroup>
              </SectionCard>

              <SectionCard
                id="mock-gastos"
                icon={<TrendingDown className="h-5 w-5" />}
                title="Gastos CEAP"
                subtitle="Cota para o Exercício da Atividade Parlamentar"
                badge={
                  <DataBadge
                    label="L2"
                    source="Portal Transparência"
                    tone="warning"
                  />
                }
              >
                <p className="text-foreground-muted text-sm">
                  Tabela de gastos por categoria entraria aqui em produção. Por
                  enquanto, mock para QA visual.
                </p>
              </SectionCard>
            </div>
          </div>

          <p className="text-foreground-subtle text-xs">
            Composições usadas neste mock: <code>HeroSection</code> (variant
            gradient — showcase only; rotas de produto usam plain por P8 da Wave
            8), <code>DataBadge</code> (kicker accent + badges por SectionCard),{' '}
            <code>PartyBadge</code> (sigla PT), <code>StatGroup</code> (strip, 4
            KPIs com tones), <code>SectionNav</code> (sticky, 3 anchors),{' '}
            <code>SectionCard</code> (3 instâncias com ids),{' '}
            <code>FilterChips</code> (selected state), <code>StatGroup</code>{' '}
            (grid, 3 stats inline).
          </p>
        </div>

        {/* ----- HeroSection ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">HeroSection</h3>
          <p className="text-foreground-muted text-sm">
            Hero configurável da Sprint 6.0 PR 3. Props: <code>kicker</code>,{' '}
            <code>title</code>, <code>description</code>, <code>actions</code>,{' '}
            <code>kpis</code>, <code>meta</code>, <code>variant</code> (
            <code>gradient</code> | <code>gradient-glow</code> |{' '}
            <code>plain</code>), <code>align</code> (<code>start</code> |{' '}
            <code>center</code>). Consome utilitários <code>.bg-hero</code>,{' '}
            <code>.grid-bg</code>, <code>.text-gradient</code> (ADR-024) e — na
            variante <code>gradient-glow</code> — <code>.hero-glow*</code> +{' '}
            <code>.hero-stagger</code> com <code>@keyframes</code> +{' '}
            <code>@starting-style</code> (ADR-023, sem framer-motion).
          </p>

          {/* Variante 1: gradient completa (variant explícita — default do
              componente é plain desde Wave 8 P8) */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection
              kicker={
                <DataBadge
                  icon={<Sparkles className="h-3 w-3" />}
                  label="Wave 6"
                  source="Frontend de Excelência"
                  tone="accent"
                />
              }
              title="Brasil à Vera"
              description="Plataforma de transparência política brasileira. Você escolheu quem te representa. Agora veja o que ele faz."
              actions={
                <>
                  <Button>Encontrar meus representantes</Button>
                  <Button variant="outline">Explorar parlamentares</Button>
                </>
              }
              variant="gradient"
            />
          </div>

          {/* Variante 2: gradient mínima (só título) */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection title="Apenas título (gradient)" variant="gradient" />
          </div>

          {/* Variante 3: plain (sem gradient, sem text-gradient) */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection
              kicker="Sem gradient"
              title="Variante plain — consumer controla o background"
              description="Útil quando o consumer já carrega um background próprio (ex: dentro de outro container colorido)."
              variant="plain"
            />
          </div>

          {/* Variante 4: gradient-glow. Multi-glow + stagger reveal +
              accent line, 100% CSS (ADR-023, sem framer-motion).
              Espelha o shape da home: KpiCard em surface elevated no
              slot `kpis` + 3 pills narrativas no slot `meta`. */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection
              kicker={
                <DataBadge
                  icon={<Sparkles className="h-3 w-3" />}
                  label="Spike"
                  source="Hero gradient-glow"
                  tone="accent"
                />
              }
              title="Transparência política sem ruído."
              description="Variante gradient-glow: 3 blobs animados, accent line, stagger reveal — tudo via CSS (@keyframes + @starting-style). Zero JS extra vs ~50 kB gzip de framer-motion."
              actions={
                <>
                  <Button>Explorar parlamentares</Button>
                  <Button variant="ghost">Ver proposições</Button>
                </>
              }
              kpis={
                <KpiCard
                  aria-label="Métricas do Brasil à Vera (showcase)"
                  items={[
                    {
                      icon: <Users className="h-6 w-6" />,
                      label: 'Parlamentares',
                      value: '513',
                    },
                    {
                      icon: <FileText className="h-6 w-6" />,
                      label: 'Proposições',
                      value: '+250k',
                    },
                    {
                      icon: <Vote className="h-6 w-6" />,
                      label: 'Votações',
                      value: '+30k',
                    },
                    {
                      icon: <Clock className="h-6 w-6" />,
                      label: 'Atualização',
                      value: 'Diária',
                    },
                  ]}
                />
              }
              meta={
                <>
                  <DataBadge label="Dados oficiais" />
                  <DataBadge label="Atualização diária" />
                  <DataBadge label="API pública" />
                </>
              }
              variant="gradient-glow"
            />
          </div>

          {/* Variante 5: plain + align="center" — espelha a home.
              Demonstração da prop `align`: sem fundo decorativo, todos
              os slots (kicker, h1, description, actions, kpis, meta)
              centralizados. Combinação escolhida para a home após
              avaliar gradient-glow. */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection
              actions={
                <>
                  <Button>Explorar parlamentares</Button>
                  <Button variant="ghost">Ver proposições</Button>
                </>
              }
              align="center"
              description="Acompanhe deputados, votações, gastos parlamentares e a tramitação de proposições — direto das fontes oficiais."
              kicker={
                <DataBadge
                  icon={<Sparkles className="h-3 w-3" />}
                  label="Dados oficiais"
                  source="Câmara dos Deputados"
                  tone="accent"
                />
              }
              kpis={
                <KpiCard
                  aria-label="Métricas do Brasil à Vera (showcase plain+center)"
                  items={[
                    {
                      icon: <Users className="h-6 w-6" />,
                      label: 'Parlamentares',
                      value: '513',
                    },
                    {
                      icon: <FileText className="h-6 w-6" />,
                      label: 'Proposições',
                      value: '+250k',
                    },
                    {
                      icon: <Vote className="h-6 w-6" />,
                      label: 'Votações',
                      value: '+30k',
                    },
                    {
                      icon: <Clock className="h-6 w-6" />,
                      label: 'Atualização',
                      value: 'Diária',
                    },
                  ]}
                />
              }
              meta={
                <>
                  <DataBadge label="Dados oficiais" />
                  <DataBadge label="Atualização diária" />
                  <DataBadge label="API pública" />
                </>
              }
              title="Transparência política sem ruído."
              variant="plain"
            />
          </div>
        </div>

        {/* ----- StatGroup (strip) ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">
            StatGroup — strip
          </h3>
          <p className="text-foreground-muted text-sm">
            Strip de KPIs do RDS (<code>StatGroup layout="strip"</code> +{' '}
            <code>Stat</code>), <code>cols</code> 2–4. Hint colorido por{' '}
            <code>tone</code> semântico (<code>neutral</code>/
            <code>success</code>/<code>warning</code>/<code>error</code>).
            Consolidou o <code>KpiStrip</code> local (ADR-038, WS4).
          </p>

          {/* Variante 4 itens com tones diversos */}
          <StatGroup layout="strip" cols={4}>
            <Stat
              icon={<Vote className="h-4 w-4" />}
              label="Alinhamento"
              value="87%"
              hint="▲ 5 pp vs trimestre anterior"
              tone="success"
            />
            <Stat
              icon={<TrendingUp className="h-4 w-4" />}
              label="Votos analisados"
              value="124"
              hint="últimos 30 dias"
            />
            <Stat
              icon={<Inbox className="h-4 w-4" />}
              label="Proposições"
              value="12"
              hint="como autor principal"
              tone="neutral"
            />
            <Stat
              icon={<TrendingDown className="h-4 w-4" />}
              label="Gastos CEAP"
              value="R$ 38k"
              hint="▼ 12% vs trimestre"
              tone="error"
            />
          </StatGroup>

          {/* Variante 2 itens */}
          <StatGroup layout="strip" cols={2}>
            <Stat label="Mandatos" value="2" />
            <Stat label="Comissões ativas" value="4" tone="warning" />
          </StatGroup>
        </div>

        {/* ----- KpiCard ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">KpiCard</h3>
          <p className="text-foreground-muted text-sm">
            Card de KPIs em <code>surface-elevated</code>. Diferente do{' '}
            <code>StatGroup</code> (strip): ícone top → value → label → hint em
            vertical com ritmo uniforme, type scale calibrada para densidade
            4-col (<code>text-2xl</code> → <code>text-3xl</code>), whitespace
            gutters (sem <code>divide-x</code>). Props por item:{' '}
            <code>icon?: ReactNode</code>, <code>label</code>,{' '}
            <code>value</code>, <code>hint?: ReactNode</code>. Consumer
            pré-formata <code>value</code>; composição não chama formatadores
            nem conhece domínio.
          </p>

          {/* Variante 4 itens com ícones — espelha o hero da home */}
          <KpiCard
            aria-label="Métricas do Brasil à Vera (showcase 4 itens com ícones)"
            items={[
              {
                icon: <Users className="h-6 w-6" />,
                label: 'Parlamentares',
                value: '513',
              },
              {
                icon: <FileText className="h-6 w-6" />,
                label: 'Proposições',
                value: '+250k',
              },
              {
                icon: <Vote className="h-6 w-6" />,
                label: 'Votações',
                value: '+30k',
              },
              {
                icon: <Clock className="h-6 w-6" />,
                label: 'Atualização',
                value: 'Diária',
              },
            ]}
          />

          {/* Variante 3 itens com hint como DataBadge — demonstra
              ReactNode no slot hint (consumer escolhe o shape). */}
          <KpiCard
            aria-label="Métricas com hint DataBadge (trust level)"
            items={[
              {
                hint: <DataBadge label="L1" source="Câmara" tone="success" />,
                icon: <Users className="h-6 w-6" />,
                label: 'Parlamentares',
                value: '513',
              },
              {
                hint: <DataBadge label="L2" source="análise" tone="brand" />,
                icon: <TrendingUp className="h-6 w-6" />,
                label: 'Alinhamento',
                value: '87%',
              },
              {
                hint: <DataBadge label="L3" source="modelo" tone="accent" />,
                icon: <Vote className="h-6 w-6" />,
                label: 'Coerência',
                value: '0,84',
              },
            ]}
          />

          {/* Variante 2 itens com hint string — demonstra fallback ao
              shape mais simples (string ainda é ReactNode válido). */}
          <KpiCard
            aria-label="Métricas com hint string"
            items={[
              { label: 'Alinhamento', value: '87%', hint: 'L3 · análise' },
              { label: 'Votos analisados', value: '124', hint: 'últimos 30d' },
            ]}
          />
        </div>

        {/* ----- SectionCard ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">SectionCard</h3>
          <p className="text-foreground-muted text-sm">
            Wrapper de seção da Sprint 6.0 PR 4. Header com slots{' '}
            <code>icon</code>, <code>title</code>, <code>subtitle</code>,{' '}
            <code>badge</code> (geralmente TrustBadge L1-L4). Aceita{' '}
            <code>id</code> para integração futura com SectionNav (PR 5).
          </p>

          <SectionCard
            id="example-votos"
            title="Votos recentes"
            subtitle="Últimas 10 votações nominais"
            icon={<Vote className="h-5 w-5" />}
            badge={
              <Badge variant="neutral" style="outline" className="text-xs">
                L2 · Câmara
              </Badge>
            }
          >
            <p className="text-foreground-muted text-sm">
              Conteúdo da seção entra aqui. Em produção, será uma tabela ou
              lista renderizada por componente de domínio
              (`components/parlamentar/votos-recentes.tsx` etc).
            </p>
          </SectionCard>

          <SectionCard
            title="Sem subtitle, sem icon, sem badge"
            icon={<Database className="h-5 w-5" />}
          >
            <p className="text-foreground-muted text-sm">
              Variante minimal — só title + icon + children.
            </p>
          </SectionCard>
        </div>

        {/* ----- FilterChips ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">FilterChips</h3>
          <p className="text-foreground-muted text-sm">
            Grupo de chips de filtro da Sprint 6.0 PR 5. <code>Chip</code>{' '}
            individual + <code>FilterChips</code> wrapper. RSC-compatível:
            consumer hooka comportamento via <code>asChild</code> (linka a URL
            com search params, mantém URL = state). State <code>selected</code>{' '}
            é responsabilidade do consumer.
          </p>

          {/* Variante 1: button puro, com selected state */}
          <FilterChips label="Casa">
            <Chip selected>Câmara</Chip>
            <Chip>Senado</Chip>
          </FilterChips>

          {/* Variante 2: com count badges */}
          <FilterChips label="Partido (top 5)">
            <Chip selected count={92}>
              PT
            </Chip>
            <Chip count={88}>PL</Chip>
            <Chip count={43}>UNIÃO</Chip>
            <Chip count={38}>PP</Chip>
            <Chip count={32}>MDB</Chip>
          </FilterChips>

          {/* Variante 3: asChild polimórfico — chip vira <a> com href */}
          <FilterChips label="UF (asChild → <a>)">
            <Chip asChild selected>
              <a href="?uf=SP">SP</a>
            </Chip>
            <Chip asChild>
              <a href="?uf=RJ">RJ</a>
            </Chip>
            <Chip asChild>
              <a href="?uf=MG">MG</a>
            </Chip>
          </FilterChips>
        </div>

        {/* ----- SectionNav ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">SectionNav</h3>
          <p className="text-foreground-muted text-sm">
            Barra sticky de jump links da Sprint 6.0 PR 5. Client component
            (IntersectionObserver para active state). Mobile: sticky reduzida +
            scroll horizontal (D6 do prompt mestre). Desktop: mesma estrutura,
            sem scroll. Sem framer-motion.
          </p>

          <div className="rounded-lg border border-border bg-surface">
            <SectionNav
              items={[
                { id: 'nav-demo-votos', label: 'Votos', icon: <Vote /> },
                {
                  id: 'nav-demo-gastos',
                  label: 'Gastos',
                  icon: <TrendingDown />,
                },
                {
                  id: 'nav-demo-proposicoes',
                  label: 'Proposições',
                  icon: <Inbox />,
                },
              ]}
            />
            <div className="space-y-4 p-6">
              <section
                id="nav-demo-votos"
                className="rounded border border-border p-4"
              >
                <h4 className="font-medium text-foreground">Votos</h4>
                <p className="text-foreground-muted text-sm">
                  Section #nav-demo-votos. Role para baixo para ver SectionNav
                  marcar o item ativo (precisa de scroll real — em viewport
                  curto não dispara).
                </p>
              </section>
              <section
                id="nav-demo-gastos"
                className="rounded border border-border p-4"
              >
                <h4 className="font-medium text-foreground">Gastos</h4>
                <p className="text-foreground-muted text-sm">
                  Section #nav-demo-gastos.
                </p>
              </section>
              <section
                id="nav-demo-proposicoes"
                className="rounded border border-border p-4"
              >
                <h4 className="font-medium text-foreground">Proposições</h4>
                <p className="text-foreground-muted text-sm">
                  Section #nav-demo-proposicoes.
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* ----- PartyBadge ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">PartyBadge</h3>
          <p className="text-foreground-muted text-sm">
            Badge colorido por sigla, espelhando identidade visual do partido
            (Sprint 6.0 PR 6, D4). Mapa hardcoded — siglas desconhecidas caem em
            variante neutra. Aria-label legível (
            <code>Partido {'{name || sigla}'}</code>).
          </p>

          {/* Variante grid 8 partidos (4 cols, top da Câmara) */}
          <div className="flex flex-wrap gap-2">
            <PartyBadge sigla="PT" name="Partido dos Trabalhadores" />
            <PartyBadge sigla="PL" name="Partido Liberal" />
            <PartyBadge sigla="UNIÃO" name="União Brasil" />
            <PartyBadge sigla="PP" name="Progressistas" />
            <PartyBadge sigla="MDB" name="Movimento Democrático Brasileiro" />
            <PartyBadge
              sigla="PSDB"
              name="Partido da Social Democracia Brasileira"
            />
            <PartyBadge sigla="REPUBLICANOS" />
            <PartyBadge sigla="PSD" />
            <PartyBadge sigla="PDT" />
            <PartyBadge sigla="PSB" />
            <PartyBadge sigla="PSOL" />
            <PartyBadge sigla="NOVO" />
            <PartyBadge sigla="PCdoB" />
            <PartyBadge sigla="AVANTE" />
            <PartyBadge sigla="CIDADANIA" />
            <PartyBadge sigla="ZZZ" name="Sigla desconhecida (fallback)" />
          </div>

          {/* Variante sm */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-foreground-muted text-sm">size=sm:</span>
            <PartyBadge sigla="PT" size="sm" />
            <PartyBadge sigla="PL" size="sm" />
            <PartyBadge sigla="UNIÃO" size="sm" />
            <PartyBadge sigla="PSB" size="sm" />
          </div>
        </div>

        {/* ----- StatGroup (grid) ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">
            StatGroup — grid
          </h3>
          <p className="text-foreground-muted text-sm">
            Grid de stats para overviews/landings (
            <code>StatGroup layout="grid"</code>). Comparado ao strip: valores
            maiores e separação por gap em vez de border. Consolidou o{' '}
            <code>StatsGrid</code> local (ADR-038, WS4).
          </p>

          <StatGroup layout="grid" cols={4}>
            <Stat value="513" label="Deputados" hint="Câmara dos Deputados" />
            <Stat value="81" label="Senadores" hint="Senado Federal" />
            <Stat
              value="~3.5k"
              label="Proposições/ano"
              hint="Câmara + Senado"
            />
            <Stat value="24" label="Comissões" />
          </StatGroup>
        </div>

        {/* ----- DataBadge ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">DataBadge</h3>
          <p className="text-foreground-muted text-sm">
            Badge genérico de metadado (Sprint 6.0 PR 6). Útil como kicker em{' '}
            <code>HeroSection</code> ou chip narrativo. Domain-agnostic —
            consumer decide o que <code>label</code>/<code>source</code>{' '}
            representam. <code>tone</code> semântico via token (zero hardcode de
            cores).
          </p>

          <div className="flex flex-wrap gap-2">
            <DataBadge label="L1" source="oficial" tone="success" />
            <DataBadge label="L2" source="Câmara" tone="brand" />
            <DataBadge label="L3" source="análise" tone="accent" />
            <DataBadge
              label="L4"
              source="curadoria"
              tone="warning"
              icon={<Sparkles className="h-3 w-3" />}
            />
            <DataBadge label="default" tone="default" />
            <DataBadge
              label="destructive"
              tone="destructive"
              source="contradição"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <DataBadge
              label="Wave 6"
              source="Sprint 6.0"
              tone="accent"
              icon={<Sparkles className="h-3 w-3" />}
            />
            <DataBadge label="Sem source nem icon" tone="brand" />
          </div>
        </div>
      </section>

      <Separator />

      {/* ============================ SONNER (TOASTER) ============================ */}
      <section aria-labelledby="toaster-title" className="space-y-6">
        <h2 className="font-semibold text-2xl" id="toaster-title">
          Sonner (Toaster)
        </h2>
        <p className="text-foreground-muted text-sm">
          O <code>&lt;Toaster /&gt;</code> é montado no fim da página. Para
          disparar toasts, importe <code>toast</code> de <code>sonner</code> em
          um Client Component. Esta rota só monta o container — a interação
          ficará num futuro consumer real (Sprint 4.5+).
        </p>
        <div className="rounded-md border border-border bg-surface p-4 font-mono text-foreground-muted text-xs">
          <code>
            {"import { toast } from 'sonner'; toast.success('Salvo!')"}
          </code>
        </div>
      </section>

      <Toaster />
    </main>
  )
}
