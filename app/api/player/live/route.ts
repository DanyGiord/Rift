import { NextRequest, NextResponse } from 'next/server'
import { getActiveGameStatus } from '@/lib/riot'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gameName = searchParams.get('gameName')
  const tagLine = searchParams.get('tagLine')

  if (!gameName || !tagLine) {
    return NextResponse.json({ error: 'Missing gameName or tagLine' }, { status: 400 })
  }
  if (!process.env.RIOT_API_KEY) {
    return NextResponse.json({ error: 'No Riot API key configured' }, { status: 503 })
  }

  try {
    const inActiveGame = await getActiveGameStatus(gameName, tagLine)
    return NextResponse.json({ inActiveGame })
  } catch (e) {
    console.error('[player/live]', e)
    return NextResponse.json({ inActiveGame: false })
  }
}
