/**
 * TRIBUNAL — court records onto the stream.
 *
 * Maps hearing objects (lib/schemas.ts, lib/court/events.ts) to the flat topic
 * rows in lib/stream/topics.ts. Every timestamp goes through iso() so the
 * opened_at join key is byte-identical whether it came from fixtures or Postgres.
 */

import type { HearingEvent } from "@/lib/court/events";
import type { RulingRecord } from "@/lib/schemas";
import { publish } from "@/lib/stream/kafka";
import { TOPICS } from "@/lib/stream/topics";

export const iso = (t: string | Date = new Date()) => new Date(t).toISOString();

export function publishHearingEvent(
  event: HearingEvent,
  ctx: { hearingId: string; incidentId: string; precached: boolean },
): Promise<boolean> {
  return publish(TOPICS.hearingEvents, ctx.hearingId, {
    hearing_id: ctx.hearingId,
    incident_id: ctx.incidentId,
    event_type: event.type,
    role: "role" in event ? event.role : null,
    precached: ctx.precached,
    payload_json: JSON.stringify(event),
    emitted_at: iso(),
  });
}

/** The veto window is open. 02_veto_window.sql starts its 10-second clock here. */
export function publishRulingOpened(ruling: RulingRecord, incidentId: string): Promise<boolean> {
  return publish(TOPICS.rulings, ruling.id, {
    kind: "event",
    ruling_id: ruling.id,
    hearing_id: ruling.hearing_id,
    incident_id: incidentId,
    verdict: ruling.verdict,
    holding: ruling.holding,
    confidence: ruling.confidence,
    cited_precedent_ids: ruling.cited_precedent_ids,
    opened_at: iso(ruling.veto_opens_at),
    window_seconds: ruling.veto_window_seconds,
  });
}

export function publishVeto(
  ruling: RulingRecord,
  secondsRemaining: number,
  reason?: string,
): Promise<boolean> {
  return publish(TOPICS.vetoes, ruling.id, {
    kind: "event",
    ruling_id: ruling.id,
    opened_at: iso(ruling.veto_opens_at),
    vetoed_at: iso(),
    seconds_remaining: secondsRemaining,
    reason: reason ?? null,
  });
}

export function publishPrecedent(
  executed: Extract<HearingEvent, { type: "ruling.executed" }>,
  ruling: RulingRecord,
  incidentId: string,
): Promise<boolean> {
  return publish(TOPICS.precedents, executed.citation, {
    citation: executed.citation,
    precedent_number: executed.precedentNumber,
    ruling_id: ruling.id,
    incident_id: incidentId,
    verdict: ruling.verdict,
    holding: ruling.holding,
    authority: executed.authority,
    bound_at: iso(),
  });
}
