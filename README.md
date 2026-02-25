# 🎮 LoL Friends Leaderboard — EUW

Track your League of Legends ranked progress with friends on EUW. Built with **Next.js 14** + **Tailwind CSS**.

## Quick Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local → paste your Riot API key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Getting a Riot API Key

1. Go to [developer.riotgames.com](https://developer.riotgames.com)
2. Log in with your Riot account
3. Copy the **Development API Key** shown on the dashboard
4. Paste it in `.env.local`:

```
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

> ⚠️ Development keys expire every **24 hours**. Come back and refresh the key daily, or apply for a Production key for permanent access.

## Troubleshooting — Stats not showing?

### Step 1: Run the debug endpoint

After starting the dev server, open this URL in your browser (replace with a real EUW player):

```
http://localhost:3000/api/debug?gameName=YourName&tagLine=EUW
```

This will show you exactly which API calls succeed/fail and why.

### Common errors:

| Error | Fix |
|-------|-----|
| `403 Forbidden` | API key expired — get a new one at developer.riotgames.com |
| `401 Unauthorized` | API key is wrong or not set — check `.env.local` |
| `404 Not Found` | Player name or tag is wrong |
| `429 Too Many Requests` | Rate limited — wait 2 minutes |
| `503` from our app | `.env.local` is missing or key not set |

### Step 2: Check your .env.local

Make sure the file is named **exactly** `.env.local` (not `.env` or `.env.local.example`) and contains:
```
RIOT_API_KEY=RGAPI-your-actual-key-here
```
Then **restart** the dev server (`Ctrl+C` then `npm run dev` again).

### Step 3: Check server logs

The terminal running `npm run dev` will show logs like:
```
[getFullPlayerData] PlayerName#EUW — summonerId: abc123
[getFullPlayerData] ranked entries: 2, champs: 3, matches: 5
```

If ranked entries shows 0, the player hasn't played ranked this season.

## What data is fetched per player

1. `account/v1` → PUUID from Riot ID
2. `summoner/v4` → summoner ID, level, profile icon
3. `league/v4/entries` → Solo/Duo and Flex ranked stats (LP, W/L, tier, hot streak)
4. `league/v4/challengerleagues` or `grandmasterleagues` → actual ladder position (#42 in Challenger)
5. `champion-mastery/v4` → top 3 champion masteries
6. `match/v5` → last 5 Solo + Flex ranked games (K/D/A, CS, champion)

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript** + **Tailwind CSS**
- **Riot Games API** (EUW server, Europe routing)
- Fonts: Cinzel + Rajdhani
