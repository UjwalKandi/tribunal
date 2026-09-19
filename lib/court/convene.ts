/**
 * TRIBUNAL — hearing orchestrator.
 */

import type { HearingEvent } from "@/lib/court/events";
import { LlmTimeoutError, LlmValidationError, llmAvailable } from "@/lib/llm";
import { adjudicate, defend, matchPrecedents, prosecute } from "@/lib/court/counsel";
import {
  getIncident,
  getIncidentByCaseNumber,
  getStoredHearing,
  resetRulingForReplay,
  saveArgument,
  saveRuling,
  createHearing,
} from "@/lib/db/queries";
import type { Incident } from "@/lib/schemas";

export const VETO_WINDOW_SECONDS = 10;

export async function* convene(incidentId: string): AsyncGenerator<HearingEvent> {
  const incident = await getIncident(incidentId);

  if (incident.is_precached) {
    yield* replayPrecached(incident);
    return;
  }

  if (!llmAvailable()) {
    yield {
      type: "hearing.degraded",
      reason: "No model credentials — showing archived hearing",
    };
    const fallback = await getIncidentByCaseNumber("CASE-2281");
    yield* replayPrecached(fallback);
    return;
  }

  try {
    const hearing = await createHearing(incident);
    yield {
      type: "hearing.convened",
      hearingId: hearing.id,
      incidentId: incident.id,
      docketNumber: hearing.docket_number,
      precached: false,
    };

    const precedents = await matchPrecedents(incident.error_signature);
    yield { type: "precedents.retrieved", precedents };

    yield { type: "argument.start", role: "PROSECUTION", sequence: 1 };
    const pros = await prosecute(incident);
    const prosId = await saveArgument(hearing.id, "PROSECUTION", 1, pros);
    yield {
      type: "argument.complete",
      role: "PROSECUTION",
      sequence: 1,
      argumentId: prosId,
      payload: pros,
    };

    yield { type: "argument.start", role: "DEFENSE", sequence: 2 };
    const { output: def, droppedCitations } = await defend(incident, pros, precedents);
    const defId = await saveArgument(hearing.id, "DEFENSE", 2, def);
    yield {
      type: "argument.complete",
      role: "DEFENSE",
      sequence: 2,
      argumentId: defId,
      payload: def,
      droppedCitations,
    };

    yield { type: "argument.start", role: "JUDGE", sequence: 3 };
    const rul = await adjudicate(incident, pros, def, precedents);
    await saveArgument(hearing.id, "JUDGE", 3, rul);
    const ruling = await saveRuling(hearing.id, rul, VETO_WINDOW_SECONDS);
    yield { type: "ruling.delivered", ruling };

    yield {
      type: "veto.window.open",
      rulingId: ruling.id,
      opensAt: ruling.veto_opens_at,
      windowSeconds: VETO_WINDOW_SECONDS,
    };
  } catch (err) {
    if (err instanceof LlmTimeoutError || err instanceof LlmValidationError) {
      yield {
        type: "hearing.degraded",
        reason: err.message,
      };
      const fallback = await getIncidentByCaseNumber("CASE-2281");
      yield* replayPrecached(fallback);
      return;
    }
    throw err;
  }
}

export async function* replayPrecached(incident: Incident): AsyncGenerator<HearingEvent> {
  const stored = await getStoredHearing(incident.id);
  if (!stored) {
    yield { type: "hearing.error", message: "No stored hearing available for replay" };
    return;
  }

  await resetRulingForReplay(stored.ruling.id);

  const precedents = await matchPrecedents(incident.error_signature);

  yield {
    type: "hearing.convened",
    hearingId: stored.hearing.id,
    incidentId: incident.id,
    docketNumber: stored.hearing.docket_number,
    precached: true,
  };

  yield { type: "precedents.retrieved", precedents };

  yield { type: "argument.start", role: "PROSECUTION", sequence: 1 };
  yield {
    type: "argument.complete",
    role: "PROSECUTION",
    sequence: 1,
    argumentId: "precached-pros",
    payload: stored.prosecution,
  };

  yield { type: "argument.start", role: "DEFENSE", sequence: 2 };
  yield {
    type: "argument.complete",
    role: "DEFENSE",
    sequence: 2,
    argumentId: "precached-def",
    payload: stored.defense,
    droppedCitations: [],
  };

  yield { type: "argument.start", role: "JUDGE", sequence: 3 };
  yield { type: "ruling.delivered", ruling: stored.ruling };

  yield {
    type: "veto.window.open",
    rulingId: stored.ruling.id,
    opensAt: stored.ruling.veto_opens_at,
    windowSeconds: stored.ruling.veto_window_seconds,
  };
}
