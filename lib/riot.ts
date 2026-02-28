import { Tier, Division, RankedStats, ChampionMastery, RecentMatch } from './types'
import { getLpDeltaSinceNoonUtc } from './lpSnapshots'

export const RIOT_API_KEY = process.env.RIOT_API_KEY || ''
const EUW_BASE = 'https://euw1.api.riotgames.com'
const EUROPE_BASE = 'https://europe.api.riotgames.com'

// ─── Server-side in-memory caches ──────────────────────────
type CacheEntry<T> = { data: T; ts: number }
const playerDataCache = new Map<string, CacheEntry<any>>()
const SERVER_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

const accountCache = new Map<string, CacheEntry<{ puuid: string; summonerId: string }>>()
const ACCOUNT_CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

// ─── In-memory LP snapshot for accurate daily delta ────────
// Stores the first-seen LP value per player per server session.
// Delta = currentLP - storedLP → exact, no heuristics needed.
const lpFirstSeen = new Map<string, { value: number; ts: number }>()
const LP_SNAPSHOT_WINDOW_MS = 24 * 60 * 60 * 1000 // 24h

function recordLpSnapshot(puuid: string, tierValue: number) {
  const existing = lpFirstSeen.get(puuid)
  const now = Date.now()
  // Only store the earliest snapshot within the 24h window
  if (!existing || now - existing.ts > LP_SNAPSHOT_WINDOW_MS) {
    lpFirstSeen.set(puuid, { value: tierValue, ts: now })
  }
}

function getLocalLpDelta(puuid: string, currentTierValue: number): number | null {
  const snapshot = lpFirstSeen.get(puuid)
  if (!snapshot) return null
  return currentTierValue - snapshot.value
}

export function getRankColor(tier: Tier): string {
  switch (tier) {
    case 'CHALLENGER': return '#f4c874'
    case 'GRANDMASTER': return '#cd4545'
    case 'MASTER': return '#9d48e0'
    case 'DIAMOND': return '#576bce'
    case 'EMERALD': return '#52b788'
    case 'PLATINUM': return '#4a9b8e'
    case 'GOLD': return '#c89b3c'
    case 'SILVER': return '#a0a0b0'
    case 'BRONZE': return '#a0522d'
    case 'IRON': return '#6b5344'
    default: return '#6b7280'
  }
}

export function getTierAbbr(tier: Tier, division: Division | null): string {
  const abbr: Record<Tier, string> = {
    CHALLENGER: 'C', GRANDMASTER: 'GM', MASTER: 'M',
    DIAMOND: 'D', EMERALD: 'E', PLATINUM: 'P',
    GOLD: 'G', SILVER: 'S', BRONZE: 'B', IRON: 'I', UNRANKED: '—',
  }
  const base = abbr[tier]
  if (!division || ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'UNRANKED'].includes(tier)) return base
  const divNum: Record<string, string> = { I: '1', II: '2', III: '3', IV: '4' }
  return base + divNum[division]
}

export function getTierValue(tier: Tier, division: Division | null, lp: number): number {
  if (tier === 'UNRANKED') return -1000
  const tierValues: Record<Tier, number> = {
    CHALLENGER: 2800, GRANDMASTER: 2800, MASTER: 2800,
    DIAMOND: 2400, EMERALD: 2000, PLATINUM: 1600,
    GOLD: 1200, SILVER: 800, BRONZE: 400, IRON: 0, UNRANKED: -1000,
  }
  if (['CHALLENGER', 'GRANDMASTER', 'MASTER'].includes(tier)) {
    return tierValues[tier] + lp
  }
  const divValues: Record<string, number> = { I: 300, II: 200, III: 100, IV: 0 }
  return tierValues[tier] + (division ? divValues[division] : 0) + lp
}

export function winRate(wins: number, losses: number): number {
  const total = wins + losses
  return total === 0 ? 0 : Math.round((wins / total) * 100)
}

