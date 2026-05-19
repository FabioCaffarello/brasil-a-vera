// PATCH /api/painel/profile — Wave 10 Etapa 5.
//
// Atualiza displayName E/OU UF do user_profile. Cada campo é opcional;
// só atualiza os enviados (UPDATE parcial). Decisão A do plano da
// Etapa 5: Clerk = source of truth para nome, então atualizamos via
// clerkClient.users.updateUser em paralelo ao banco local.
//
// Body (campos opcionais):
//   {
//     displayName?: string | null,
//     uf?: string | null,
//   }
//
// `displayName === null` significa "limpar nome" (Clerk aceita firstName=null).
// `uf === null` significa "limpar UF".

import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { UFS } from '@/lib/municipios'
import {
  getOrCreateUserProfileId,
  updateUserProfileBasic,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  displayName: z
    .string()
    .max(120)
    .transform((s) => s.trim())
    .nullable()
    .optional(),
  uf: z
    .string()
    .refine((v): v is (typeof UFS)[number] =>
      (UFS as readonly string[]).includes(v),
    )
    .nullable()
    .optional(),
})

/**
 * Reparte um display_name em first_name/last_name para o Clerk.
 * Primeiro espaço é o split — Clerk não tem "full name" único.
 */
function splitDisplayName(displayName: string): {
  firstName: string
  lastName: string
} {
  const trimmed = displayName.trim()
  const idx = trimmed.indexOf(' ')
  if (idx === -1) return { firstName: trimmed, lastName: '' }
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim(),
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  let json: unknown
  try {
    json = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', detail: parsed.error.message },
      { status: 400 },
    )
  }

  const internalUserId = await getOrCreateUserProfileId(userId)
  if (!internalUserId) {
    return NextResponse.json({ error: 'profile_unavailable' }, { status: 500 })
  }

  // Clerk como source of truth para nome (ADR-029 § + Decisão A
  // Etapa 5). Atualizamos lá antes do banco — se Clerk falhar, banco
  // ainda reflete estado consistente com o de auth.
  //
  // Zod com `.optional().nullable()` deixa o tipo como
  // `string | null | undefined`. Inline `!== undefined` para o TS
  // narrow corretamente dentro do bloco.
  const dn = parsed.data.displayName
  if (dn !== undefined) {
    try {
      const clerk = await clerkClient()
      if (dn === null || dn === '') {
        await clerk.users.updateUser(userId, { firstName: '', lastName: '' })
      } else {
        const { firstName, lastName } = splitDisplayName(dn)
        await clerk.users.updateUser(userId, { firstName, lastName })
      }
    } catch (err) {
      console.error('[profile.PATCH] Clerk updateUser falhou:', err)
      return NextResponse.json(
        { error: 'clerk_update_failed' },
        { status: 502 },
      )
    }
  }

  const ufValue = parsed.data.uf

  await updateUserProfileBasic(internalUserId, {
    ...(dn !== undefined ? { displayName: dn || null } : {}),
    ...(ufValue !== undefined ? { uf: ufValue ?? null } : {}),
  })

  return NextResponse.json({ ok: true })
}
