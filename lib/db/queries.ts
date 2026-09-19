/**
 * TRIBUNAL — database access layer.
 *
 * OWNER: 🅰 wt-court (but 🅲 imports the types)
 * Server-only. The service-role client must never reach a Client Component.
 *
 * All queries live here. No inline supabase calls scattered through the app —
 * when something breaks at 13:30 you want one file to look at.
 */

import type {
  DefenseOutput,
  Hearing,
  Incident,
  ProsecutionOutput,
  Role,
  RulingOutput,
  RulingRecord,
} from "@/lib/schemas";

/* ─────────────────────────── clients ─────────────────────────── */

/** TODO(🅰): createClient with SUPABASE_SERVICE_ROLE_KEY. Server only. */
export function serviceClient() {
  throw new Error("NOT_IMPLEMENTED: serviceClient");
}

/** TODO(🅱): createBrowserClient with the ANON key. Used for Realtime only. */
export function browserClient() {
  throw new Error("NOT_IMPLEMENTED: browserClient");
}

/* ─────────────────────────── reads ─────────────────────────── */

/** The `docket` view: status = AWAITING_HEARING, ordered severity then recency. */
export async function getDocket(): Promise<Incident[]> {
  throw new Error("NOT_IMPLEMENTED: getDocket");
}

export async function getIncident(_id: string): Promise<Incident> {
  throw new Error("NOT_IMPLEMENTED: getIncident");
}

export async function getIncidentByCaseNumber(_caseNumber: string): Promise<Incident> {
  throw new Error("NOT_IMPLEMENTED: getIncidentByCaseNumber");
}

/** Used by the header counter and as the Realtime fallback if the socket drops. */
export async function getPrecedentCount(): Promise<number> {
  throw new Error("NOT_IMPLEMENTED: getPrecedentCount");
}

/** Highest precedent_number + 1. Must be race-safe — wrap in a transaction. */
export async function nextPrecedentNumber(): Promise<number> {
  throw new Error("NOT_IMPLEMENTED: nextPrecedentNumber");
}

export async function getRuling(_rulingId: string): Promise<RulingRecord> {
  throw new Error("NOT_IMPLEMENTED: getRuling");
}

/** For replayPrecached — pulls the stored hearing, arguments, and ruling. */
export async function getStoredHearing(_incidentId: string): Promise<{
  hearing: Hearing;
  prosecution: ProsecutionOutput;
  defense: DefenseOutput;
  ruling: RulingRecord;
} | null> {
  throw new Error("NOT_IMPLEMENTED: getStoredHearing");
}

/* ─────────────────────────── writes ─────────────────────────── */

/**
 * TODO(🅰): docket_number format `DKT-2026-NNNN` where NNNN is the next
 * precedent number — so the docket number visibly tracks the case law. Nice
 * detail, costs nothing, judges notice it.
 */
export async function createHearing(_incident: Incident): Promise<Hearing> {
  throw new Error("NOT_IMPLEMENTED: createHearing");
}

export async function saveArgument(
  _hearingId: string,
  _role: Role,
  _sequence: 1 | 2 | 3,
  _payload: ProsecutionOutput | DefenseOutput | RulingOutput,
): Promise<string> {
  throw new Error("NOT_IMPLEMENTED: saveArgument");
}

/** Sets veto_opens_at = now(), veto_window_seconds, hearings.state = 'RULED'. */
export async function saveRuling(
  _hearingId: string,
  _output: RulingOutput,
  _vetoWindowSeconds: number,
): Promise<RulingRecord> {
  throw new Error("NOT_IMPLEMENTED: saveRuling");
}

export async function markExecuted(
  _rulingId: string,
  _authority: "AUTONOMOUS" | "HUMAN_CONFIRMED",
): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: markExecuted");
}

export async function insertPrecedent(_row: {
  precedent_number: number;
  citation: string;
  ruling_id: string;
  incident_id: string;
  holding: string;
  summary: string;
  verdict: string;
  outcome: string;
  embedding: number[] | null;
  is_seeded: false;
}): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: insertPrecedent");
}

export async function insertVeto(
  _rulingId: string,
  _secondsRemaining: number,
  _reason?: string,
): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: insertVeto");
}

export async function setHearingState(
  _hearingId: string,
  _state: Hearing["state"],
): Promise<void> {
  throw new Error("NOT_IMPLEMENTED: setHearingState");
}
