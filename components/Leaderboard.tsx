'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Player } from '@/lib/types'
import { getTierValue } from '@/lib/riot'
import {
  getFriends,
  addFriend,
  removeFriend,
  FriendEntry,
  buildFriendsShareToken,
  mergeFriendsFromShareToken,
} from '@/lib/friends'
import { PlayerCard } from './PlayerCard'
import { AddPlayerModal } from './AddPlayerModal'

type QueueType = 'solo' | 'flex'

interface PlayerWithMeta extends Player {
  rank: number
  loading?: boolean
}

async function fetchPlayer(gameName: string, tagLine: string): Promise<Player | null> {
  const res = await fetch(`/api/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`)
  if (!res.ok) return null
  return res.json()
}

function sortPlayers(players: Player[], queueType: QueueType): Player[] {
  return [...players].sort((a, b) => {
    const sa = queueType === 'solo' ? a.rankedSolo : a.rankedFlex
    const sb = queueType === 'solo' ? b.rankedSolo : b.rankedFlex
    const va = sa ? getTierValue(sa.tier, sa.division, sa.lp) : -9999
    const vb = sb ? getTierValue(sb.tier, sb.division, sb.lp) : -9999
    return vb - va
  })
}

export function Leaderboard() {
  const [players, setPlayers] = useState<Map<string, Player>>(new Map())
  const [friends, setFriends] = useState<FriendEntry[]>([])
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set())
  const [queueType, setQueueType] = useState<QueueType>('solo')
  const [showModal, setShowModal] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [noApiKey, setNoApiKey] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const playerKey = (gameName: string, tagLine: string) =>
    `${gameName.toLowerCase()}#${tagLine.toLowerCase()}`

  const loadPlayer = useCallback(async (gameName: string, tagLine: string, isMe: boolean) => {
    const key = playerKey(gameName, tagLine)
    setLoadingKeys(prev => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
    try {
      const res = await fetch(`/api/player?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`)
      if (res.status === 503) { setNoApiKey(true); return }
      if (!res.ok) return
      const data: Player = await res.json()
      setPlayers(prev => new Map(prev).set(key, { ...data, isMe }))
    } catch {}
    finally {
      setLoadingKeys(prev => { const n = new Set(prev); n.delete(key); return n })
    }
  }, [])

  useEffect(() => {
    let stored = getFriends()

    // If the URL contains a shared friends token, merge it into local storage
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        const token = url.searchParams.get('friends')
        if (token) {
          stored = mergeFriendsFromShareToken(token)
        }
      } catch {
        // ignore parsing errors and fall back to local storage only
      }
    }

    setFriends(stored)
    ;(async () => {
      const concurrency = 3
      for (let i = 0; i < stored.length; i += concurrency) {
        const batch = stored.slice(i, i + concurrency)
        await Promise.all(batch.map(f => loadPlayer(f.gameName, f.tagLine, f.isMe)))
      }
    })()
  }, [loadPlayer])

  const handleAdd = async (gameName: string, tagLine: string, isMe: boolean) => {
    const updated = addFriend(gameName, tagLine, isMe)
    setFriends(updated)
    if (isMe) {
      setPlayers(prev => {
        const next = new Map(prev)
        next.forEach((p, k) => { next.set(k, { ...p, isMe: false }) })
        return next
      })
    }
    await loadPlayer(gameName, tagLine, isMe)
  }

  const handleRemove = (gameName: string, tagLine: string) => {
    setFriends(removeFriend(gameName, tagLine))
    setPlayers(prev => { const n = new Map(prev); n.delete(playerKey(gameName, tagLine)); return n })
  }

  const handleRefreshAll = useCallback(async () => {
    if (refreshing || !friends.length) return
    setRefreshing(true)
    setPlayers(new Map())
    await Promise.all(friends.map(f => loadPlayer(f.gameName, f.tagLine, f.isMe)))
    setRefreshing(false)
  }, [friends, loadPlayer, refreshing])

  const handleShare = useCallback(async () => {
    if (!friends.length || typeof window === 'undefined') return
    const token = buildFriendsShareToken(friends)
    if (!token) return
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('friends', token)
      const shareUrl = url.toString()
      await navigator.clipboard.writeText(shareUrl)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch {
      // best-effort only
    }
  }, [friends])

  const emptyPlayer = (f: FriendEntry): Player => ({
    id: playerKey(f.gameName, f.tagLine),
    puuid: '',
    summonerName: f.gameName,
    tagline: f.tagLine,
    profileIconId: 29,
    summonerLevel: 0,
    rankedSolo: null,
    rankedFlex: null,
    topChampions: [],
    recentMatches: [],
    lpDelta24h: null,
    isMe: f.isMe,
  })

  const allEntries: PlayerWithMeta[] = useMemo(() => {
    const playerList = friends.map(f => {
      const key = playerKey(f.gameName, f.tagLine)
      return players.get(key) || emptyPlayer(f)
    })

    const sorted = sortPlayers(
      playerList.filter(p => !loadingKeys.has(playerKey(p.summonerName, p.tagline))),
      queueType
    )

    const loadingPlayers = friends
      .filter(f => loadingKeys.has(playerKey(f.gameName, f.tagLine)))
      .map(f => ({ ...emptyPlayer(f), loading: true, rank: 999 }))

    return [
      ...sorted.map((p, i) => ({ ...p, rank: i + 1 })),
      ...loadingPlayers,
    ]
  }, [friends, players, loadingKeys, queueType])

  // Auto-refresh every 5 minutes to keep data up to date
  useEffect(() => {
    if (!friends.length) return
    const interval = setInterval(() => {
      void handleRefreshAll()
    }, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [friends.length, handleRefreshAll])

  return (
    <div className="min-h-screen hex-bg relative">
      {/* Header */}
      <header className="relative border-b border-[#1e2d40]" style={{ background: 'linear-gradient(180deg, #091522 0%, #010a13 100%)' }}>
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 50% -20%, #c89b3c18 0%, transparent 65%)' }} />
        <div className="relative max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-px bg-[#c89b3c]" />
                <span className="text-[#c89b3c] text-[10px] font-display tracking-[0.4em] uppercase">EUW Server</span>
                <div className="w-5 h-px bg-[#c89b3c]" />
              </div>
              <h1 className="font-display text-2xl md:text-3xl font-black text-[#e8d8b8] tracking-wide">
                Friends Leaderboard
              </h1>
              <p className="text-gray-600 text-xs font-body mt-0.5">{friends.length} player{friends.length !== 1 ? 's' : ''} tracked</p>
            </div>
            <div className="flex items-center gap-2">
              {friends.length > 0 && (
                <>
                  <button
                    onClick={handleRefreshAll}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#1e2d40] text-gray-500 text-xs font-body hover:border-[#c89b3c]/40 hover:text-[#c8aa6e] transition-all"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className={refreshing ? 'animate-spin' : ''}
                    >
                      <path
                        d="M23 4v6h-6M1 20v-6h6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1.5 px-3 py-2 rounded border border-[#1e2d40] text-gray-500 text-xs font-body hover:border-[#c89b3c]/40 hover:text-[#c8aa6e] transition-all"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16 6l-4-4-4 4M12 2v13"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {shareCopied ? 'Link copied' : 'Share'}
                  </button>
                </>
              )}

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded font-display font-bold text-xs tracking-wider transition-all hover:brightness-110"
                style={{ background: 'linear-gradient(135deg, #c89b3c, #a57c2e)', color: '#010a13' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                ADD PLAYER
              </button>
            </div>
          </div>

          {/* Queue toggle */}
          {friends.length > 0 && (
            <div className="flex items-center gap-1 mt-4 bg-[#010a13]/80 rounded border border-[#1e2d40] p-0.5 w-fit">
              {(['solo', 'flex'] as QueueType[]).map(q => (
                <button key={q} onClick={() => setQueueType(q)}
                  className={`px-4 py-1.5 rounded text-[10px] font-display font-bold tracking-[0.2em] uppercase transition-all ${
                    queueType === q ? 'text-[#010a13]' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={queueType === q ? { background: 'linear-gradient(135deg, #c89b3c, #a57c2e)' } : {}}>
                  {q === 'solo' ? 'Solo/Duo' : 'Flex'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6">
        {noApiKey && (
          <div className="mb-5 p-4 rounded-lg border border-yellow-600/30 bg-yellow-600/8">
            <div className="text-yellow-400 font-bold font-display text-xs tracking-wider">⚠ RIOT API KEY NOT SET</div>
            <p className="text-yellow-600/80 text-xs mt-1 font-body">
              Set <code className="bg-black/30 px-1 rounded">RIOT_API_KEY</code> in <code className="bg-black/30 px-1 rounded">.env.local</code> →
              get a free key at <a href="https://developer.riotgames.com" target="_blank" rel="noreferrer" className="text-yellow-500 underline">developer.riotgames.com</a>
            </p>
          </div>
        )}

        {allEntries.length === 0 && loadingKeys.size === 0 && (
          <div className="text-center py-24 select-none">
            <div className="text-5xl mb-5 opacity-20">⚔️</div>
            <h2 className="font-display text-lg text-[#c8aa6e] mb-1">No players tracked yet</h2>
            <p className="text-gray-600 font-body text-sm mb-8">Add yourself and your friends to start</p>
            <button onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded font-display font-bold text-xs tracking-wider hover:brightness-110 transition-all"
              style={{ background: 'linear-gradient(135deg, #c89b3c, #a57c2e)', color: '#010a13' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              ADD FIRST PLAYER
            </button>
          </div>
        )}

        {/* Column headers */}
        {allEntries.length > 0 && (
          <div className="flex items-center pl-1 pr-3 mb-1.5 text-[9px] font-display tracking-[0.25em] uppercase text-gray-600">
            <div className="w-12 text-center">Rank</div>
            <div className="w-10 mr-3" />
            <div className="w-40 mr-4">Summoner</div>
            <div className="hidden md:block w-52 mr-4">Rank · 24 Hours</div>
            <div className="hidden lg:flex flex-1 mr-6 max-w-56">Winrate</div>
            <div className="hidden lg:block w-24 mr-3">Top 3</div>
            <div className="hidden xl:block w-28">Last 5</div>
            <div className="w-8 ml-auto" />
          </div>
        )}

        <div className="space-y-1.5">
          {allEntries.map(player => (
            <div
              key={`${player.summonerName}#${player.tagline}`}
              className="animate-slide-up transition-transform duration-300 hover:-translate-y-1"
            >
              <PlayerCard player={player as any} queueType={queueType} onRemove={handleRemove} />
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#1e2d40]/50 mt-16 py-4">
        <p className="text-center text-gray-700 text-[10px] font-body tracking-wide">
          Not affiliated with Riot Games · EUW Server · Data via Riot Games API
        </p>
      </footer>

      {showModal && <AddPlayerModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </div>
  )
}