export function formatRank(stats: RankedStats | null): string {
  if (!stats) return 'UNRANKED'
  const { tier, division, leaguePosition } = stats
  const base = division && !['CHALLENGER', 'GRANDMASTER', 'MASTER', 'UNRANKED'].includes(tier)
    ? `${tier} ${division}`
    : tier

  if (typeof leaguePosition === 'number') {
    return `${base} · #${leaguePosition}`
  }
  return base
}

export function formatLP(stats: RankedStats): string {
  const lpPart = `${stats.lp} LP`
  if (stats.miniSeriesProgress) {
    return `${lpPart} · Series ${stats.miniSeriesProgress.replace(/N/g, '–')}`
  }
  return lpPart
}

function riotFetch(url: string) {
  return fetch(url, {
    headers: { 'X-Riot-Token': RIOT_API_KEY },
    cache: 'no-store',
  })
}

const DD_TIMEOUT_MS = 5000

async function fetchWithTimeout(url: string, timeoutMs = DD_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(url, { cache: 'no-store', signal: controller.signal })
    return r
  } finally {
    clearTimeout(id)
  }
}

let _ddVer: string | null = null
async function ddVersion(): Promise<string> {
  if (_ddVer) return _ddVer
  try {
    const r = await fetchWithTimeout('https://ddragon.leagueoflegends.com/api/versions.json')
    const v: string[] = await r.json()
    _ddVer = v[0]
    return _ddVer
  } catch {
    _ddVer = '15.8.1'
    return _ddVer
  }
}

let _champMap: Record<number, string> | null = null
async function getChampMap(): Promise<Record<number, string>> {
  if (_champMap) return _champMap
  try {
    const ver = await ddVersion().catch(() => '15.8.1')
    const r = await fetchWithTimeout(`https://ddragon.leagueoflegends.com/cdn/${ver}/data/en_US/champion.json`)
    if (!r.ok) return (_champMap = {})
    const d = await r.json()
    const map: Record<number, string> = {}
    const data = d.data as Record<string, any> | undefined
    if (data && typeof data === 'object') {
      for (const v of Object.values(data)) {
        if (v && typeof v.key !== 'undefined' && v.id) map[Number(v.key)] = v.id
      }
    }
    _champMap = map
    return _champMap
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[ddragon] champion map unavailable:', (e as Error)?.message ?? e)
    }
    _champMap = {}
    return _champMap
  }
}

export async function getAccountByRiotId(gameName: string, tagLine: string) {
  const url = `${EUROPE_BASE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  const r = await riotFetch(url)
  if (!r.ok) { console.error(`[account] ${r.status}`); return null }
  return r.json()
}

export async function getSummonerByPuuid(puuid: string) {
  const r = await riotFetch(`${EUW_BASE}/lol/summoner/v4/summoners/by-puuid/${puuid}`)
  if (!r.ok) { console.error(`[summoner] ${r.status}`); return null }
  return r.json()
}

export async function getRankedStats(puuid: string, summonerId: string) {
  const r1 = await riotFetch(`${EUW_BASE}/lol/league/v4/entries/by-puuid/${puuid}`)
  if (r1.ok) return r1.json()
  console.warn(`[ranked] by-puuid ${r1.status}, fallback to by-summoner`)
  const r2 = await riotFetch(`${EUW_BASE}/lol/league/v4/entries/by-summoner/${summonerId}`)
  if (r2.ok) return r2.json()
  console.error(`[ranked] by-summoner also ${r2.status}`)
  return []
}

export async function getRankedEntriesByPuuid(puuid: string) {
  const r = await riotFetch(`${EUW_BASE}/lol/league/v4/entries/by-puuid/${puuid}`)
  if (!r.ok) return []
  return r.json()
}

/** Resolve & cache account + summoner IDs so live-game polling doesn't repeat lookups */
async function getCachedAccountIds(gameName: string, tagLine: string): Promise<{ puuid: string; summonerId: string } | null> {
  const key = `${gameName.toLowerCase()}#${tagLine.toLowerCase()}`
  const cached = accountCache.get(key)
  if (cached && Date.now() - cached.ts < ACCOUNT_CACHE_TTL_MS) return cached.data
  const account = await getAccountByRiotId(gameName, tagLine)
  if (!account) return null
  const summoner = await getSummonerByPuuid(account.puuid)
  if (!summoner) return null
  const entry = { puuid: account.puuid, summonerId: summoner.id }
  accountCache.set(key, { data: entry, ts: Date.now() })
  return entry
}

