// CLI option helpers shared by the entry points. Kept out of core.js because
// that file is shared word-for-word with the other Blix Trade tools.

/**
 * Read a numeric flag from already-parsed argv and fail fast on typos.
 *
 * `parseArgs` leaves a bare `--flag` as boolean `true`, and `Number("")` is 0,
 * so both are rejected here instead of silently becoming a usable value.
 * Returns `undefined` when the flag is absent so callers can apply a default.
 *
 * @param {object} args  parsed argv (see parseArgs in core.js)
 * @param {string} name  flag name without the leading `--`
 * @param {{ min?: number }} [opts]  smallest accepted value (default 0, so negatives are rejected)
 */
export function numberFlag(args, name, { min = 0 } = {}) {
  const raw = args[name];
  if (raw === undefined) return undefined;
  const valid = (typeof raw === "string" && raw.trim() !== "") || typeof raw === "number";
  const value = valid ? Number(raw) : NaN;
  if (!Number.isFinite(value) || value < min) {
    throw new Error(`--${name} must be a number, got ${JSON.stringify(raw)}`);
  }
  return value;
}
