/**
 * TRIBUNAL — execution and veto.
 */

import type { HearingEvent } from "@/lib/court/events";
import { embed } from "@/lib/llm";
import {
  getExistingExecution,
  getHearingIncidentId,
  getRuling,
  hasVeto,
  insertPrecedent,
  insertVeto,
  markExecuted,
  nextPrecedentNumber,
} from "@/lib/db/queries";

export async function executeRuling(
  rulingId: string,
): Promise<Extract<HearingEvent, { type: "ruling.executed" }>> {
  const existing = await getExistingExecution(rulingId);
  if (existing) {
    return {
      type: "ruling.executed",
      rulingId,
      authority: "AUTONOMOUS",
      precedentNumber: existing.precedentNumber,
      citation: existing.citation,
    };
  }

  const ruling = await getRuling(rulingId);

  if (await hasVeto(rulingId)) {
    throw new Error("Ruling was vetoed");
  }

  await markExecuted(rulingId, "AUTONOMOUS");

  const n = await nextPrecedentNumber();
  const citation = `TRIB-${String(n).padStart(4, "0")}`;
  const incidentId = await getHearingIncidentId(ruling.hearing_id);

  let embedding: number[] | null = null;
  try {
    embedding = await embed(ruling.holding);
  } catch (err) {
    console.error("[executeRuling] embedding failed, inserting null:", err);
  }

  await insertPrecedent({
    precedent_number: n,
    citation,
    ruling_id: rulingId,
    incident_id: incidentId,
    holding: ruling.holding,
    summary: ruling.opinion.slice(0, 400),
    verdict: ruling.verdict,
    outcome: "UNKNOWN",
    embedding,
    is_seeded: false,
  });

  return {
    type: "ruling.executed",
    rulingId,
    authority: "AUTONOMOUS",
    precedentNumber: n,
    citation,
  };
}

export async function vetoRuling(
  rulingId: string,
  secondsRemainingArg: number,
  reason?: string,
): Promise<Extract<HearingEvent, { type: "ruling.vetoed" }>> {
  const ruling = await getRuling(rulingId);

  if (ruling.executed_at) {
    throw new Error("Ruling already executed");
  }

  const remaining = secondsRemaining(ruling.veto_opens_at, ruling.veto_window_seconds);
  if (remaining <= 0) {
    throw new Error("Veto window has closed");
  }

  await insertVeto(rulingId, secondsRemainingArg, reason);

  return {
    type: "ruling.vetoed",
    rulingId,
    secondsRemaining: secondsRemainingArg,
  };
}

export function secondsRemaining(
  vetoOpensAt: string,
  windowSeconds: number,
  now: Date = new Date(),
): number {
  const elapsed = (now.getTime() - new Date(vetoOpensAt).getTime()) / 1000;
  return Math.max(0, Math.ceil(windowSeconds - elapsed));
}
