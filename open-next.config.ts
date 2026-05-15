import { defineCloudflareConfig } from '@opennextjs/cloudflare'

// Config mínima para Wave 0: sem incremental cache (ISR usa per-instance),
// sem image optimization (não usamos), sem cache R2 (TODO Wave 1+).
//
// `default.minify: true` foi tentado na Sprint 4.1 PR 3 mas quebra a
// compilação de `@vercel/og/index.edge.js` (esbuild minifySyntax falha
// em `export { ImageResponse }` sem declaração local — file pre-bundled
// pelo Next). Bundle size mantido via outras vias (ver ADR-022 §3 v3).
export default defineCloudflareConfig({})
