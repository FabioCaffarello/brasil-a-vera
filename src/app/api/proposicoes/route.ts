import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { createListProposicoesUseCase } from '@/lib/container'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const useCase = createListProposicoesUseCase()

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
      casa: searchParams.get('casa'),
      tipo: searchParams.get('tipo'),
      ano: searchParams.get('ano') ? Number(searchParams.get('ano')) : null,
      situacao: searchParams.get('situacao'),
    })
    return NextResponse.json(output)
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
