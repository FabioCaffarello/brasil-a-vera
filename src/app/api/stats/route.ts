import { NextResponse } from 'next/server'

import {
  ADMIN_KEY_HEADER,
  checkAdminKey,
  getExpectedAdminKey,
} from '@/lib/admin-auth'
import { getDbStats } from '@/lib/queries/stats'

export const dynamic = 'force-dynamic'

const NO_CACHE_HEADERS = {
  'cache-control': 'no-store, no-cache, must-revalidate',
}

export async function GET(request: Request) {
  const expected = getExpectedAdminKey()
  if (!expected) {
    return NextResponse.json(
      { error: 'admin-not-configured' },
      { status: 503, headers: NO_CACHE_HEADERS },
    )
  }

  const auth = checkAdminKey(request.headers.get(ADMIN_KEY_HEADER), expected)
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason },
      { status: 401, headers: NO_CACHE_HEADERS },
    )
  }

  try {
    const stats = await getDbStats()
    return NextResponse.json(
      { timestamp: new Date().toISOString(), ...stats },
      { headers: NO_CACHE_HEADERS },
    )
  } catch (err) {
    console.error(
      JSON.stringify({
        event: 'api_stats_failed',
        message: err instanceof Error ? err.message : String(err),
      }),
    )
    return NextResponse.json(
      { error: 'internal' },
      { status: 500, headers: NO_CACHE_HEADERS },
    )
  }
}
