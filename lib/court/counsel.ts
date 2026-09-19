/**
 * TRIBUNAL — the three counsel functions.
 *
 * OWNER: 🅰 wt-court
 * Signatures are FROZEN. Bodies are yours. Each returns Zod-validated output or
 * throws — never returns partial or unvalidated data.
 */

import {
  DefenseOutput,
  Incident,
  PrecedentMatch,
  ProsecutionOutput,
  RulingOutput,
  rejectFabricatedCitations,
} from "@/lib/schemas";
import { complete, TEMPERATURE, embed } from "@/lib/llm";
import {
  DEFENSE_SYSTEM,
  JUDGE_SYSTEM,
  PROSECUTION_SYSTEM,
} from "@/lib/court/prompts";

/* ───────────────────────── precedent retrieval ───────────────────────── */

/**
 * Vector search over the case-law database via the `match_precedents` rpc.
 *
 * TODO(🅰):
 *   1. embed(errorSignature)
 *   2. supabase.rpc("match_precedents", { query_embedding, match_threshold, match_count })
 *   3. Validate each row with PrecedentMatch
 *   4. Sort so REMEDIATION_WORSENED rows appear first — the Defense needs its
 *      best ammunition at the top of the list, and the right panel reads better
 *
 * Never build ad-hoc similarity SQL. The rpc is the only entry point.
 */
export async function matchPrecedents(
  _errorSignature: string,
  _threshold = 0.72,
  _count = 5,
): Promise<PrecedentMatch[]> {
  throw new Error("NOT_IMPLEMENTED: matchPrecedents");
}

/* ──────────────────────────── prosecution ──────────────────────────── */

/**
 * TODO(🅰): complete({ system: PROSECUTION_SYSTEM, schema: ProsecutionOutput,
 *                      temperature: TEMPERATURE.PROSECUTION, label: "prosecution" })
 *
 * User message must include: case_number, service, dag_id, severity,
 * error_signature, and the FULL raw_log. The log is the evidence — do not
 * truncate it. Truncating it is why the model starts inventing log lines.
 */
export async function prosecute(_incident: Incident): Promise<ProsecutionOutput> {
  throw new Error("NOT_IMPLEMENTED: prosecute");
}

/* ───────────────────────────── defense ───────────────────────────── */

/**
 * TODO(🅰): complete({ system: DEFENSE_SYSTEM, schema: DefenseOutput, ... })
 *
 * User message must include the incident, the Prosecution's body + motion, and
 * the retrieved precedents rendered as a numbered list with citation, holding,
 * verdict, outcome, mttr_minutes.
 *
 * THEN — non-negotiable — run rejectFabricatedCitations() on the result and
 * return the dropped list to the caller so it can be logged and emitted on
 * `argument.complete`. A hallucinated TRIB number that a judge spots is the
 * single fastest way to lose this. Never render dropped citations.
 */
export async function defend(
  _incident: Incident,
  _prosecution: ProsecutionOutput,
  _precedents: PrecedentMatch[],
): Promise<{ output: DefenseOutput; droppedCitations: string[] }> {
  throw new Error("NOT_IMPLEMENTED: defend");
}

/* ────────────────────────────── judge ────────────────────────────── */

/**
 * TODO(🅰): complete({ system: JUDGE_SYSTEM, schema: RulingOutput,
 *                      temperature: TEMPERATURE.JUDGE, label: "judge" })
 *
 * User message must include the incident, BOTH arguments in full, the retrieved
 * precedents, and an explicit instruction naming the Defense's strongest cited
 * precedent that the Judge is required to address.
 *
 * Then apply rejectFabricatedCitations to cited_precedent_ids. If that leaves
 * the array empty, the schema's .min(1) will fail — retry once, then fall back.
 */
export async function adjudicate(
  _incident: Incident,
  _prosecution: ProsecutionOutput,
  _defense: DefenseOutput,
  _precedents: PrecedentMatch[],
): Promise<RulingOutput> {
  throw new Error("NOT_IMPLEMENTED: adjudicate");
}
