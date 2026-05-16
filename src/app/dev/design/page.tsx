import { Inbox, Sparkles } from 'lucide-react'

import { HeroSection } from '@/design-system/compositions/hero-section'
import { Badge } from '@/design-system/primitives/badge'
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
import { Input } from '@/design-system/primitives/input'
import { Label } from '@/design-system/primitives/label'
import { Separator } from '@/design-system/primitives/separator'
import { Skeleton } from '@/design-system/primitives/skeleton'
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
 * Rota INTERNA para QA visual manual do design system. Renderiza todas as
 * 10 primitivas Tier 1 entregues pela Sprint 4.0 (button, card, badge,
 * skeleton, sonner, dialog, input, label, separator, tabs) + grade de
 * tokens semânticos (cores).
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
          Design System — Brasil a Vera
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
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
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
              <Badge variant="outline">10 votações</Badge>
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
          Input + Label
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="busca">Buscar parlamentar</Label>
            <Input id="busca" placeholder="Nome, partido, UF…" type="search" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (disabled)</Label>
            <Input
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

        {/* ----- HeroSection ----- */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground text-lg">HeroSection</h3>
          <p className="text-foreground-muted text-sm">
            Hero configurável da Sprint 6.0 PR 3. Props: <code>kicker</code>,{' '}
            <code>title</code>, <code>description</code>, <code>actions</code>,{' '}
            <code>variant</code> (<code>gradient</code> | <code>plain</code>).
            Consome utilitários <code>.bg-hero</code>, <code>.grid-bg</code>,{' '}
            <code>.text-gradient</code> (ADR-024) na variante gradient.
          </p>

          {/* Variante 1: gradient completa */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection
              kicker={
                <>
                  <Sparkles
                    className="h-4 w-4 text-accent"
                    aria-hidden="true"
                  />
                  <span>Wave 6 · Frontend de Excelência</span>
                </>
              }
              title="Brasil a Vera"
              description="Plataforma de transparência política brasileira. Você escolheu quem te representa. Agora veja o que ele faz."
              actions={
                <>
                  <Button>Encontrar meus representantes</Button>
                  <Button variant="outline">Explorar parlamentares</Button>
                </>
              }
            />
          </div>

          {/* Variante 2: gradient mínima (só título) */}
          <div className="overflow-hidden rounded-lg border border-border">
            <HeroSection title="Apenas título (gradient)" />
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