/** Lightweight check: is this player currently in an active (spectatable) game? */
export async function getActiveGameStatus(gameName: string, tagLine: string): Promise<boolean> {
  try {
    const ids = await getCachedAccountIds(gameName, tagLine)
    if (!ids) return false
    const r = await riotFetch(`${EUW_BASE}/lol/spectator/v4/active-games/by-summoner/${ids.summonerId}`)
    return r.ok
  } catch {
    return false
  }
}

export async function getApexPosition(tier: Tier, summonerId: string): Promise<number | null> {
  const urlMap: Partial<Record<Tier, string>> = {
    CHALLENGER: `${EUW_BASE}/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5`,
    GRANDMASTER: `${EUW_BASE}/lol/league/v4/grandmasterleagues/by-queue/RANKED_SOLO_5x5`,
  }
  const url = urlMap[tier]
  if (!url) return null
  try {
    const r = await riotFetch(url)
    if (!r.ok) return null
    const d = await r.json()
    const sorted = [...d.entries].sort((a: any, b: any) => b.leaguePoints - a.leaguePoints)
    const idx = sorted.findIndex((e: any) => e.summonerId === summonerId)
    return idx >= 0 ? idx + 1 : null
  } catch { return null }
}

export async function getMasteries(puuid: string, count = 3): Promise<ChampionMastery[]> {
  try {
    const r = await riotFetch(`${EUW_BASE}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=${count}`)
    if (!r.ok) { console.error(`[mastery] ${r.status}`); return [] }
    const data = await r.json()
    const [ver, champMap] = await Promise.all([
      ddVersion().catch(() => '15.8.1'),
      getChampMap().catch(() => ({}) as Record<number, string>),
    ])
    return data.map((m: any) => {
      const key = champMap[m.championId] ?? 'Unknown'
      return {
        championId: m.championId,
        championName: key,
        masteryLevel: m.championLevel,
        masteryPoints: m.championPoints,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${key}.png`,
      } as ChampionMastery
    })
  } catch (e) {
    console.error('[mastery]', e)
    return []
  }
}

const QUEUE_LABELS: Record<number, string> = {
  420: 'Ranked Solo', 440: 'Ranked Flex', 450: 'ARAM',
  400: 'Normal Draft', 430: 'Normal Blind', 700: 'Clash',
}

// Riot match API sometimes returns champion names that differ from Data Dragon image paths.
// This map normalises the known mismatches so icon URLs resolve correctly.
const CHAMPION_NAME_FIXES: Record<string, string> = {
  FiddleSticks: 'Fiddlesticks',
  // Add more if discovered
}

function normChampName(raw: string): string {
  return CHAMPION_NAME_FIXES[raw] ?? raw
}

export async function getRecentMatches(puuid: string, count = 5): Promise<RecentMatch[]> {
  try {
    const ver = await ddVersion().catch(() => '15.8.1')
    const [r1, r2] = await Promise.all([
      riotFetch(`${EUROPE_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=${count}`),
      riotFetch(`${EUROPE_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=440&start=0&count=${count}`),
    ])
    const ids1: string[] = r1.ok ? await r1.json() : []
    const ids2: string[] = r2.ok ? await r2.json() : []
    const combined = ids1.concat(ids2)
    const seen = new Set<string>()
    const allIds: string[] = []
    for (const id of combined) {
      if (!seen.has(id)) {
        seen.add(id)
        allIds.push(id)
      }
      if (allIds.length >= count) break
    }
    if (!allIds.length) return []

    const matchData = await Promise.all(
      allIds.map(async id => {
        const r = await riotFetch(`${EUROPE_BASE}/lol/match/v5/matches/${id}`)
        return r.ok ? r.json() : null
      })
    )

    return (matchData.filter(Boolean) as any[])
      .map((m: any) => {
        const p = m.info.participants.find((p: any) => p.puuid === puuid)
        if (!p) return null
        const durMin = m.info.gameDuration / 60
        const cs = p.totalMinionsKilled + p.neutralMinionsKilled
        // lpGain is exposed in match data since ~patch 14.x
        const lpChange: number | null = typeof p.lpGain === 'number' ? p.lpGain
          : typeof p.perks?.statPerks?.offense === 'number' ? null
            : null
        const champName = normChampName(p.championName ?? 'Unknown')
        return {
          championName: champName,
          championIconUrl: `https://ddragon.leagueoflegends.com/cdn/${ver}/img/champion/${champName}.png`,
          win: p.win,
          kills: p.kills, deaths: p.deaths, assists: p.assists,
          cs, csPerMin: durMin > 0 ? Math.round((cs / durMin) * 10) / 10 : 0,
          duration: m.info.gameDuration,
          queueId: m.info.queueId,
          queueLabel: QUEUE_LABELS[m.info.queueId] ?? 'Game',
          timestamp: m.info.gameEndTimestamp ?? m.info.gameStartTimestamp,
          lpChange,
        } as RecentMatch
      })
      .filter(Boolean)
      .sort((a, b) => b!.timestamp - a!.timestamp) as RecentMatch[]
  } catch (e) { console.error('[matches]', e); return [] }
}

/**
 * Approximate LP delta over the last 24 hours of solo ranked.
 *
 * We fetch solo queue (420) matches with a `startTime` of now-24h
 * and then sum LP gain per match:
 *  - use Riot's `lpGain` field when present
 *  - otherwise fall back to a simple heuristic (+18 for win, -15 for loss)
 *
 * This gives an intuitive "last 24h LP" number that roughly tracks
 * what sites like U.GG show, without needing full historical ladder data.
 */
const RATE_LIMIT_BATCH_SIZE = 5
const RATE_LIMIT_BATCH_DELAY_MS = 400

export async function getLpDelta24h(puuid: string): Promise<number | null> {
  try {
    const startTime = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000) // unix seconds
    const r = await riotFetch(
      `${EUROPE_BASE}/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&start=0&count=20&startTime=${startTime}`
    )
    if (!r.ok) return null
    const ids: string[] = await r.json()
    if (!ids.length) return 0

    // Fetch match details in small batches with delay to stay under 20 req/s
    const matchData: any[] = []
    for (let i = 0; i < ids.length; i += RATE_LIMIT_BATCH_SIZE) {
      const batch = ids.slice(i, i + RATE_LIMIT_BATCH_SIZE)
      const results = await Promise.all(
        batch.map(async (id: string) => {
          const res = await riotFetch(`${EUROPE_BASE}/lol/match/v5/matches/${id}`)
          return res.ok ? res.json() : null
        })
      )
      matchData.push(...results)
      if (i + RATE_LIMIT_BATCH_SIZE < ids.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_BATCH_DELAY_MS))
      }
    }

    let total = 0
    let hasLpData = false

    for (const m of matchData) {
      if (!m) continue
      const p = m.info.participants.find((p: any) => p.puuid === puuid)
      if (!p) continue

      // Skip remakes (games shorter than 5 minutes give/take no LP)
      if (m.info.gameDuration < 300) continue

      // Use Riot's explicit lpGain field when present; fall back to null
      if (typeof p.lpGain === 'number') {
        total += p.lpGain
        hasLpData = true
      }
    }

    return hasLpData ? total : null
  } catch (e) {
    console.error('[lpDelta24h]', e)
    return null
  }
}

