/**
 * TRIBUNAL — the court's memory and intake are both Kafka topics.
 *
 * tribunal.precedents: every executed ruling. Replayed from offset 0 on boot,
 *   so a restart forgets nothing — TRIB-1206 is still retrievable and still
 *   binds the next hearing. Kafka, not process memory, is the system of record.
 * tribunal.incidents: fed by the GitHub Source connector (via Flink). New
 *   failures land on the docket without anyone touching the app.
 *
 * Both are followed live after the initial catch-up. Fixture mode only; with
 * Supabase configured, Postgres already persists both.
 */

import { randomUUID } from "node:crypto";
import { getFixtureState } from "@/fixtures/demo-data";
import { insertPrecedent, isFixtureMode } from "@/lib/db/queries";
import type { Incident } from "@/lib/schemas";
import { decode } from "@/lib/stream/registry";
import { kafka, streamingEnabled } from "@/lib/stream/kafka";
import { TOPICS, type TopicName } from "@/lib/stream/topics";

type PrecedentRow = {
  citation: string;
  precedent_number: number;
  ruling_id: string;
  incident_id: string;
  verdict: string;
  holding: string;
};

type IncidentRow = {
  incident_id: string;
  case_number: string;
  title: string;
  service: string;
  severity: Incident["severity"];
  raw_log: string;
  error_signature: string;
  source_url: string;
  occurred_at: string;
};

/** Give up waiting after this long; the courtroom still opens on fixtures. */
const CATCH_UP_TIMEOUT_MS = 10_000;

const g = globalThis as typeof globalThis & { __tribunalLog?: Promise<void> };

function rememberPrecedent(row: PrecedentRow): void {
  const state = getFixtureState();
  if (state.dynamicPrecedents.some((p) => p.citation === row.citation)) return;
  void insertPrecedent({
    precedent_number: row.precedent_number,
    citation: row.citation,
    ruling_id: row.ruling_id,
    incident_id: row.incident_id,
    holding: row.holding,
    summary: row.holding,
    verdict: row.verdict,
    outcome: "UNKNOWN",
    embedding: null,
    is_seeded: false,
  });
  state.precedentCount = Math.max(state.precedentCount, row.precedent_number);
}

function docketIncident(row: IncidentRow): void {
  const docket = getFixtureState().streamedIncidents;
  // The connector re-emits an issue on every edit. First id wins so a hearing
  // already convened against it keeps resolving.
  if (docket.has(row.case_number)) return;
  docket.set(row.case_number, {
    id: row.incident_id,
    case_number: row.case_number,
    title: row.title,
    service: row.service,
    dag_id: null,
    severity: row.severity,
    raw_log: row.raw_log,
    error_signature: row.error_signature,
    source_url: row.source_url,
    occurred_at: row.occurred_at,
    status: "AWAITING_HEARING",
    is_precached: false,
  });
}

/** Consumes `topic` from offset 0 forever. Resolves once caught up to where it ended at start. */
async function follow<T>(topic: TopicName, onRow: (row: T) => void): Promise<void> {
  const client = kafka();
  const admin = client.admin();
  await admin.connect();
  const offsets = await admin.fetchTopicOffsets(topic);
  await admin.disconnect();

  const end = new Map(offsets.map((o) => [o.partition, Number(o.high)]));
  const pending = new Set(offsets.filter((o) => Number(o.high) > 0).map((o) => o.partition));

  const consumer = client.consumer({ groupId: `tribunal-log-${randomUUID()}` });
  await consumer.connect();
  await consumer.subscribe({ topics: [topic], fromBeginning: true });

  await new Promise<void>((resolve) => {
    if (pending.size === 0) resolve();
    void consumer.run({
      eachMessage: async ({ partition, message }) => {
        if (message.value) onRow(decode<T>(message.value));
        if (Number(message.offset) + 1 >= (end.get(partition) ?? 0)) pending.delete(partition);
        if (pending.size === 0) resolve();
      },
    });
  });
}

/** Idempotent. Waits (bounded) for history and docket to catch up with the log. */
export function restoreFromLog(): Promise<void> {
  if (!streamingEnabled() || !isFixtureMode()) return Promise.resolve();
  g.__tribunalLog ??= Promise.race([
    Promise.all([
      follow<PrecedentRow>(TOPICS.precedents, rememberPrecedent),
      follow<IncidentRow>(TOPICS.incidents, docketIncident),
    ]),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timed out")), CATCH_UP_TIMEOUT_MS),
    ),
  ])
    .then(() => {
      const state = getFixtureState();
      console.log(
        `[log] ${state.dynamicPrecedents.length} precedent(s), ` +
          `${state.streamedIncidents.size} connector incident(s) restored`,
      );
    })
    .catch((err) => {
      // Once per process: a dead broker must not stall every page load. Restart to retry.
      console.error("[log] replay failed; continuing on fixtures:", err);
    });
  return g.__tribunalLog;
}
