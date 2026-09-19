/**
 * TRIBUNAL — execution and veto.
 *
 * OWNER: 🅰 wt-court
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ NOTHING IN THIS FILE EXECUTES ANYTHING.                                  │
 * │ "Execution" means: write rows to Postgres and render text.               │
 * │ No shell commands. No pipeline calls. No external writes. Ever.          │
 * │ This is a constitution-level rule. See .cursor/rules/000-constitution.mdc│
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * This file contains the single most important beat of the demo: the veto window
 * expires, and the machine records its own decision as binding precedent.
 */

import type { HearingEvent } from "@/lib/court/events";
import { embed } from "@/lib/llm";

/**
 * Called when the countdown reaches zero without a veto.
 *
 * TODO(🅰):
 *   1. ruling = getRuling(rulingId)
 *
 *   2. GUARD: if ruling.executed_at is already set, return the existing
 *      precedent instead of inserting again. The demo gets run 3+ times and a
 *      double-execute will desync the counter on stage.
 *
 *   3. GUARD: verify (now - veto_opens_at) >= veto_window_seconds. Reject early
 *      calls. The client is not trusted with the deadline.
 *
 *   4. GUARD: if a veto row exists for this ruling, do nothing.
 *
 *   5. UPDATE rulings SET executed_at = now(), authority = 'AUTONOMOUS'
 *      UPDATE hearings SET state = 'EXECUTED', concluded_at = now()
 *
 *   6. n = nextPrecedentNumber()                      // 1205 -> 1206
 *      citation = `TRIB-${String(n).padStart(4, "0")}`
 *
 *   7. INSERT INTO precedents {
 *           precedent_number: n,
 *           citation,
 *           ruling_id, incident_id,
 *           holding:  ruling.holding,        // ← the Judge's own binding rule
 *           summary:  ruling.opinion.slice(0, 400),
 *           verdict:  ruling.verdict,
 *           outcome:  "UNKNOWN",             // honest — we don't know yet
 *           embedding: await embed(ruling.holding),   // ← now retrievable
 *           is_seeded: false,
 *      }
 *
 *      Step 7 is the flywheel. The embedding is what allows CASE-4417's hearing
 *      to retrieve and cite this ruling minutes later. If the embed call fails,
 *      still insert the row with a null embedding and log loudly — a visible
 *      precedent that can't be retrieved is far better than no precedent.
 *
 *   8. Supabase Realtime on `precedents` drives the counter 1,205 -> 1,206 in
 *      the UI. No manual push needed.
 */
export async function executeRuling(_rulingId: string): Promise<
  Extract<HearingEvent, { type: "ruling.executed" }>
> {
  throw new Error("NOT_IMPLEMENTED: executeRuling");
}

/**
 * Human exercised the veto inside the window. Recorded as dissent.
 *
 * TODO(🅰):
 *   1. GUARD: if ruling.executed_at is set, the window already closed — reject.
 *   2. INSERT INTO vetoes { ruling_id, seconds_remaining, reason }
 *   3. UPDATE hearings SET state = 'VETOED', concluded_at = now()
 *   4. Do NOT insert a precedent. An overruled decision binds nothing.
 *
 * Note: the veto path exists to prove the window is real, not decorative. In the
 * recorded demo we deliberately let it expire. Keep this working anyway — a judge
 * in the room may ask you to click it.
 */
export async function vetoRuling(
  _rulingId: string,
  _secondsRemaining: number,
  _reason?: string,
): Promise<Extract<HearingEvent, { type: "ruling.vetoed" }>> {
  throw new Error("NOT_IMPLEMENTED: vetoRuling");
}

/** Server-authoritative remaining seconds. The client clock is never trusted. */
export function secondsRemaining(
  vetoOpensAt: string,
  windowSeconds: number,
  now: Date = new Date(),
): number {
  const elapsed = (now.getTime() - new Date(vetoOpensAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(windowSeconds - elapsed));
}
