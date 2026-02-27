import { NextRequest, NextResponse } from 'next/server'
import { getFullPlayerData } from '@/lib/riot'
import { getLpDeltaSinceNoonUtc, recordLpSnapshot, trackPuuid } from '@/lib/lpSnapshots'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gameName = searchParams.get('gameName')
  const tagLine = searchParams.get('tagLine')

  if (!gameName || !tagLine) {
    return NextResponse.json({ error: 'Missing gameName or tagLine' }, { status: 400 })
  }
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json({ error: 'No Riot API key configured' }, { status: 503 })
  }
  const forceRefresh = searchParams.get('forceRefresh') === 'true'
  try {
    const data = await getFullPlayerData(gameName, tagLine, forceRefresh)
    if (!data) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

    // Track and record current LP so daily delta is up to date (especially on Refresh)
    trackPuuid(data.puuid).catch(() => { })
    await recordLpSnapshot(data.puuid, 'solo', data.rankedSolo ?? null)
    await recordLpSnapshot(data.puuid, 'flex', data.rankedFlex ?? null)

    // Recompute daily LP delta now that this refresh's snapshot is saved
    const deltaSinceMidnight = await getLpDeltaSinceNoonUtc(data.puuid, 'solo')
    if (deltaSinceMidnight !== null) {
      data.lpDelta24h = deltaSinceMidnight
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[player]', err?.message)
    return NextResponse.json({ error: err?.message ?? 'Riot API error' }, { status: 500 })
  }
}
