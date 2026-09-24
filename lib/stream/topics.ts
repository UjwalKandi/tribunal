/**
 * TRIBUNAL — Kafka topic contract for Confluent Cloud.
 *
 * Each topic carries a flat JSON Schema registered in Schema Registry so that
 * Confluent Cloud for Apache Flink can read it as a table without extra DDL.
 * Rich payloads (arguments, remediation orders) travel as JSON strings; Flink
 * reaches into them with JSON_VALUE when it needs to.
 *
 * Enums are lifted from lib/schemas.ts so the Zod contract stays the source of truth.
 */

import { Authority, Role, Severity, Verdict } from "@/lib/schemas";

export const TOPICS = {
  incidents: "tribunal.incidents",
  hearingEvents: "tribunal.hearing-events",
  rulings: "tribunal.rulings",
  vetoes: "tribunal.vetoes",
  executions: "tribunal.executions",
  precedents: "tribunal.precedents",
} as const;

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS];

/** `tick` rows exist only to advance Flink watermarks on otherwise quiet topics. */
const kind = { type: "string", enum: ["event", "tick"] };
const str = { type: "string" };
const nullableStr = { type: ["string", "null"] };
const int = { type: "integer" };
const num = { type: "number" };

function record(title: string, properties: Record<string, unknown>): object {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title,
    type: "object",
    additionalProperties: false,
    properties,
    required: Object.keys(properties),
  };
}

export const TOPIC_SCHEMAS: Record<TopicName, object> = {
  /** Written by confluent/flink/04_incidents_from_github.sql from the GitHub Source connector. */
  [TOPICS.incidents]: record("Incident", {
    incident_id: str,
    case_number: str,
    title: str,
    service: str,
    severity: { type: "string", enum: Severity.options },
    raw_log: str,
    error_signature: str,
    source_url: str,
    occurred_at: str,
  }),

  [TOPICS.hearingEvents]: record("HearingEvent", {
    hearing_id: str,
    incident_id: str,
    event_type: str,
    role: { type: ["string", "null"], enum: [...Role.options, null] },
    precached: { type: "boolean" },
    /** The full HearingEvent from lib/court/events.ts, serialized. */
    payload_json: str,
    emitted_at: str,
  }),

  [TOPICS.rulings]: record("RulingOpened", {
    kind,
    ruling_id: str,
    hearing_id: str,
    incident_id: str,
    verdict: { type: "string", enum: [...Verdict.options, "NONE"] },
    holding: str,
    confidence: num,
    cited_precedent_ids: { type: "array", items: str },
    /** veto_opens_at from the ruling row. Joins a veto/execution to one arming. */
    opened_at: str,
    window_seconds: int,
  }),

  [TOPICS.vetoes]: record("Veto", {
    kind,
    ruling_id: str,
    opened_at: str,
    vetoed_at: str,
    seconds_remaining: int,
    reason: nullableStr,
  }),

  [TOPICS.executions]: record("Execution", {
    ruling_id: str,
    hearing_id: str,
    incident_id: str,
    verdict: str,
    holding: str,
    opened_at: str,
    authority: { type: "string", enum: Authority.options },
    decided_by: str,
  }),

  [TOPICS.precedents]: record("Precedent", {
    citation: str,
    precedent_number: int,
    ruling_id: str,
    incident_id: str,
    verdict: str,
    holding: str,
    authority: { type: "string", enum: Authority.options },
    bound_at: str,
  }),
};
