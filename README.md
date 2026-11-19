# Memecoin Alert Bot

pump.fun alerts in Telegram and Discord. New Solana memecoin launches filtered by dev buy and keywords, plus graduations from the bonding curve with a holder-concentration check before they are sent.

![Node 22+](https://img.shields.io/badge/node-%E2%89%A522-5FA04E?logo=node.js&logoColor=white) ![Dependencies: 0](https://img.shields.io/badge/dependencies-0-2ea44f) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Free and open source, part of the [Blix Trade](https://github.com/blixtrade) toolkit. For the live version with AI ratings on every coin, wallet tracking and one-click trading at 0% fees, see **[BLIX, the Solana memecoin terminal](https://blixvip.com/memecoin-alerts?utm_source=github&utm_medium=readme&utm_campaign=memecoin-alert-bot)**.

## What it does

- Sends launches, graduations or both to a Telegram chat or channel and/or a Discord channel.
- Launch filters: minimum dev buy, name or ticker regex, exclude regex.
- Graduations are checked first: top-10 wallet share, holder count and danger-level RugCheck risks go in the alert, and `--max-top10` skips concentrated coins.
- A rate cap (`--max-per-min`) and a send queue keep you inside Telegram and Discord limits; a 429 is retried after the wait the API asks for.
- `--dry-run` prints alerts in the terminal. With no tokens set, it runs as a dry run automatically.

## Quick start

You need [Node.js](https://nodejs.org) 22 or newer. There is nothing else to install: no dependencies, no API keys.

Run it straight from GitHub:

```bash
npx -y github:blixtrade/memecoin-alert-bot --migrations-only --max-top10 30
```

Or clone it:

```bash
git clone https://github.com/blixtrade/memecoin-alert-bot.git
cd memecoin-alert-bot
node bin/alert-bot.js --migrations-only --max-top10 30
```

To get a `alert-bot` command on your PATH, run `npm link` inside the folder.

### Connect Telegram or Discord

1. **Telegram:** message [@BotFather](https://t.me/BotFather), send `/newbot`, and copy the token. Add the bot to your group or channel, send it a message, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` to find the chat id.
2. **Discord:** in a channel, open Edit Channel → Integrations → Webhooks → New Webhook, and copy the URL.
3. Copy `.env.example` to `.env` and fill in what you use. Never commit `.env`.

## Example output

Real output from a run on 18 November 2026:

```text
🚀 New launch: NASDUCK ($NASDUCK)
Dev buy 4.94 SOL · Mcap 37.9 SOL
`AXibdCuWNok1JTyFH2puJWQbSGyKuGKJxvqskdFG5gNM`

🚀 New launch: STRPCLB ($ShoeStore)
Dev buy 0.06 SOL · Mcap 28.1 SOL
`xuqjKRw5xAHsFqMXsaJWGXXxLGXgnFSrvT2bxYhpump`

🚀 New launch: Armed & Adorable ($CUTE)
Dev buy 0.06 SOL · Mcap 28.1 SOL
`3npxT7krVTbaUNU8FKkG95UVhZR1sxCxGYZthDMipump`

🚀 New launch: Trump GTA MEME ($TGTA)
Dev buy 0.03 SOL · Mcap 28.0 SOL
`2mk7d6zWuhSTfBxqHU7tQK1Uwtin5EMJMse1RZbzpump`
```

## Options

```text
memecoin-alert-bot: pump.fun launch and graduation alerts in Telegram and Discord

Usage:
  alert-bot [options]

What to alert on:
  --launches             New pump.fun launches (on by default unless --migrations-only)
  --migrations           Coins graduating from the bonding curve
  --migrations-only      Only graduations
  --min-dev-buy <sol>    Launches where the dev bought at least this much
  --name <regex>         Launches whose name or ticker matches
  --exclude <regex>      Skip names or tickers matching this
  --max-top10 <pct>      Graduations: skip if the top 10 wallets hold more than this
  --max-per-min <n>      Cap alerts per minute (default 10)
  --allow-copies         Also alert on copycat launches (same name and ticker
                         again within 10 minutes); skipped by default

Where to send (or set them in a .env file next to where you run it):
  TELEGRAM_BOT_TOKEN     From @BotFather
  TELEGRAM_CHAT_ID       Your chat, group or channel id
  DISCORD_WEBHOOK_URL    Channel settings > Integrations > Webhooks

Other:
  --dry-run              Print alerts here instead of sending them
  --help                 Show this help

Examples:
  alert-bot --migrations-only --max-top10 30
  alert-bot --min-dev-buy 2 --name "ai|agent" --migrations
```

## How it works

- Listens to the free PumpPortal websocket for launches and migrations.
- Reads `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` and `DISCORD_WEBHOOK_URL` from the environment or a `.env` file (see `.env.example`).
- Telegram messages use HTML formatting with every token name escaped; Discord messages disable mentions so a token called `@everyone` cannot ping your server.

## Limits

- Under a flood of matches it drops the oldest queued alerts rather than fall minutes behind.
- Run it on an always-on machine (a small VPS works) if you want alerts around the clock.

## Development

```bash
npm test
```

Tests run offline against fixtures, so they never depend on a live API.

## Contributing

Pull requests are welcome, and first-timers are too. Pick an issue labelled [good first issue](https://github.com/blixtrade/memecoin-alert-bot/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) or [help wanted](https://github.com/blixtrade/memecoin-alert-bot/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22), comment that you are taking it, and read [CONTRIBUTING.md](CONTRIBUTING.md). No API keys needed: the tests run offline.

[![Contributors](https://contrib.rocks/image?repo=blixtrade/memecoin-alert-bot)](https://github.com/blixtrade/memecoin-alert-bot/graphs/contributors)

## More free Solana tools from Blix Trade

| Tool | What it does |
|---|---|
| [solana-bubble-map](https://github.com/blixtrade/solana-bubble-map) | Holder bubble map for any Solana or pump.fun token. |
| [pump-fun-tracker](https://github.com/blixtrade/pump-fun-tracker) | Every new pump.fun launch on Solana, live in your terminal, the moment it is created. |
| [solana-rug-checker](https://github.com/blixtrade/solana-rug-checker) | Rug pull scanner for Solana and pump.fun tokens. |
| [solana-memecoin-screener](https://github.com/blixtrade/solana-memecoin-screener) | Screen trending, new and boosted Solana memecoins from the terminal. |
| [solana-wallet-tracker](https://github.com/blixtrade/solana-wallet-tracker) | Follow any Solana wallets and see every memecoin buy and sell they make: token, size in SOL and USD, and a Solscan link. |
| [solana-pnl-tracker](https://github.com/blixtrade/solana-pnl-tracker) | Profit and loss for any Solana wallet's memecoin trades, worked out from its on-chain transactions. |
| [solana-whale-tracker](https://github.com/blixtrade/solana-whale-tracker) | Big buys and sells on any Solana token: net whale flow, every large trade with a Solscan link, and leaderboards of the wallets buying and dumping the most. |
| [memecoin-paper-trading](https://github.com/blixtrade/memecoin-paper-trading) | Practise Solana memecoin trading with fake SOL at real prices. |
| [pump-fun-mcp](https://github.com/blixtrade/pump-fun-mcp) | An MCP server that gives Claude, Cursor and other AI assistants six Solana memecoin research tools: token info, rug check, top holders, a screener, whale trades and wallet trades. |

Want all of this in one place, live, with AI on every coin? **[Open BLIX](https://blixvip.com/?utm_source=github&utm_medium=readme&utm_campaign=memecoin-alert-bot)**: the Solana memecoin terminal with 0% trading fees.

## Disclaimer

This is research software, not financial advice. Memecoins are extremely volatile and most go to zero. Never trade more than you can afford to lose. The data comes from free third-party APIs that can be wrong, late or unavailable.

## License

[MIT](LICENSE)
