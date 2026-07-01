import { auth } from '@clerk/nextjs/server'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { getFollowsByUserId } from '@/lib/queries/follows'
import type { listParlamentaresPaginado } from '@/lib/queries/parlamentares'
import { getOrCreateUserProfileId } from '@/lib/queries/user-profile'

type ParlamentarRow = Awaited<
  ReturnType<typeof listParlamentaresPaginado>
>['rows'][number]

export async function FollowIsland({
  parlamentares,
}: {
  parlamentares: ParlamentarRow[]
}) {
  const { userId: clerkUserId } = await auth()

  let followingIds = new Set<string>()
  if (clerkUserId) {
    const internalUserId = await getOrCreateUserProfileId(clerkUserId)
    if (internalUserId) {
      followingIds = await getFollowsByUserId(internalUserId)
    }
  }

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {parlamentares.map((p, i) => (
        <li key={p.id}>
          <ParlamentarCard
            follow={
              clerkUserId ? { isFollowing: followingIds.has(p.id) } : undefined
            }
            parlamentar={p}
            priority={i < 3}
          />
        </li>
      ))}
    </ul>
  )
}
