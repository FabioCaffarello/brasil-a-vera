// API de follows — Wave 10 Etapa 2 (+ batch na Etapa 4).
//
// POST   /api/painel/follows  { parlamentarId }                  → adiciona
// DELETE /api/painel/follows  { parlamentarId }                  → remove
// DELETE /api/painel/follows  { parlamentarIds: string[] }       → remove batch (Etapa 4)
//
// Middleware (createRouteMatcher `/api/painel(.*)`) já força auth via
// auth.protect() — chegamos aqui apenas autenticados. Defense in depth:
// chamamos `auth()` e validamos `userId` antes de qualquer query.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import {
  addFollow,
  FOLLOWS_CAP_PER_USER,
  removeFollow,
  removeFollowsBatch,
} from '@/lib/queries/follows'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

// UUIDv7 dos parlamentares — string UUID. Zod valida formato.
const singleSchema = z.object({
  parlamentarId: z.string().uuid(),
})

const batchSchema = z.object({
  parlamentarIds: z.array(z.string().uuid()).min(1).max(200),
})

const deleteBodySchema = z.union([singleSchema, batchSchema])

async function parseSingleBody(req: Request) {
  try {
    const json = await req.json()
    return singleSchema.safeParse(json)
  } catch {
    return {
      success: false as const,
      error: { message: 'Body inválido (JSON malformado)' },
    }
  }
}

async function parseDeleteBody(req: Request) {
  try {
    const json = await req.json()
    return deleteBodySchema.safeParse(json)
  } catch {
    return {
      success: false as const,
      error: { message: 'Body inválido (JSON malformado)' },
    }
  }
}

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const parsed = await parseSingleBody(req)
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

  const result = await addFollow(internalUserId, parsed.data.parlamentarId)
  if (!result.ok) {
    return NextResponse.json(
      { error: 'cap_exceeded', cap: FOLLOWS_CAP_PER_USER },
      { status: 422 },
    )
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const parsed = await parseDeleteBody(req)
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

  if ('parlamentarIds' in parsed.data) {
    await removeFollowsBatch(internalUserId, parsed.data.parlamentarIds)
    return NextResponse.json({
      ok: true,
      removed: parsed.data.parlamentarIds.length,
    })
  }

  await removeFollow(internalUserId, parsed.data.parlamentarId)
  return NextResponse.json({ ok: true })
}
