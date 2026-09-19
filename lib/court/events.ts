/**
 * TRIBUNAL — streaming event contract between the hearing engine (🅰) and the
 * courtroom UI (🅱).
 *
 * OWNER: nobody. FROZEN at 10:30 AM alongside lib/schemas.ts.
 * This is the single interface between two worktrees. 🅰 emits these, 🅱 renders
 * them. Neither side needs to know anything else about the other.
 *
 * ── DESIGN DECISION, DO NOT "IMPROVE" THIS ──────────────────────────────────
 * We do NOT token-stream the LLM. The server generates each argument in full,
 * Zod-validates it, persists it, and THEN emits `argument.complete` with the
 * finished text. The CLIENT performs the typewriter effect (~35ms/char).
 *
 * Why: (1) the pre-cached CASE-2281 path and the live path become byte-identical
 * from the UI's perspective; (2) a Zod failure can never leave half an invalid
 * argument on screen; (3) no partial-JSON parsing. The drama is a CSS-timed
 * illusion, which is exactly what we want on a stage.
 * ────────────────────────────────────────────────────────────────────────────
 */

import type {
  Authority,
  DefenseOutput,
  PrecedentMatch,
  ProsecutionOutput,
  Role,
  RulingRecord,
} from "@/lib/schemas";

export type HearingEvent =
  /** Docket row created. UI swaps the stage out of its empty state. */
  | {
      type: "hearing.convened";
      hearingId: string;
      incidentId: string;
      docketNumber: string;
      /** true = replaying a stored hearing, zero model calls. */
      precached: boolean;
    }

  /** Right panel populates. Emitted BEFORE any argument so citations resolve. */
  | { type: "precedents.retrieved"; precedents: PrecedentMatch[] }

  /** UI mounts an empty ArgumentBlock and starts its "deliberating" affordance. */
  | { type: "argument.start"; role: Role; sequence: 1 | 2 | 3 }

  /** Full validated argument. UI types it out. */
  | {
      type: "argument.complete";
      role: "PROSECUTION";
      sequence: 1;
      argumentId: string;
      payload: ProsecutionOutput;
    }
  | {
      type: "argument.complete";
      role: "DEFENSE";
      sequence: 2;
      argumentId: string;
      payload: DefenseOutput;
      /** Citations the model invented and we stripped. Log only, never render. */
      droppedCitations: string[];
    }

  /** Serif opinion renders + speechSynthesis fires. */
  | { type: "ruling.delivered"; ruling: RulingRecord }

  /** Brass countdown mounts. Client drives the timer off these two values. */
  | {
      type: "veto.window.open";
      rulingId: string;
      opensAt: string;
      windowSeconds: number;
    }

  /** Timer expired with no veto. The beat the whole demo exists for. */
  | {
      type: "ruling.executed";
      rulingId: string;
      authority: Authority;
      precedentNumber: number;
      citation: string;
    }

  /** Human hit VETO in time. Recorded as dissent. */
  | { type: "ruling.vetoed"; rulingId: string; secondsRemaining: number }

  /**
   * Live generation failed. UI MUST show:
   * "GENERATION UNAVAILABLE — SHOWING ARCHIVED HEARING"
   * and then continue with the pre-cached events. Never a blank screen,
   * never a spinner that hangs.
   */
  | { type: "hearing.degraded"; reason: string }

  /** Unrecoverable. UI shows a styled error card with this message visible. */
  | { type: "hearing.error"; message: string };

export type HearingEventType = HearingEvent["type"];

/* ─────────────────────── wire format (SSE) ─────────────────────── */

/** Server: `res.write(encodeEvent(e))`. One JSON object per SSE data frame. */
export function encodeEvent(event: HearingEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Client: parse a single SSE data payload. Returns null on malformed input. */
export function decodeEvent(raw: string): HearingEvent | null {
  try {
    return JSON.parse(raw) as HearingEvent;
  } catch {
    return null;
  }
}

/**
 * Canonical emission order. 🅱 can rely on this absolutely.
 *
 *   hearing.convened
 *   precedents.retrieved
 *   argument.start   (PROSECUTION, 1)
 *   argument.complete(PROSECUTION, 1)
 *   argument.start   (DEFENSE, 2)
 *   argument.complete(DEFENSE, 2)
 *   argument.start   (JUDGE, 3)
 *   ruling.delivered
 *   veto.window.open
 *   ── stream stays open for the full 60s ──
 *   ruling.executed | ruling.vetoed
 *
 * `hearing.degraded` may appear at any point. `hearing.error` terminates.
 */
export const EMISSION_ORDER: readonly HearingEventType[] = [
  "hearing.convened",
  "precedents.retrieved",
  "argument.start",
  "argument.complete",
  "argument.start",
  "argument.complete",
  "argument.start",
  "ruling.delivered",
  "veto.window.open",
] as const;
