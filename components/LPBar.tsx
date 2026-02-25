'use client'

import { RankedStats } from '@/lib/types'
import { getRankColor } from '@/lib/riot'

interface LPBarProps {
  stats: RankedStats | null
}

export function LPBar({ stats }: LPBarProps) {
  if (!stats || stats.tier === 'UNRANKED') return null
  
  // Apex tiers don't have divisions (no 0-100 LP progress)
  const isApex = ['CHALLENGER', 'GRANDMASTER', 'MASTER'].includes(stats.tier)
  if (isApex) {
    return (
      <div className="text-xs text-gray-500 font-body">
        <span style={{ color: getRankColor(stats.tier) }}>{stats.lp} LP</span>
      </div>
    )
  }

  const pct = Math.min(100, stats.lp)
  const color = getRankColor(stats.tier)

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{stats.lp} LP</span>
        <span className="text-gray-600">100</span>
      </div>
      <div className="lp-bar-track">
        <div 
          className="lp-bar-fill"
          style={{ 
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }} 
        />
      </div>
    </div>
  )
}
