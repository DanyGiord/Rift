import { NextRequest, NextResponse } from 'next/server'
import { getFullPlayerData } from '@/lib/riot'
import { recordLpSnapshot, trackPuuid } from '@/lib/lpSnapshots'

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

    // Best-effort: track & snapshot this player for accurate LP deltas
    trackPuuid(data.puuid).catch(() => {})
    recordLpSnapshot(data.puuid, 'solo', data.rankedSolo ?? null).catch(() => {})
    recordLpSnapshot(data.puuid, 'flex', data.rankedFlex ?? null).catch(() => {})

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[player]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Riot API error' }, { status: 500 })
  }
}
