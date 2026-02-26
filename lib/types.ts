export type Tier = 
  | 'CHALLENGER' 
  | 'GRANDMASTER' 
  | 'MASTER' 
  | 'DIAMOND' 
  | 'EMERALD' 
  | 'PLATINUM' 
  | 'GOLD' 
  | 'SILVER' 
  | 'BRONZE' 
  | 'IRON' 
  | 'UNRANKED'

export type Division = 'I' | 'II' | 'III' | 'IV'

export interface RankedStats {
  tier: Tier
  division: Division | null
  lp: number
  wins: number
  losses: number
  hotStreak: boolean
  veteran: boolean
  freshBlood: boolean
  inactive: boolean
  miniSeriesProgress?: string
  leaguePosition?: number
  leagueName?: string
}

export interface ChampionMastery {
  championId: number
  championName: string
  masteryLevel: number
  masteryPoints: number
  iconUrl: string
}

export interface RecentMatch {
  championName: string
  championIconUrl: string
  win: boolean
  kills: number
  deaths: number
  assists: number
  cs: number
  csPerMin: number
  duration: number
  queueId: number
  queueLabel: string
  timestamp: number
  lpChange?: number | null  // LP gained/lost in this match (from match data)
}

export interface Player {
  id: string
  summonerName: string
  tagline: string
  puuid: string
  profileIconId: number
  summonerLevel: number
  rankedSolo: RankedStats | null
  rankedFlex: RankedStats | null
  topChampions: ChampionMastery[]
  recentMatches: RecentMatch[]
  lpDelta24h: number | null   // total LP change in last 24h (solo ranked)
  isMe?: boolean
  lastUpdated?: string
  nickname?: string          // optional label e.g. "John's main"
  inActiveGame?: boolean     // true if currently in a live game
}

export interface LeaderboardEntry extends Player {
  rank: number
  previousRank?: number
}
