import { NextResponse } from 'next/server'
import { createGetProposicaoUseCase } from '@/lib/container'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const useCase = createGetProposicaoUseCase()

  try {
    const output = await useCase.execute({ id })
    return NextResponse.json(output)
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
