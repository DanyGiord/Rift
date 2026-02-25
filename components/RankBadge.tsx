'use client'

import { Tier, Division, RankedStats } from '@/lib/types'
import { getRankColor, formatRank, formatLP, winRate } from '@/lib/riot'
import Image from 'next/image'

interface RankBadgeProps {
  stats: RankedStats | null
  size?: 'sm' | 'md' | 'lg'
  showWR?: boolean
  showLP?: boolean
}

const RANK_EMBLEMS: Record<string, string> = {
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
  UNRANKED: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-iron.png',
}

export function RankBadge({ stats, size = 'md', showWR = true, showLP = true }: RankBadgeProps) {
  const tier = stats?.tier ?? 'UNRANKED'
  const color = getRankColor(tier)
  const imgSize = size === 'sm' ? 32 : size === 'md' ? 48 : 64

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-shrink-0" style={{ width: imgSize, height: imgSize }}>
        <img
          src={RANK_EMBLEMS[tier] || RANK_EMBLEMS.UNRANKED}
          alt={tier}
          width={imgSize}
          height={imgSize}
          className="object-contain drop-shadow-lg"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none'
          }}
        />
      </div>
      <div>
        <div 
          className={`font-display font-bold tracking-wide ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg'}`}
          style={{ color }}
        >
          {formatRank(stats)}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {showLP && stats && (
            <span style={{ color: 'rgba(200,155,60,0.9)' }}>{formatLP(stats)}</span>
          )}
          {showWR && stats && (
            <>
              <span className="text-gray-600">·</span>
              <span>
                <span className="text-green-500">{stats.wins}W</span>
                <span className="text-gray-500"> / </span>
                <span className="text-red-500">{stats.losses}L</span>
                <span className="text-gray-400"> ({winRate(stats.wins, stats.losses)}%)</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
