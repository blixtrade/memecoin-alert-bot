import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { numberFlag } from "../lib/options.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cli = join(root, "bin", "alert-bot.js");

/** Spawn the real CLI offline. Kills it if it fails to exit, so a regression
 *  (which would otherwise open the live feed and hang) fails instead of hanging. */
function runCli(args, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], {
      cwd: root,
      env: { ...process.env, NO_COLOR: "1", BLIX_NO_FOOTER: "1" },
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`CLI did not exit within ${timeoutMs}ms (stderr: ${JSON.stringify(stderr)})`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", (err) => { if (!settled) { settled = true; clearTimeout(timer); reject(err); } });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

test("numberFlag returns undefined when absent and coerces valid values", () => {
  assert.equal(numberFlag({}, "max-top10"), undefined);
  assert.equal(numberFlag({ "max-top10": "30" }, "max-top10"), 30);
  assert.equal(numberFlag({ "min-dev-buy": "0" }, "min-dev-buy"), 0);
  assert.equal(numberFlag({ "max-per-min": "5.5" }, "max-per-min", { min: 1 }), 5.5);
});

test("numberFlag rejects non-numeric, negative and bare-flag values", () => {
  for (const raw of ["30%", "abc", "", "two", true, Infinity, -1]) {
    assert.throws(() => numberFlag({ f: raw }, "f"), /--f must be a number/, `raw=${String(raw)}`);
  }
  assert.throws(() => numberFlag({ f: "0" }, "f", { min: 1 }), /--f must be a number/);
});

test("a non-numeric --max-top10 fails fast before connecting", async () => {
  const { code, stderr } = await runCli(["--max-top10", "30%"]);
  assert.equal(code, 1, `expected exit 1, got ${code}; stderr: ${stderr}`);
  assert.match(stderr, /--max-top10/);
  assert.match(stderr, /30%/);
});

test("a non-numeric --max-per-min fails fast before connecting", async () => {
  const { code, stderr } = await runCli(["--max-per-min", "abc"]);
  assert.equal(code, 1, `expected exit 1, got ${code}; stderr: ${stderr}`);
  assert.match(stderr, /--max-per-min/);
  assert.match(stderr, /abc/);
});

test("a non-numeric --min-dev-buy fails fast before connecting", async () => {
  const { code, stderr } = await runCli(["--min-dev-buy", "two"]);
  assert.equal(code, 1, `expected exit 1, got ${code}; stderr: ${stderr}`);
  assert.match(stderr, /--min-dev-buy/);
  assert.match(stderr, /two/);
});

test("zero is a valid numeric flag value, not a falsy default", () => {
  assert.equal(numberFlag({ "min-dev-buy": "0" }, "min-dev-buy"), 0);
  assert.equal(numberFlag({ "max-top10": "0" }, "max-top10"), 0);
});
