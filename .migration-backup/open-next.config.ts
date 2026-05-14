import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Config mínima para Wave 0: sem incremental cache (ISR usa per-instance),
// sem image optimization (não usamos), sem cache R2 (TODO Wave 1+).
export default defineCloudflareConfig({})