export async function getFullPlayerData(gameName: string, tagLine: string, forceRefresh = false) {
  const cacheKey = `${gameName.toLowerCase()}#${tagLine.toLowerCase()}`

  // Return cached data if still fresh (unless force refresh requested)
  if (!forceRefresh) {
    const cached = playerDataCache.get(cacheKey)
    if (cached && Date.now() - cached.ts < SERVER_CACHE_TTL_MS) {
      return cached.data
    }
  }

  const account = await getAccountByRiotId(gameName, tagLine)
  if (!account) throw new Error(`Account not found: ${gameName}#${tagLine}`)

  // Also populate the account cache for live-game polling
  const summoner = await getSummonerByPuuid(account.puuid)
  if (!summoner) throw new Error(`Summoner not found for puuid: ${account.puuid}`)

  const [ranked, topChampions, recentMatches, lpDelta24h, inActiveGame] = await Promise.all([
    getRankedStats(account.puuid, summoner.id),
    getMasteries(account.puuid, 3),
    getRecentMatches(account.puuid, 5),
    getLpDelta24h(account.puuid),
    (async () => {
      try {
        const r = await riotFetch(`${EUW_BASE}/lol/spectator/v4/active-games/by-summoner/${summoner.id}`)
        return r.ok
      } catch {
        return false
      }
    })(),
  ])

  const soloQ = ranked.find((r: any) => r.queueType === 'RANKED_SOLO_5x5') ?? null
  const flexQ = ranked.find((r: any) => r.queueType === 'RANKED_FLEX_SR') ?? null

  // ─── Accurate LP delta via snapshot comparison ───────────
  // getTierValue gives a single numeric score (tier+division+LP).
  // We store the first-seen value and compute delta = current − stored.
  let computedLpDelta: number | null = lpDelta24h
  if (soloQ) {
    const currentValue = getTierValue(soloQ.tier as Tier, soloQ.rank as Division, soloQ.leaguePoints)
    const snapshotDelta = getLocalLpDelta(account.puuid, currentValue)
    if (snapshotDelta !== null) {
      computedLpDelta = snapshotDelta
    }
    recordLpSnapshot(account.puuid, currentValue)
  }

  let soloPos: number | null = null
  if (soloQ && ['CHALLENGER', 'GRANDMASTER'].includes(soloQ.tier)) {
    soloPos = await getApexPosition(soloQ.tier as Tier, summoner.id)
  }

  const mapRanked = (e: any, pos?: number | null): RankedStats | null => {
    if (!e) return null
    return {
      tier: e.tier as Tier,
      division: e.rank as Division,
      lp: e.leaguePoints,
      wins: e.wins, losses: e.losses,
      hotStreak: e.hotStreak ?? false,
      veteran: e.veteran ?? false,
      freshBlood: e.freshBlood ?? false,
      inactive: e.inactive ?? false,
      miniSeriesProgress: e.miniSeries?.progress,
      leaguePosition: pos ?? undefined,
      leagueName: e.leagueName,
    }
  }

  // Populate account cache for live-game polling
  accountCache.set(cacheKey, {
    data: { puuid: account.puuid, summonerId: summoner.id },
    ts: Date.now(),
  })

  const result = {
    puuid: account.puuid,
    summonerName: gameName,
    tagline: tagLine,
    profileIconId: summoner.profileIconId,
    summonerLevel: summoner.summonerLevel,
    rankedSolo: mapRanked(soloQ, soloPos),
    rankedFlex: mapRanked(flexQ),
    topChampions,
    recentMatches,
    lpDelta24h: computedLpDelta,
    inActiveGame: inActiveGame ?? false,
    lastUpdated: new Date().toISOString(),
  }

  // Cache the result server-side
  playerDataCache.set(cacheKey, { data: result, ts: Date.now() })

  return result
}
