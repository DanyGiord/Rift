import { NextRequest, NextResponse } from 'next/server'
import { getFullPlayerData } from '@/lib/riot'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gameName = searchParams.get('gameName')
  const tagLine  = searchParams.get('tagLine')

  if (!gameName || !tagLine) {
    return NextResponse.json({ error: 'Missing gameName or tagLine' }, { status: 400 })
  }
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json({ error: 'No Riot API key configured' }, { status: 503 })
  }
  try {
    const data = await getFullPlayerData(gameName, tagLine)
    if (!data) return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[player]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Riot API error' }, { status: 500 })
  }
}
