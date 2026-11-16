/**
 * GitHub can start scheduled workflows late or drop them, so each update slot
 * (08:00, 15:00, 22:00 IST) has three cron triggers. This check lets only the
 * first one that fires in a slot do the work; the backups exit early.
 * Manual runs (workflow_dispatch) always proceed.
 */
import fs from "node:fs";

const SLOTS_IST = [8, 15, 22];
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const now = Date.now();

// Latest slot start at or before now, as a UTC timestamp.
const istNow = new Date(now + IST_OFFSET_MS);
let slotStart = null;
for (let back = 0; back <= 1 && slotStart === null; back++) {
  for (const h of [...SLOTS_IST].reverse()) {
    const t = Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() - back, h) - IST_OFFSET_MS;
    if (t <= now) { slotStart = t; break; }
  }
}

const event = process.env.GITHUB_EVENT_NAME ?? "local";
let skip = false;
let reason = "manual run";
if (event === "schedule") {
  const runs = fs.existsSync("data/state/runs.json") ? JSON.parse(fs.readFileSync("data/state/runs.json", "utf8")) : [];
  const done = runs.find((r) => r.status === "success" && String(r.trigger).startsWith("github:schedule") && Date.parse(r.startedAt) >= slotStart);
  skip = Boolean(done);
  reason = done ? `slot starting ${new Date(slotStart).toISOString()} already updated at ${done.startedAt}` : `first run for slot starting ${new Date(slotStart).toISOString()}`;
}
console.log(`${skip ? "Skip" : "Run"}: ${reason}`);
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `skip=${skip}\n`);
