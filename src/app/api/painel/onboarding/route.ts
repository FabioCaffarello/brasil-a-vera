// POST /api/painel/onboarding — commit do wizard (Wave 10 Etapa 3).
//
// Body: { uf: string | null, themes: string[], topics: TopicSelection | null }
//
// Atômico do ponto de vista do usuário: persiste UF + temas em
// user_profile, escreve alert_policy com os topics, marca onboarded_at.
// Se topics for null (pulou passo 3), aplica defaults seletivos do
// SKIP_ALL_TOPIC_DEFAULTS. Demais campos da alert_policy (cadence,
// canais, boosts) ficam nos defaults declarados no schema.
//
// Não usamos transação Drizzle — `neon-http` driver não suporta. Os 2
// writes são idempotentes (UPDATE user_profile + upsert alert_policy);
// se a request falhar entre eles, retry resolve.

import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { TEMA_IDS } from '@/lib/constants/temas'
import { UFS } from '@/lib/municipios'
import {
  SKIP_ALL_TOPIC_DEFAULTS,
  upsertAlertPolicyTopics,
} from '@/lib/queries/alert-policy'
import {
  commitOnboarding,
  getOrCreateUserProfileId,
} from '@/lib/queries/user-profile'

export const dynamic = 'force-dynamic'

const topicsSchema = z.object({
  topicVotacoes: z.boolean(),
  topicGastos: z.boolean(),
  topicProposicoes: z.boolean(),
  topicDiscursos: z.boolean(),
  topicDivergencias: z.boolean(),
})

const bodySchema = z.object({
  uf: z
    .string()
    .refine((v): v is (typeof UFS)[number] =>
      (UFS as readonly string[]).includes(v),
    )
    .nullable(),
  themes: z
    .array(
      z.string().refine((v) => (TEMA_IDS as readonly string[]).includes(v)),
    )
    .max(TEMA_IDS.length),
  // null = pulou passo 3 → aplica SKIP_ALL_TOPIC_DEFAULTS.
  topics: topicsSchema.nullable(),
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

  // Ordem: alert_policy primeiro (não muda visibilidade no /painel ainda);
  // depois commitOnboarding (marca onboarded_at → muda estado de
  // onboarding-wizard para novo/onboarding/maduro).
  await upsertAlertPolicyTopics(
    internalUserId,
    parsed.data.topics ?? SKIP_ALL_TOPIC_DEFAULTS,
  )
  await commitOnboarding(internalUserId, {
    uf: parsed.data.uf,
    themes: parsed.data.themes,
  })

  // CTA pós-wizard (LOGGED-AREA-VISION §5.6): redirect para listagem
  // com tab de UF se preenchida, senão acompanhando.
  const redirectTo = parsed.data.uf
    ? `/parlamentares?uf=${parsed.data.uf}`
    : '/parlamentares'

  return NextResponse.json({ ok: true, redirectTo })
}
