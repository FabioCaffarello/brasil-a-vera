// POST /api/painel/profile/uf — Wave 10 Etapa 4.
//
// Atualiza apenas o campo UF do user_profile. Usado pelo form inline da
// sub-tab "Da minha UF" quando o usuário pulou a UF no wizard de onboarding.
// API consolidada de Perfil (Configurações → Perfil) entra na Etapa 5
// como PATCH /api/painel/profile.
//
// Body: { uf: string | null }
//   - string: deve estar em UFS (constant)
//   - null: limpa a UF (improvável neste fluxo, mas legítimo)

import { auth } from '@clerk/nextjs/server'
import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { UFS } from '@/lib/municipios'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'
import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  uf: z
    .string()
    .refine((v): v is (typeof UFS)[number] =>
      (UFS as readonly string[]).includes(v),
    )
    .nullable(),
})

export async function POST(req: Request) {
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

  await db
    .update(userProfile)
    .set({
      uf: parsed.data.uf,
      updatedAt: sql`now()`,
    })
    .where(eq(userProfile.id, internalUserId))

  return NextResponse.json({ ok: true })
}
