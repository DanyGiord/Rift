import { Division, RankedStats, Tier } from './types'

type QueueKey = 'solo' | 'flex'

type LpSnapshot = {
  ts: number
  tier: Tier
  division: Division | null
  lp: number
  value: number
}

function tierValue(tier: Tier, division: Division | null, lp: number): number {
  const tierValues: Record<Tier, number> = {
    CHALLENGER: 9000, GRANDMASTER: 8000, MASTER: 7000,
    DIAMOND: 6000, EMERALD: 5000, PLATINUM: 4000,
    GOLD: 3000, SILVER: 2000, BRONZE: 1000, IRON: 0, UNRANKED: -1000,
  }
  const divValues: Record<string, number> = { I: 400, II: 300, III: 200, IV: 100 }
  return tierValues[tier] + (division ? divValues[division] : 0) + lp
}

function kvConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

let _kv: any | null = null
async function getKv() {
  if (!kvConfigured()) return null
  if (_kv) return _kv
  const mod = await import('@vercel/kv')
  _kv = mod.kv
  return _kv
}

function snapshotKey(puuid: string, queue: QueueKey) {
  return `lp:snap:${queue}:${puuid}`
}

export async function trackPuuid(puuid: string) {
  const kv = await getKv()
  if (!kv) return
  await kv.sadd('tracked:puuids', puuid)
}

export async function recordLpSnapshot(puuid: string, queue: QueueKey, stats: RankedStats | null, ts = Date.now()) {
  const kv = await getKv()
  if (!kv) return

  const snap: LpSnapshot = stats
    ? {
        ts,
        tier: stats.tier,
        division: stats.division,
        lp: stats.lp,
        value: tierValue(stats.tier, stats.division, stats.lp),
      }
    : {
        ts,
        tier: 'UNRANKED',
        division: null,
        lp: 0,
        value: tierValue('UNRANKED', null, 0),
      }

  const key = snapshotKey(puuid, queue)
  await kv.lpush(key, JSON.stringify(snap))
  // keep ~3 days if running every 20 minutes: 3*24*3=216 entries
  await kv.ltrim(key, 0, 250)
}

// Anchor for daily LP delta: start of current UTC day (00:00 → 24:00)
export function noonAnchorUtcMs(now = new Date()): number {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
}

export async function getLpDeltaSinceNoonUtc(puuid: string, queue: QueueKey): Promise<number | null> {
  const kv = await getKv()
  if (!kv) return null

  const anchor = noonAnchorUtcMs()
  const raw: string[] = await kv.lrange(snapshotKey(puuid, queue), 0, 250)
  if (!raw?.length) return 0

  const snaps: LpSnapshot[] = raw
    .map(s => {
      try { return JSON.parse(s) as LpSnapshot } catch { return null }
    })
    .filter(Boolean) as LpSnapshot[]

  const inWindow = snaps.filter(s => s.ts >= anchor)
  if (!inWindow.length) return 0

  let latest = inWindow[0]
  let earliest = inWindow[0]
  for (const s of inWindow) {
    if (s.ts > latest.ts) latest = s
    if (s.ts < earliest.ts) earliest = s
  }
  return latest.value - earliest.value
}

export async function listTrackedPuuids(limit = 200): Promise<string[]> {
  const kv = await getKv()
  if (!kv) return []
  const members: string[] = await kv.smembers('tracked:puuids')
  return (members ?? []).slice(0, limit)
}

