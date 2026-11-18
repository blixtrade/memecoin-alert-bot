import { getJson } from "./core.js";

/** Holder concentration and RugCheck risk names for a token. Never throws. */
export async function quickCheck(mint) {
  try {
    const r = await getJson(`https://api.rugcheck.xyz/v1/tokens/${mint}/report`, { retries: 2, timeout: 12000, patience: 20000 });
    const known = r.knownAccounts || {};
    const wallets = (r.topHolders || []).filter((h) => (known[h.owner] || known[h.address])?.type !== "AMM" && h.owner !== "11111111111111111111111111111111");
    return {
      top10: wallets.length ? wallets.slice(0, 10).reduce((s, h) => s + (Number(h.pct) || 0), 0) : null,
      holders: r.totalHolders ?? null,
      risks: (r.risks || []).filter((x) => x.level === "danger").map((x) => x.name).slice(0, 3),
    };
  } catch {
    return null;
  }
}

/** Should this alert be sent after the check? Pure function. */
export function passesCheck(check, { maxTop10 = null } = {}) {
  if (maxTop10 === null) return true;
  if (!check || check.top10 === null) return true; // no data: let it through rather than go silent
  return check.top10 <= maxTop10;
}

/**
 * Spam filter for copycat launches: the same name and ticker launched again within
 * `windowMs` is a copy. Returns a function that answers "is this launch a copy?".
 */
export function createCopyFilter(windowMs = 10 * 60_000, now = () => Date.now()) {
  const lastSeen = new Map();
  return (launch) => {
    const key = `${String(launch.name).trim().toLowerCase()}|${String(launch.symbol).trim().toLowerCase()}`;
    const t = now();
    const prev = lastSeen.get(key);
    lastSeen.set(key, t);
    if (lastSeen.size > 20000) for (const [k, v] of lastSeen) if (t - v > windowMs) lastSeen.delete(k);
    return prev !== undefined && t - prev < windowMs;
  };
}
