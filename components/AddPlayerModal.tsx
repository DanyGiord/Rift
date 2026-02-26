'use client'

import { useState } from 'react'
import { FriendEntry } from '@/lib/friends'

interface AddPlayerModalProps {
  onClose: () => void
  onAdd: (gameName: string, tagLine: string, isMe: boolean, nickname?: string) => void
}

export function AddPlayerModal({ onClose, onAdd }: AddPlayerModalProps) {
  const [gameName, setGameName] = useState('')
  const [tagLine, setTagLine] = useState('')
  const [nickname, setNickname] = useState('')
  const [isMe, setIsMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!gameName.trim() || !tagLine.trim()) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onAdd(gameName.trim(), tagLine.trim(), isMe, nickname.trim() || undefined)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add player')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-md gold-border rounded"
        style={{ background: 'linear-gradient(135deg, #0d1b2a 0%, #0a1628 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-[#1e2d40]">
          <h2 className="font-display text-xl font-bold text-[#c8aa6e]">Add Player</h2>
          <p className="text-sm text-gray-500 mt-1 font-body">Enter the Riot ID to track (EUW server)</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 font-body uppercase tracking-widest">Game Name</label>
            <input
              type="text"
              value={gameName}
              onChange={e => setGameName(e.target.value)}
              placeholder="e.g. Faker"
              className="w-full bg-[#010a13] border border-[#1e2d40] rounded px-3 py-2.5 text-[#f0e6d3] font-body text-sm focus:border-[#c89b3c] focus:outline-none transition-colors placeholder-gray-600"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 font-body uppercase tracking-widest">Tag Line</label>
            <div className="flex items-center gap-2">
              <span className="text-[#c89b3c] text-lg font-display">#</span>
              <input
                type="text"
                value={tagLine}
                onChange={e => setTagLine(e.target.value)}
                placeholder="EUW"
                className="flex-1 bg-[#010a13] border border-[#1e2d40] rounded px-3 py-2.5 text-[#f0e6d3] font-body text-sm focus:border-[#c89b3c] focus:outline-none transition-colors placeholder-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1 font-body uppercase tracking-widest">Nickname (optional)</label>
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              placeholder="e.g. John's smurf"
              className="w-full bg-[#010a13] border border-[#1e2d40] rounded px-3 py-2.5 text-[#f0e6d3] font-body text-sm focus:border-[#c89b3c] focus:outline-none transition-colors placeholder-gray-600"
            />
            <p className="text-[10px] text-gray-600 mt-0.5 font-body">Label this account so you can tell friends with multiple accounts apart</p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
              isMe 
                ? 'bg-[#c89b3c] border-[#c89b3c]' 
                : 'border-[#1e2d40] group-hover:border-[#c89b3c]'
            }`} onClick={() => setIsMe(!isMe)}>
              {isMe && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="#010a13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-400 font-body">This is me</span>
          </label>

          {error && (
            <p className="text-red-500 text-sm font-body bg-red-500/15 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded border border-[#1e2d40] text-gray-400 text-sm font-body hover:border-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded text-sm font-display font-bold tracking-wider transition-all"
              style={{ 
                background: loading ? '#785a28' : 'linear-gradient(135deg, #c89b3c, #a57c2e)',
                color: '#010a13',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  ADDING...
                </span>
              ) : 'ADD PLAYER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
