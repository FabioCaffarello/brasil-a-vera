import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    wave: 1,
    trustLevel: 'L1',
    timestamp: new Date().toISOString(),
  })
}
