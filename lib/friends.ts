// Client-side friends management
export interface FriendEntry {
  gameName: string
  tagLine: string
  isMe: boolean
  addedAt: string
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

export function addFriend(gameName: string, tagLine: string, isMe = false): FriendEntry[] {
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
  }
  const updated = [...friends, newEntry]
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
