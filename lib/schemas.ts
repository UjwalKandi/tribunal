/**
 * TRIBUNAL — shared contract
 *
 * OWNER: nobody. This file is FROZEN at 10:30 AM.
 * All three worktrees import from here. If you need to change it, announce it
 * out loud and merge to main immediately — silent edits here cause the only
 * merge conflicts that can actually cost us the day.
 *
 * Every LLM response is validated against one of these before it touches the
 * UI or the database. See docs/AGENTS.md for the matching system prompts.
 */

import { z } from "zod";

/* ─────────────────────────── enums ─────────────────────────── */

export const Verdict = z.enum(["REMEDIATE", "HOLD", "DISMISS"]);
export type Verdict = z.infer<typeof Verdict>;

export const Role = z.enum(["PROSECUTION", "DEFENSE", "JUDGE"]);
export type Role = z.infer<typeof Role>;

export const Severity = z.enum(["P1", "P2", "P3"]);
export type Severity = z.infer<typeof Severity>;

export const HearingState = z.enum([
  "CONVENED",
  "ARGUED",
  "RULED",
  "EXECUTED",
  "VETOED",
]);
export type HearingState = z.infer<typeof HearingState>;

export const PrecedentOutcome = z.enum([
  "REMEDIATION_SUCCEEDED",
  "REMEDIATION_WORSENED",
  "HOLD_CORRECT",
  "UNKNOWN",
]);
export type PrecedentOutcome = z.infer<typeof PrecedentOutcome>;

export const Authority = z.enum(["AUTONOMOUS", "HUMAN_CONFIRMED"]);
export type Authority = z.infer<typeof Authority>;

/** Citation format is load-bearing: it is how we detect a fabricated precedent. */
export const Citation = z.string().regex(/^TRIB-\d{4}$/, "must match TRIB-0000");

/* ──────────────────────── db row shapes ─────────────────────── */

export const Incident = z.object({
  id: z.string().uuid(),
  case_number: z.string(),
  title: z.string(),
  service: z.string(),
  dag_id: z.string().nullable(),
  severity: Severity,
  raw_log: z.string(),
  error_signature: z.string(),
  source_url: z.string().nullable(),
  occurred_at: z.string(),
  status: z.string(),
  is_precached: z.boolean(),
});
export type Incident = z.infer<typeof Incident>;

export const PrecedentMatch = z.object({
  id: z.string().uuid(),
  precedent_number: z.number().int(),
  citation: z.string(),
  holding: z.string(),
  summary: z.string(),
  verdict: Verdict,
  outcome: PrecedentOutcome,
  mttr_minutes: z.number().int().nullable(),
  similarity: z.number(),
});
export type PrecedentMatch = z.infer<typeof PrecedentMatch>;

export const Hearing = z.object({
  id: z.string().uuid(),
  incident_id: z.string().uuid(),
  docket_number: z.string(),
  convened_at: z.string(),
  concluded_at: z.string().nullable(),
  state: HearingState,
});
export type Hearing = z.infer<typeof Hearing>;

export const RulingRecord = z.object({
  id: z.string().uuid(),
  hearing_id: z.string().uuid(),
  verdict: Verdict,
  opinion: z.string(),
  holding: z.string(),
  remediation_order: z.array(
    z.object({ step: z.number().int(), action: z.string(), rationale: z.string() }),
  ),
  confidence: z.number(),
  cited_precedent_ids: z.array(z.string()),
  veto_window_seconds: z.number().int(),
  veto_opens_at: z.string(),
  executed_at: z.string().nullable(),
  authority: Authority.nullable(),
});
export type RulingRecord = z.infer<typeof RulingRecord>;

/* ───────────────────── llm output contracts ──────────────────── */

export const ProsecutionOutput = z.object({
  respondent: z.string().min(2).max(80),
  body: z.string().min(200).max(1200),
  claims: z
    .array(
      z.object({
        claim: z.string().min(10),
        /** MUST be a literal fragment lifted from incident.raw_log. */
        evidence: z.string().min(5),
      }),
    )
    .min(2)
    .max(4),
  harm: z.string().min(10).max(300),
  motion: z.string().min(10).max(300),
});
export type ProsecutionOutput = z.infer<typeof ProsecutionOutput>;

export const DefenseOutput = z.object({
  body: z.string().min(200).max(1200),
  cited_precedents: z
    .array(z.object({ citation: Citation, relevance: z.string().min(10) }))
    .max(5),
  theory: z.enum(["UPSTREAM_CAUSE", "PRECEDENT_HARM", "INSUFFICIENT_EVIDENCE"]),
  alternative: z.string().min(10).max(300),
});
export type DefenseOutput = z.infer<typeof DefenseOutput>;

export const RulingOutput = z.object({
  verdict: Verdict,
  /** Read aloud by speechSynthesis. Written for the ear. No markdown. */
  opinion: z.string().min(400).max(1400),
  /** The single most important string in this project. It becomes precedent. */
  holding: z.string().min(20).max(240),
  remediation_order: z
    .array(
      z.object({
        step: z.number().int().positive(),
        action: z.string().min(5),
        rationale: z.string().min(5),
      }),
    )
    .min(2)
    .max(4),
  confidence: z.number().min(0).max(1),
  cited_precedent_ids: z.array(Citation).min(1),
  addressed_defense_precedent: z.string(),
  disposition: z.string().min(10).max(200),
});
export type RulingOutput = z.infer<typeof RulingOutput>;

/* ───────────────────── anti-fabrication guard ──────────────────── */

/**
 * Strips any citation the model invented that was not in the retrieved set.
 * Run this on EVERY Defense and Judge output before persisting.
 * A hallucinated TRIB number that a judge notices ends the demo's credibility.
 */
export function rejectFabricatedCitations<T extends { citation: string }>(
  cited: T[],
  retrieved: PrecedentMatch[],
): { kept: T[]; dropped: string[] } {
  const allowed = new Set(retrieved.map((p) => p.citation));
  const kept = cited.filter((c) => allowed.has(c.citation));
  const dropped = cited.filter((c) => !allowed.has(c.citation)).map((c) => c.citation);
  return { kept, dropped };
}
