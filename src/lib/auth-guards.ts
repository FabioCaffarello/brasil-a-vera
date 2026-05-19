import { auth } from '@clerk/nextjs/server'

/**
 * Guards de autorização baseados no Clerk para uso em Server Components.
 *
 * Diferente de `admin-auth.ts` (validação de token administrativo via
 * header `x-admin-key` para crons e operações elevadas), este módulo
 * cobre gating de funcionalidades para usuários autenticados via Clerk.
 *
 * Server-only: `auth()` de `@clerk/nextjs/server` depende do
 * `clerkMiddleware()` ter rodado. NÃO chamar de Client Component
 * (usar conditional rendering via prop derivada do Server Component).
 */

/**
 * Princípio Wave 10 Hotfix 10.2:
 *
 * > Toda funcionalidade que produz saída de dados em massa (export,
 * > download, geração de relatório) exige autenticação prévia.
 *
 * Aplicado em todas as rotas que renderizam `<ExportCsvLink>`. Tradeoff
 * aceito: anônimo não vê o botão (sem cadeado, sem disabled, sem
 * tooltip) — coerente com a decisão para o `FollowButton` no Hotfix 10.1.
 *
 * TODO (pós-Wave 10): se o princípio se confirmar em mais funcionalidades
 * (PDF, bulk JSON, reports), promover a ADR formal.
 *
 * @returns `true` se há usuário Clerk autenticado, `false` se anônimo.
 */
export async function canExport(): Promise<boolean> {
  const { userId } = await auth()
  return userId !== null
}
