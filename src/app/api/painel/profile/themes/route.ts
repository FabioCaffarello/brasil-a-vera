// POST /api/painel/profile/themes — Wave 10 Etapa 5.
//
// Substitui inteiramente a lista de temas de interesse do usuário.
// Form Temas em /painel/configuracoes envia o array final após
// cada toggle (semântica PUT/replace, não PATCH/add).
//
// Body: { themes: string[] }  (cada string ∈ TEMA_IDS)

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { TEMA_IDS } from '@/lib/constants/temas'
import {
  getOrCreateUserProfileId,
  updateUserProfileThemes,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  themes: z
    .array(
      z.string().refine((v) => (TEMA_IDS as readonly string[]).includes(v)),
    )
    .max(TEMA_IDS.length),
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

  await updateUserProfileThemes(internalUserId, parsed.data.themes)
  return NextResponse.json({ ok: true })
}
