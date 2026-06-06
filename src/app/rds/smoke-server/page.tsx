import {
  Badge,
  Card,
  Label,
  Separator,
  Skeleton,
  Text,
} from '@fabio.caffarello/react-design-system/server'

export const dynamic = 'force-dynamic'

export default function RdsSmokeServerPage() {
  return (
    <main
      style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 32 }}
    >
      <Text variant="heading" as="h1">
        RDS 3.3.1 — smoke B (server entry)
      </Text>
      <Text variant="bodySmall">
        Apresentacionais importados apenas de <code>./server</code>; este Server
        Component NÃO deve baixar o bundle client do RDS no browser.
      </Text>

      <section data-test="badge">
        <Label>Badge</Label>
        <div style={{ display: 'flex', gap: 8 }}>
          <Badge>Default</Badge>
          <Badge>Outro</Badge>
        </div>
      </section>

      <Separator />

      <section data-test="card">
        <Label>Card (re-validated after RDS #160 fix)</Label>
        <Card
          data-test="card-static"
          aria-label="Static card from server entry"
        >
          <Text variant="heading" as="h3">
            Card from /server
          </Text>
          <Text>
            Conteúdo estático dentro do Card apresentacional, sem onClick.
          </Text>
        </Card>
      </section>

      <Separator />

      <section data-test="skeleton">
        <Label>Skeleton (referência já validada na #150)</Label>
        <Skeleton style={{ width: 240, height: 20 }} />
      </section>
    </main>
  )
}
