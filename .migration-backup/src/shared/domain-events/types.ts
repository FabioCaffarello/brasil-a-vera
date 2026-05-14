import type { TrustLevel } from '@/shared/trust'

// Na Wave 0/1/2, domain events são chamadas de função síncronas entre módulos.
// Na Wave 3+, migram para NATS JetStream com serialização JSON e delivery garantido.
export interface DomainEvent {
  id: string
  type: string
  source: string
  occurredAt: Date
  trustLevel: TrustLevel
  correlationId: string
  payload: unknown
}
