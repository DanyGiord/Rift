import { NextResponse } from 'next/server'
import { listTrackedPuuids, recordLpSnapshot } from '@/lib/lpSnapshots'
import { getRankedEntriesByPuuid } from '@/lib/riot'
import { Division, RankedStats, Tier } from '@/lib/types'

export const dynamic = 'force-dynamic'

function authOk(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  const auth = req.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

function mapRanked(entry: any): RankedStats | null {
  if (!entry?.tier) return null
  return {
    tier: entry.tier as Tier,
    division: (entry.rank as Division) ?? null,
    lp: entry.leaguePoints ?? 0,
    wins: entry.wins ?? 0,
    losses: entry.losses ?? 0,
    hotStreak: entry.hotStreak ?? false,
    veteran: entry.veteran ?? false,
    freshBlood: entry.freshBlood ?? false,
    inactive: entry.inactive ?? false,
    miniSeriesProgress: entry.miniSeries?.progress,
    leagueName: entry.leagueName,
  }
}

export async function GET(req: Request) {
  if (!authOk(req)) return NextResponse.json({ ok: false }, { status: 401 })
  if (!process.env.RIOT_API_KEY) return NextResponse.json({ ok: false, error: 'No Riot API key' }, { status: 503 })

  const puuids = await listTrackedPuuids(150)
  const ts = Date.now()

  let ok = 0
  let fail = 0

  // Small batches to avoid bursting the Riot API too hard
  const batchSize = 5
  for (let i = 0; i < puuids.length; i += batchSize) {
    const batch = puuids.slice(i, i + batchSize)
    const results = await Promise.allSettled(
      batch.map(async puuid => {
        const entries = await getRankedEntriesByPuuid(puuid)
        const solo = entries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5') ?? null
        const flex = entries.find((e: any) => e.queueType === 'RANKED_FLEX_SR') ?? null
        await Promise.all([
          recordLpSnapshot(puuid, 'solo', mapRanked(solo), ts),
          recordLpSnapshot(puuid, 'flex', mapRanked(flex), ts),
        ])
      })
    )
    for (const r of results) {
      if (r.status === 'fulfilled') ok += 1
      else fail += 1
    }
  }

  return NextResponse.json({ ok: true, tracked: puuids.length, updated: ok, failed: fail })
}

