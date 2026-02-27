'use client'

import { useState, memo } from 'react'
import { Player, RecentMatch, RankedStats } from '@/lib/types'
import { getRankColor, winRate, getTierAbbr } from '@/lib/riot'

interface PlayerCardProps {
  player: Player & { rank: number; loading?: boolean }
  queueType: 'solo' | 'flex'
  onRemove: (gameName: string, tagLine: string) => void
  onUpdateNickname?: (gameName: string, tagLine: string, nickname: string) => void
}

const EMBLEMS: Record<string, string> = {
  CHALLENGER: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-challenger.png',
  GRANDMASTER: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-grandmaster.png',
  MASTER: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-master.png',
  DIAMOND: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-diamond.png',
  EMERALD: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-emerald.png',
  PLATINUM: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-platinum.png',
  GOLD: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-gold.png',
  SILVER: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-silver.png',
  BRONZE: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-bronze.png',
  IRON: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-iron.png',
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts
  const m = Math.floor(d / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatKDA(k: number, d: number, a: number): string {
  if (d === 0) return 'Perfect'
  return ((k + a) / d).toFixed(2)
}

function kdaColor(kda: number): string {
  if (kda >= 5) return '#f4c874'
  if (kda >= 3) return '#52b788'
  if (kda >= 2) return '#c8aa6e'
  return '#9ca3af'
}

function TierBadge({ stats }: { stats: RankedStats }) {
  const color = getRankColor(stats.tier)
  const abbr = getTierAbbr(stats.tier, stats.division)
  return (
    <span
      className="inline-flex items-center justify-center font-display font-black text-xs rounded px-1.5 py-0.5 leading-none"
      style={{ color: '#010a13', background: color, letterSpacing: '0.03em', minWidth: 28, boxShadow: `0 0 8px ${color}55` }}
    >
      {abbr}
    </span>
  )
}

function LpDeltaBadge({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined) {
    return (
      <span className="inline-flex items-center gap-0.5 font-display font-bold text-[10px] px-1.5 py-0.5 rounded"
        style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>
        <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
          <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.5" />
        </svg>
        0 LP
      </span>
    )
  }
  const isPos = delta >= 0
  const color = isPos ? '#52b788' : '#e05252'
  const bgColor = isPos ? 'rgba(82,183,136,0.12)' : 'rgba(224,82,82,0.12)'
  const borderCol = isPos ? 'rgba(82,183,136,0.25)' : 'rgba(224,82,82,0.25)'
  return (
    <span
      className="inline-flex items-center gap-0.5 font-display font-bold text-[10px] px-1.5 py-0.5 rounded border"
      style={{ color, background: bgColor, borderColor: borderCol }}
    >
      {/* Arrow triangle matching the screenshot style */}
      <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
        {isPos
          ? <path d="M4 1L7 7H1L4 1Z" fill="currentColor" />
          : <path d="M4 7L1 1H7L4 7Z" fill="currentColor" />
        }
      </svg>
      {Math.abs(delta)} LP
    </span>
  )
}

function WinrateBar({ wins, losses }: { wins: number; losses: number }) {
  const total = wins + losses
  const wr = total === 0 ? 0 : Math.round((wins / total) * 100)
  const wrColor = wr >= 55 ? '#52b788' : wr >= 50 ? '#c8aa6e' : '#e05252'
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-display font-bold text-sm" style={{ color: wrColor }}>{wr}% Winrate</span>
        <span className="text-gray-500 text-xs font-body">{total} Games</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden bg-[#1e2d40]">
        <div className="absolute left-0 top-0 h-full rounded-full transition-all duration-700"
          style={{ width: `${wr}%`, background: `linear-gradient(90deg, ${wrColor}aa, ${wrColor})` }} />
      </div>
      <div className="flex justify-between text-[10px] mt-0.5 font-body text-gray-600">
        <span className="text-green-400">{wins}W</span>
        <span className="text-red-400">{losses}L</span>
      </div>
    </div>
  )
}

function MatchDot({ match }: { match: RecentMatch }) {
  const kda = match.deaths === 0 ? 99 : (match.kills + match.assists) / match.deaths
  return (
    <div className="group/m relative">
      <div className={`w-5 h-5 rounded overflow-hidden border ${match.win ? 'border-[#52b788]/40' : 'border-red-500/30'} hover:scale-125 transition-transform cursor-default`}>
        <img src={match.championIconUrl} alt={match.championName} className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
      </div>
      {/* Tooltip above icon; z-[100] and parent overflow-visible so it isn't clipped */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-[100] pointer-events-none opacity-0 group-hover/m:opacity-100 transition-opacity duration-150">
        <div className="bg-[#010a13] border border-[#1e2d40] rounded p-2 text-[10px] whitespace-nowrap shadow-xl">
          <div className={`font-display font-bold ${match.win ? 'text-[#38a169]' : 'text-red-500'}`}>
            {match.win ? 'Victory' : 'Defeat'} · {match.championName}
          </div>
          <div className="text-gray-400">{match.kills}/{match.deaths}/{match.assists}
            <span className="ml-1" style={{ color: kdaColor(kda) }}>({formatKDA(match.kills, match.deaths, match.assists)} KDA)</span>
          </div>
          <div className="text-gray-600">{match.cs} CS · {timeAgo(match.timestamp)}</div>
        </div>
      </div>
    </div>
  )
}

function PlayerCardComponent({ player, queueType, onRemove, onUpdateNickname }: PlayerCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [editingNickname, setEditingNickname] = useState(false)
  const [nicknameInput, setNicknameInput] = useState(player.nickname ?? '')
  const stats = queueType === 'solo' ? player.rankedSolo : player.rankedFlex
  const rankColor = stats ? getRankColor(stats.tier) : '#6b7280'
  const wr = stats ? winRate(stats.wins, stats.losses) : 0
  const recentMatches = player.recentMatches || []

  const rankNumStr = player.rank <= 3
    ? ['🥇', '🥈', '🥉'][player.rank - 1]
    : `#${player.rank}`

  if (player.loading) {
    return <div className="h-16 rounded-lg border border-[#1e2d40] bg-[#0d1b2a]/50 shimmer" />
  }

  return (
    <div className={`rounded-lg border transition-all duration-300 ease-out overflow-visible relative transform hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-xl ${player.isMe ? 'border-[#c89b3c]/50' : 'border-[#1e2d40] hover:border-[#2a3d52]'
      }`} style={{ background: player.isMe ? 'rgba(200,155,60,0.06)' : 'rgba(8,18,30,0.9)', transformOrigin: 'center' }}>

      <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l transition-opacity duration-300" style={{ background: rankColor, opacity: 0.8 }} />

      {/* Main row */}
      <div className="flex items-center gap-0 pl-1 pr-2 sm:pr-3 min-h-[4rem] py-2 cursor-pointer group hover:bg-white/2" onClick={() => setExpanded(e => !e)}>

        {/* Position */}
        <div className="w-12 text-center flex-shrink-0">
          {player.rank <= 3
            ? <span className="text-lg">{rankNumStr}</span>
            : <span className="font-display text-xs font-bold text-gray-500">{rankNumStr}</span>}
        </div>

        {/* Avatar */}
        <div className="relative w-10 h-10 flex-shrink-0 mr-3">
          <img
            src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/${player.profileIconId}.png`}
            alt={player.summonerName}
            className="w-10 h-10 rounded-full border object-cover"
            style={{ borderColor: rankColor + '60' }}
            onError={e => { (e.target as HTMLImageElement).src = 'https://ddragon.leagueoflegends.com/cdn/15.1.1/img/profileicon/29.png' }}
          />
          {player.isMe && (
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#c89b3c] flex items-center justify-center">
              <span className="text-[6px]">★</span>
            </div>
          )}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[8px] bg-[#010a13] border border-[#1e2d40] rounded px-1 text-gray-600 font-body whitespace-nowrap z-10">
            {player.summonerLevel}
          </div>
        </div>

        {/* Name + optional nickname + mobile rank */}
        <div className="flex-1 min-w-0 mr-2 sm:mr-4 sm:w-40 sm:flex-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {editingNickname && onUpdateNickname ? (
              <input
                type="text"
                value={nicknameInput}
                onChange={e => setNicknameInput(e.target.value)}
                onBlur={() => {
                  onUpdateNickname(player.summonerName, player.tagline, nicknameInput)
                  setEditingNickname(false)
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    (e.target as HTMLInputElement).blur()
                  }
                  if (e.key === 'Escape') {
                    setNicknameInput(player.nickname ?? '')
                    setEditingNickname(false)
                  }
                }}
                placeholder="Nickname"
                className="flex-1 min-w-0 bg-[#0d1b2a] border border-[#c89b3c]/50 rounded px-1.5 py-0.5 text-[10px] text-[#e8d8b8] font-body focus:border-[#c89b3c] focus:outline-none"
                autoFocus
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <>
                {player.nickname ? (
                  <span className="text-[10px] text-[#c89b3c] font-body truncate w-full block" title={player.nickname}>
                    {player.nickname}
                  </span>
                ) : null}
                <div className="flex items-center gap-1 min-w-0">
                  <span className={`font-display font-bold text-sm truncate ${player.isMe ? 'text-[#c8aa6e]' : 'text-[#e8d8b8]'}`}>
                    {player.summonerName}
                  </span>
                  {onUpdateNickname && (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        setNicknameInput(player.nickname ?? '')
                        setEditingNickname(true)
                      }}
                      className="opacity-0 group-hover:opacity-70 hover:opacity-100 p-0.5 rounded text-gray-500 hover:text-[#c89b3c] transition-all flex-shrink-0"
                      title={player.nickname ? 'Edit nickname' : 'Add nickname'}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  )}
                  {player.isMe && (
                    <span className="text-[9px] font-display bg-[#c89b3c]/20 text-[#c89b3c] border border-[#c89b3c]/40 rounded px-1 py-0.5 flex-shrink-0">YOU</span>
                  )}
                </div>
              </>
            )}
          </div>
          <span className="text-gray-600 text-[10px] font-body">#{player.tagline}</span>
          {/* Mobile-only rank + LP inline */}
          {stats && (
            <div className="flex items-center gap-1.5 mt-0.5 md:hidden">
              <TierBadge stats={stats} />
              <span className="font-display font-bold text-xs" style={{ color: getRankColor(stats.tier) }}>
                {stats.lp} LP
              </span>
              {queueType === 'solo' && <LpDeltaBadge delta={player.lpDelta24h} />}
              {stats.hotStreak && <span className="text-xs" title="Hot Streak">🔥</span>}
            </div>
          )}
          {!stats && <span className="text-gray-600 text-xs font-body md:hidden">Unranked</span>}
        </div>

        {/* Rank column */}
        <div className="hidden md:flex items-center gap-2 w-52 flex-shrink-0 mr-4">
          {stats ? (
            <>
              <img src={EMBLEMS[stats.tier] || EMBLEMS.IRON} alt={stats.tier}
                className="w-9 h-9 object-contain flex-shrink-0 drop-shadow-lg"
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <TierBadge stats={stats} />
                  <span className="font-display font-bold text-sm" style={{ color: getRankColor(stats.tier) }}>
                    {stats.lp.toLocaleString()} LP
                  </span>
                  {queueType === 'solo' && <LpDeltaBadge delta={player.lpDelta24h} />}
                  {stats.hotStreak && <span className="text-xs" title="Hot Streak" style={{ filter: 'drop-shadow(0 0 3px orange)' }}>🔥</span>}
                </div>
                <div className="text-[10px] text-gray-500 font-body mt-0.5">
                  {stats.leaguePosition
                    ? `#${stats.leaguePosition} in ${stats.tier.charAt(0) + stats.tier.slice(1).toLowerCase()}`
                    : stats.division
                      ? `${stats.tier.charAt(0) + stats.tier.slice(1).toLowerCase()} ${stats.division}`
                      : stats.tier.charAt(0) + stats.tier.slice(1).toLowerCase()
                  }
                  {stats.miniSeriesProgress && (
                    <span className="ml-1.5 inline-flex gap-0.5 items-center">
                      {stats.miniSeriesProgress.split('').map((c, i) => (
                        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-sm ${c === 'W' ? 'bg-green-500' : c === 'L' ? 'bg-red-500' : 'bg-gray-700'}`} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <span className="text-gray-600 text-sm font-body">Unranked</span>
          )}
        </div>

        {/* Winrate column */}
        <div className="hidden lg:block flex-1 min-w-0 mr-6 max-w-56">
          {stats
            ? <WinrateBar wins={stats.wins} losses={stats.losses} />
            : <span className="text-gray-700 text-xs font-body">—</span>}
        </div>

        {/* Top 3 champs */}
        <div className="hidden lg:flex items-center gap-1 w-24 flex-shrink-0 mr-3">
          {(player.topChampions || []).slice(0, 3).map((c, i) => (
            <div key={i} className="relative" title={`${c.championName} — Mastery ${c.masteryLevel}`}>
              <img src={c.iconUrl} alt={c.championName}
                className="w-8 h-8 rounded-full border object-cover"
                style={{ borderColor: rankColor + '50' }}
                onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
              <div className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-[#c89b3c] text-black rounded-full w-3 h-3 flex items-center justify-center font-black leading-none">
                {c.masteryLevel > 10 ? '10' : c.masteryLevel}
              </div>
            </div>
          ))}
          {!(player.topChampions || []).length && <span className="text-gray-700 text-[10px] font-body">—</span>}
        </div>

        {/* Last 5 games */}
        <div className="hidden sm:flex items-center gap-0.5 w-28 flex-shrink-0">
          {recentMatches.slice(0, 5).map((m, i) => <MatchDot key={i} match={m} />)}
          {!recentMatches.length && <span className="text-gray-700 text-[10px] font-body">—</span>}
        </div>

        {/* Live game button – shown when player is in an active game (updated by poll every 90s) */}
        {player.inActiveGame && (
          <div className="flex items-center flex-shrink-0" onClick={e => e.stopPropagation()}>
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/20 border border-red-500/50"
              title="Currently in a live game"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-display font-bold tracking-wider text-red-300">LIVE GAME</span>
            </span>
          </div>
        )}

        {/* Expand + remove */}
        <div className="flex items-center gap-1 ml-auto pl-2 flex-shrink-0">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            className={`text-gray-600 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <button
            onClick={e => { e.stopPropagation(); onRemove(player.summonerName, player.tagline) }}
            className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-all"
            title="Remove player"
          >
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="border-t border-[#1e2d40]/60 grid grid-cols-1 md:grid-cols-3 animate-fade-in">

          {/* Queue comparison */}
          <div className="p-4 border-b md:border-b-0 md:border-r border-[#1e2d40]/60">
            <h4 className="text-[9px] font-display tracking-[0.25em] uppercase text-gray-600 mb-3">Ranked Queues</h4>
            {[{ label: 'Solo / Duo', s: player.rankedSolo }, { label: 'Flex 5v5', s: player.rankedFlex }].map(({ label, s }) => (
              <div key={label} className="flex items-center gap-3 mb-3 last:mb-0">
                {s ? (
                  <>
                    <img src={EMBLEMS[s.tier] || EMBLEMS.IRON} alt={s.tier} className="w-8 h-8 object-contain flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <TierBadge stats={s} />
                        <span className="font-display text-sm font-bold" style={{ color: getRankColor(s.tier) }}>{s.lp} LP</span>
                        {s.hotStreak && <span className="text-xs">🔥</span>}
                      </div>
                      <div className="text-[10px] text-gray-500 font-body">
                        {label} · {winRate(s.wins, s.losses)}% WR · {s.wins + s.losses} games
                        {s.leaguePosition && <span className="ml-1 text-[#c89b3c]">#{s.leaguePosition}</span>}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1e2d40]/50 flex items-center justify-center text-gray-600 text-xs">?</div>
                    <div>
                      <div className="text-xs text-gray-500 font-body">{label}</div>
                      <div className="text-[10px] text-gray-700 font-body">Unranked</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {stats && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-[#1e2d40]/40">
                {stats.hotStreak && <span className="text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded px-1.5 py-0.5">🔥 Hot Streak</span>}
                {stats.veteran && <span className="text-[10px] bg-blue-500/10   text-blue-400   border border-blue-500/20   rounded px-1.5 py-0.5">🛡 Veteran</span>}
                {stats.freshBlood && <span className="text-[10px] bg-green-500/10  text-green-400  border border-green-500/20  rounded px-1.5 py-0.5">✨ Fresh Blood</span>}
                {stats.inactive && <span className="text-[10px] bg-gray-500/10   text-gray-400   border border-gray-500/20   rounded px-1.5 py-0.5">💤 Inactive</span>}
              </div>
            )}
            {player.inActiveGame && (
              <div className="mt-2 pt-2 border-t border-[#1e2d40]/40">
                <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/50 rounded px-1.5 py-0.5 inline-flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                  LIVE GAME
                </span>
              </div>
            )}
          </div>

          {/* Champion mastery */}
          <div className="p-4 border-b md:border-b-0 md:border-r border-[#1e2d40]/60">
            <h4 className="text-[9px] font-display tracking-[0.25em] uppercase text-gray-600 mb-3">Champion Mastery</h4>
            {!(player.topChampions || []).length
              ? <p className="text-gray-700 text-xs font-body">No mastery data</p>
              : (player.topChampions || []).map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 mb-2.5 last:mb-0">
                  <img src={c.iconUrl} alt={c.championName} className="w-9 h-9 rounded-full border border-[#1e2d40] object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-body font-semibold text-[#e8d8b8] truncate">{c.championName}</div>
                    <div className="text-[10px] text-gray-600 font-body">{(c.masteryPoints / 1000).toFixed(0)}k pts</div>
                  </div>
                  <div className="flex items-center">
                    {Array.from({ length: Math.min(c.masteryLevel, 7) }).map((_, j) => (
                      <span key={j} style={{ color: '#c89b3c', fontSize: 9 }}>★</span>
                    ))}
                    {c.masteryLevel > 7 && <span className="text-[9px] text-[#c89b3c] font-bold ml-0.5">+{c.masteryLevel - 7}</span>}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Recent matches */}
          <div className="p-4">
            <h4 className="text-[9px] font-display tracking-[0.25em] uppercase text-gray-600 mb-3 flex items-center gap-2">
              Recent Ranked
              {recentMatches.length > 0 && (
                <span className="font-body tracking-normal normal-case text-gray-700">
                  {recentMatches.filter(m => m.win).length}W {recentMatches.length - recentMatches.filter(m => m.win).length}L
                </span>
              )}
            </h4>
            {!recentMatches.length
              ? <p className="text-gray-700 text-xs font-body">No recent ranked games</p>
              : recentMatches.map((m, i) => {
                const kda = m.deaths === 0 ? 99 : (m.kills + m.assists) / m.deaths
                return (
                  <div key={i} className={`flex items-center gap-2 rounded px-2 py-1.5 mb-1 last:mb-0 ${m.win ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                    <img src={m.championIconUrl} alt={m.championName} className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '0' }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] font-bold ${m.win ? 'text-green-500' : 'text-red-500'}`}>{m.win ? 'W' : 'L'}</span>
                        <span className="text-[10px] text-gray-400 truncate font-body">{m.championName}</span>
                      </div>
                      <div className="text-[10px] text-gray-600 font-body">
                        {m.kills}/{m.deaths}/{m.assists}
                        <span className="ml-1" style={{ color: kdaColor(kda), fontSize: 9 }}>{formatKDA(m.kills, m.deaths, m.assists)}</span>
                        <span className="ml-1">{m.cs}cs ({m.csPerMin}/m)</span>
                      </div>
                    </div>
                    <div className="text-[9px] text-gray-700 font-body flex-shrink-0">{timeAgo(m.timestamp)}</div>
                  </div>
                )
              })
            }
          </div>
        </div>
      )}
    </div>
  )
}

export const PlayerCard = memo(PlayerCardComponent)
