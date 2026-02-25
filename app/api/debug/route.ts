import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function rf(url: string, key: string) {
  try {
    const r = await fetch(url, { headers: { 'X-Riot-Token': key }, cache: 'no-store' })
    let body: any
    try { body = await r.json() } catch { body = await r.text() }
    return { status: r.status, ok: r.ok, body }
  } catch (e: any) {
    return { status: 0, ok: false, body: e.message }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const gameName = searchParams.get('gameName') || 'Caps'
  const tagLine  = searchParams.get('tagLine')  || 'EUW'
  const key = process.env.RIOT_API_KEY

  if (!key) return NextResponse.json({ error: 'RIOT_API_KEY not set in .env.local' }, { status: 503 })

  const out: Record<string, any> = {
    keyPrefix: key.slice(0, 12) + '…',
    testing: `${gameName}#${tagLine}`,
  }

  // 1. Account → PUUID
  out.step1_account = await rf(
    `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
    key
  )
  const puuid: string | undefined = out.step1_account.body?.puuid
  if (!puuid) return NextResponse.json({ ...out, STOP: 'No PUUID — account lookup failed' })

  // 2. Summoner via PUUID
  out.step2_summoner = await rf(
    `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
    key
  )
  const summonerId: string | undefined = out.step2_summoner.body?.id

  // 3a. Ranked via PUUID (new endpoint)
  out.step3a_ranked_puuid = await rf(
    `https://euw1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuid}`,
    key
  )

  // 3b. Ranked via summonerId (old endpoint fallback)
  if (summonerId) {
    out.step3b_ranked_summoner = await rf(
      `https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/${summonerId}`,
      key
    )
  }

  // 4. Champion mastery via PUUID
  out.step4_mastery = await rf(
    `https://euw1.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`,
    key
  )

  // 5. Match IDs via PUUID (Solo)
  out.step5_matchIds_solo = await rf(
    `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=420&count=3`,
    key
  )

  // 6. Match IDs via PUUID (Flex)
  out.step6_matchIds_flex = await rf(
    `https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?queue=440&count=3`,
    key
  )

  // 7. First match detail
  const firstId = out.step5_matchIds_solo.body?.[0] || out.step6_matchIds_flex.body?.[0]
  if (firstId) {
    const mr = await rf(`https://europe.api.riotgames.com/lol/match/v5/matches/${firstId}`, key)
    out.step7_match_sample = {
      status: mr.status, ok: mr.ok,
      matchId: firstId,
      participantCount: mr.body?.info?.participants?.length,
      myChamp: mr.body?.info?.participants?.find((p:any) => p.puuid === puuid)?.championName,
    }
  }

  // Summary
  out.SUMMARY = {
    accountOk:  out.step1_account.ok,
    summonerOk: out.step2_summoner.ok,
    rankedViaPuuid: out.step3a_ranked_puuid.ok
      ? `✅ ${out.step3a_ranked_puuid.body?.length} entries`
      : `❌ ${out.step3a_ranked_puuid.status}`,
    rankedViaSummonerId: out.step3b_ranked_summoner?.ok
      ? `✅ ${out.step3b_ranked_summoner.body?.length} entries`
      : `❌ ${out.step3b_ranked_summoner?.status}`,
    masteryOk: out.step4_mastery.ok
      ? `✅ ${out.step4_mastery.body?.length} champions`
      : `❌ ${out.step4_mastery.status}`,
    soloMatchIds: out.step5_matchIds_solo.ok
      ? `✅ ${out.step5_matchIds_solo.body?.length} games`
      : `❌ ${out.step5_matchIds_solo.status}`,
    flexMatchIds: out.step6_matchIds_flex.ok
      ? `✅ ${out.step6_matchIds_flex.body?.length} games`
      : `❌ ${out.step6_matchIds_flex.status}`,
  }

  return NextResponse.json(out)
}
