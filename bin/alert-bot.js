#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { c, footer, main, parseArgs, short, sleep } from "../lib/core.js";
import { connect, makeFilter } from "../lib/feed.js";
import { createNotifier, formatAlert } from "../lib/notify.js";
import { createCopyFilter, passesCheck, quickCheck } from "../lib/check.js";
import { numberFlag } from "../lib/options.js";

const HELP = `memecoin-alert-bot: pump.fun launch and graduation alerts in Telegram and Discord

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
`;

/** Minimal .env loader: KEY=value lines, existing environment wins. */
function loadEnv(file = ".env") {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

main(async () => {
  const args = parseArgs(process.argv.slice(2), { booleans: ["launches", "migrations", "migrations-only", "dry-run", "help", "allow-copies"] });
  if (args.help) { console.log(HELP); return; }
  loadEnv();
  const wantLaunches = !args["migrations-only"];
  const wantMigrations = Boolean(args.migrations || args["migrations-only"]);
  const maxPerMin = numberFlag(args, "max-per-min", { min: 1 }) ?? 10;
  const maxTop10 = numberFlag(args, "max-top10") ?? null;
  const filter = makeFilter({
    minDevBuy: numberFlag(args, "min-dev-buy") ?? 0,
    name: typeof args.name === "string" ? args.name : null,
    exclude: typeof args.exclude === "string" ? args.exclude : null,
  });
  const log = (s) => console.error(c.dim(`[${new Date().toLocaleTimeString("en-GB")}] ${s}`));

  const notifier = createNotifier({
    telegramToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChat: process.env.TELEGRAM_CHAT_ID,
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    log,
  });
  const dryRun = args["dry-run"] || !notifier.enabled;
  if (!notifier.enabled && !args["dry-run"]) log("No TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID or DISCORD_WEBHOOK_URL set, so alerts print here (dry run).");
  log(`Alerting on ${[wantLaunches && "launches", wantMigrations && "graduations"].filter(Boolean).join(" and ")}, at most ${maxPerMin}/min.`);

  const isCopy = createCopyFilter();
  let copies = 0;
  const recent = [];
  const seen = new Set();
  let dropped = 0;
  const underCap = () => {
    const now = Date.now();
    while (recent.length && now - recent[0] > 60000) recent.shift();
    return recent.length < maxPerMin;
  };

  const emit = (alert) => {
    if (!underCap()) { dropped++; return; }
    recent.push(Date.now());
    const msg = formatAlert(alert);
    if (dryRun) {
      console.log((alert.type === "migration" ? c.magenta : c.green)(msg.discord.replace(/\*\*/g, "").replace(/\[([^\]]+)\]\(<[^>]+>\)/g, "$1").split("\n").slice(0, 3).join("\n")) + "\n");
    } else {
      notifier.send(msg);
      log(`sent ${alert.type} ${alert.symbol ? "$" + alert.symbol : short(alert.mint)}`);
    }
  };

  // pump.fun messages only give the mint for a graduation, so names are remembered from launches.
  const names = new Map();
  const stop = connect({
    migrations: wantMigrations,
    onStatus: (s) => log(`feed ${s}`),
    onEvent: async (ev) => {
      if (seen.has(ev.type + ev.mint)) return;
      seen.add(ev.type + ev.mint);
      if (seen.size > 20000) seen.clear();
      if (ev.type === "launch") {
        names.set(ev.mint, { name: ev.name, symbol: ev.symbol });
        if (names.size > 50000) names.delete(names.keys().next().value);
        if (!wantLaunches || !filter(ev)) return;
        if (isCopy(ev) && !args["allow-copies"]) { copies++; return; }
        emit(ev);
        return;
      }
      // Graduation: give indexers a moment to see the new pool, then check holders.
      await sleep(8000);
      const check = await quickCheck(ev.mint);
      if (!passesCheck(check, { maxTop10 })) { log(`skipped graduation ${short(ev.mint)}: top 10 hold ${check.top10.toFixed(1)}%`); return; }
      const known = names.get(ev.mint) || {};
      emit({ ...ev, name: known.name || "", symbol: known.symbol || "", check });
    },
  });

  const shutdown = async () => {
    stop();
    await Promise.race([notifier.idle(), sleep(5000)]);
    const s = notifier.stats();
    log(`stopped. sent ${s.sent}, failed ${s.failed}, over the rate cap ${dropped}, copycats skipped ${copies}.`);
    footer("/memecoin-alerts", "Alerts with AI context, dev history and wallet signals");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
