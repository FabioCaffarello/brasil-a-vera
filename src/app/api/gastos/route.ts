import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createListGastosUseCase } from '@/lib/container'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const useCase = createListGastosUseCase()

  try {
    const output = await useCase.execute({
      page: searchParams.get('page')
        ? Number(searchParams.get('page'))
        : undefined,
      perPage: searchParams.get('perPage')
        ? Number(searchParams.get('perPage'))
        : undefined,
      sort: searchParams.get('sort'),
      sortDir: (searchParams.get('sortDir') as 'asc' | 'desc') ?? undefined,
      filter: searchParams.get('filter'),
      parlamentarIdExterno: searchParams.get('parlamentar'),
    })
    return NextResponse.json(output)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
