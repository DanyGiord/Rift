import { Player } from './types'

const CACHE_KEY_PREFIX = 'lol_player_cache:'
const TTL_MS = 5 * 60 * 1000 // 5 minutes – use cached data to save API calls

type CachedEntry = { data: Player; fetchedAt: number }

function cacheKey(key: string): string {
  return CACHE_KEY_PREFIX + key.toLowerCase()
}

export function getCachedPlayer(key: string): Player | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(cacheKey(key))
    if (!raw) return null
    const { data, fetchedAt }: CachedEntry = JSON.parse(raw)
    if (!data || typeof fetchedAt !== 'number') return null
    if (Date.now() - fetchedAt > TTL_MS) return null
    return data as Player
  } catch {
    return null
  }
}

export function setCachedPlayer(key: string, data: Player): void {
  if (typeof window === 'undefined') return
  try {
    const entry: CachedEntry = { data, fetchedAt: Date.now() }
    localStorage.setItem(cacheKey(key), JSON.stringify(entry))
  } catch {
    // ignore quota / parse errors
  }
}

export function clearCachedPlayer(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(cacheKey(key))
  } catch {}
}
