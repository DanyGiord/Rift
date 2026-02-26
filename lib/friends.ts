// Client-side friends management
export interface FriendEntry {
  gameName: string
  tagLine: string
  isMe: boolean
  addedAt: string
  nickname?: string
}

const STORAGE_KEY = 'lol_friends_list'

export function getFriends(): FriendEntry[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function saveFriends(friends: FriendEntry[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(friends))
}

export function addFriend(gameName: string, tagLine: string, isMe = false, nickname?: string): FriendEntry[] {
  const friends = getFriends()
  const exists = friends.some(f => 
    f.gameName.toLowerCase() === gameName.toLowerCase() && 
    f.tagLine.toLowerCase() === tagLine.toLowerCase()
  )
  if (exists) return friends
  
  if (isMe) {
    // Clear previous "me" flag
    friends.forEach(f => { f.isMe = false })
  }
  
  const newEntry: FriendEntry = {
    gameName,
    tagLine,
    isMe,
    addedAt: new Date().toISOString(),
    ...(nickname?.trim() && { nickname: nickname.trim() }),
  }
  const updated = [...friends, newEntry]
  saveFriends(updated)
  return updated
}

export function updateFriendNickname(gameName: string, tagLine: string, nickname: string): FriendEntry[] {
  const friends = getFriends()
  const key = (g: string, t: string) => `${g.toLowerCase()}#${t.toLowerCase()}`
  const target = key(gameName, tagLine)
  const updated = friends.map(f =>
    key(f.gameName, f.tagLine) === target
      ? { ...f, nickname: nickname.trim() || undefined }
      : f
  )
  saveFriends(updated)
  return updated
}

export function removeFriend(gameName: string, tagLine: string): FriendEntry[] {
  const friends = getFriends()
  const updated = friends.filter(f => 
    !(f.gameName.toLowerCase() === gameName.toLowerCase() && 
      f.tagLine.toLowerCase() === tagLine.toLowerCase())
  )
  saveFriends(updated)
  return updated
}

// --- Sharing helpers ---

function encodeForShare(str: string): string {
  if (typeof window === 'undefined') return ''
  // Preserve unicode characters by encoding as UTF-8 first
  return window.btoa(unescape(encodeURIComponent(str)))
}

function decodeFromShare(encoded: string): string {
  if (typeof window === 'undefined') return ''
  return decodeURIComponent(escape(window.atob(encoded)))
}

/**
 * Build a compact string representing the friend list, suitable for use
 * as a URL query param (e.g. ?friends=...).
 */
export function buildFriendsShareToken(friends: FriendEntry[]): string | null {
  if (!friends.length || typeof window === 'undefined') return null
  const minimal = friends.map(f => ({
    g: f.gameName,
    t: f.tagLine,
    m: f.isMe ? 1 : 0,
    ...(f.nickname?.trim() && { n: f.nickname.trim() }),
  }))
  try {
    const json = JSON.stringify(minimal)
    return encodeForShare(json)
  } catch {
    return null
  }
}

/**
 * Merge friends from a shared token into local storage, avoiding duplicates.
 * Returns the updated list that was saved.
 */
export function mergeFriendsFromShareToken(token: string): FriendEntry[] {
  if (!token || typeof window === 'undefined') return getFriends()

  let decoded: Array<{ g: string; t: string; m?: number; n?: string }> = []
  try {
    const json = decodeFromShare(token)
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) {
      decoded = parsed.filter(
        (e: any) => typeof e?.g === 'string' && typeof e?.t === 'string'
      )
    }
  } catch {
    return getFriends()
  }

  if (!decoded.length) return getFriends()

  const existing = getFriends()
  const byKey = new Map<string, FriendEntry>()

  const makeKey = (g: string, t: string) => `${g.toLowerCase()}#${t.toLowerCase()}`

  // Seed with existing friends
  for (const f of existing) {
    byKey.set(makeKey(f.gameName, f.tagLine), { ...f })
  }

  // Apply shared entries
  let anyIsMe = existing.some(f => f.isMe)
  for (const e of decoded) {
    const key = makeKey(e.g, e.t)
    const isMe = e.m === 1

    if (isMe) {
      // Clear previous "me" flags; this shared list defines the current owner
      anyIsMe = true
      for (const v of Array.from(byKey.values())) {
        v.isMe = false
      }
    }

    const current = byKey.get(key)
    if (current) {
      // Merge flags and nickname, keep earliest addedAt
      current.isMe = current.isMe || isMe
      if (e.n !== undefined) current.nickname = e.n || undefined
      continue
    }

    byKey.set(key, {
      gameName: e.g,
      tagLine: e.t,
      isMe,
      addedAt: new Date().toISOString(),
      ...(e.n && { nickname: e.n }),
    })
  }

  // Ensure at most one "me"
  if (anyIsMe) {
    let firstMeKey: string | null = null
    for (const [key, value] of Array.from(byKey.entries())) {
      if (value.isMe) {
        if (!firstMeKey) {
          firstMeKey = key
        } else {
          value.isMe = false
        }
      }
    }
  }

  const updated = Array.from(byKey.values())
  saveFriends(updated)
  return updated
}
