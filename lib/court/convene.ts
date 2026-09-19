/**
 * TRIBUNAL — hearing orchestrator.
 *
 * OWNER: 🅰 wt-court
 *
 * Emits the canonical event sequence from lib/court/events.ts. Two paths —
 * precached and live — emit IDENTICAL event shapes, which is why the UI never
 * needs to know which one it is watching.
 *
 * STRICTLY SEQUENTIAL. Do not parallelize the arguments. The sequencing is the
 * drama. Prosecution finishes, then Defense begins, then the Judge appears.
 */

import type { HearingEvent } from "@/lib/court/events";
import { llmAvailable } from "@/lib/llm";
import { adjudicate, defend, matchPrecedents, prosecute } from "@/lib/court/counsel";

export const VETO_WINDOW_SECONDS = 60;

/**
 * Async generator so the API route can `for await` and write SSE frames as each
 * event lands. Never buffer the whole hearing and flush at the end.
 */
export async function* convene(_incidentId: string): AsyncGenerator<HearingEvent> {
  /*
   * TODO(🅰) — implement in exactly this order:
   *
   *  1. incident = getIncident(incidentId)
   *
   *  2. if (incident.is_precached || !llmAvailable())
   *        yield* replayPrecached(incident)        ← CASE-2281, demo video path
   *        return
   *
   *  3. hearing = createHearing(incident)          // state CONVENED
   *     yield { type: "hearing.convened", ..., precached: false }
   *
   *  4. precedents = await matchPrecedents(incident.error_signature)
   *     yield { type: "precedents.retrieved", precedents }
   *     // MUST come before any argument so the UI can resolve citations
   *
   *  5. yield { type: "argument.start", role: "PROSECUTION", sequence: 1 }
   *     pros = await prosecute(incident)
   *     argumentId = await saveArgument(hearing.id, "PROSECUTION", 1, pros)
   *     yield { type: "argument.complete", role: "PROSECUTION", sequence: 1, argumentId, payload: pros }
   *
   *  6. yield { type: "argument.start", role: "DEFENSE", sequence: 2 }
   *     { output: def, droppedCitations } = await defend(incident, pros, precedents)
   *     argumentId = await saveArgument(hearing.id, "DEFENSE", 2, def)
   *     yield { type: "argument.complete", role: "DEFENSE", sequence: 2, argumentId, payload: def, droppedCitations }
   *
   *  7. yield { type: "argument.start", role: "JUDGE", sequence: 3 }
   *     rul = await adjudicate(incident, pros, def, precedents)
   *     await saveArgument(hearing.id, "JUDGE", 3, rul)
   *     ruling = await saveRuling(hearing.id, rul, VETO_WINDOW_SECONDS)   // state RULED
   *     yield { type: "ruling.delivered", ruling }
   *
   *  8. yield { type: "veto.window.open", rulingId: ruling.id,
   *             opensAt: ruling.veto_opens_at, windowSeconds: VETO_WINDOW_SECONDS }
   *
   *  9. Keep the stream open. The client drives the countdown and POSTs to
   *     /api/veto or /api/execute. Do NOT sleep 60s on the server — a serverless
   *     function will time out and kill the demo at the worst possible moment.
   *
   * ── ERROR HANDLING ──
   * Wrap steps 5-7. On LlmTimeoutError or LlmValidationError:
   *     yield { type: "hearing.degraded", reason }
   *     yield* replayPrecached(CASE_2281)
   *     return
   * The demo must never dead-end on a spinner. Degrade visibly, then continue.
   */
  throw new Error("NOT_IMPLEMENTED: convene");
}

/**
 * Replays a stored hearing from the database with ZERO model calls.
 *
 * This is the demo-safety guarantee. It must emit the same event sequence, with
 * `precached: true`, reading arguments and the ruling straight from Postgres.
 *
 * TODO(🅰): reuse the existing hearing/ruling rows for CASE-2281 rather than
 * inserting new ones — re-running the demo must not corrupt seeded state.
 * Reset `executed_at` and `veto_opens_at` on replay so the countdown starts fresh.
 */
export async function* replayPrecached(
  _incident: unknown,
): AsyncGenerator<HearingEvent> {
  throw new Error("NOT_IMPLEMENTED: replayPrecached");
}
