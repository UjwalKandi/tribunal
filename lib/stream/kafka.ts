/**
 * TRIBUNAL — Confluent Cloud producer/consumer.
 *
 * Streaming is additive: with CONFLUENT_BOOTSTRAP unset every function here is
 * a no-op and the courtroom runs exactly as before. A Kafka failure is logged,
 * never thrown into a hearing — the demo must survive a flaky network.
 *
 * Singletons live on globalThis so Next.js dev hot-reloads do not leak
 * connections.
 */

import { randomUUID } from "node:crypto";
import { Kafka, logLevel, type Producer } from "kafkajs";
import { decode, encode, schemaIdFor } from "@/lib/stream/registry";
import { TOPICS, type TopicName } from "@/lib/stream/topics";

export type ExecutionRow = {
  ruling_id: string;
  hearing_id: string;
  incident_id: string;
  verdict: string;
  holding: string;
  opened_at: string;
  authority: "AUTONOMOUS" | "HUMAN_CONFIRMED";
  decided_by: string;
};

type Bus = {
  producer?: Promise<Producer>;
  executionsConsumer?: Promise<void>;
  /** Flink decisions seen so far, keyed by `${ruling_id}|${opened_at}`. */
  executions: Map<string, ExecutionRow>;
  waiters: Map<string, (row: ExecutionRow) => void>;
  heartbeatUntil: number;
  heartbeat?: ReturnType<typeof setInterval>;
};

const g = globalThis as typeof globalThis & { __tribunalBus?: Bus };
const bus: Bus = (g.__tribunalBus ??= {
  executions: new Map(),
  waiters: new Map(),
  heartbeatUntil: 0,
});

export function streamingEnabled(): boolean {
  return Boolean(process.env.CONFLUENT_BOOTSTRAP);
}

/** `flink` = the veto window is decided by 02_veto_window.sql. */
export function flinkExecutor(): boolean {
  return streamingEnabled() && (process.env.TRIBUNAL_EXECUTOR ?? "flink") === "flink";
}

export function kafka(): Kafka {
  return new Kafka({
    clientId: "tribunal",
    brokers: [process.env.CONFLUENT_BOOTSTRAP!],
    ssl: true,
    sasl: {
      mechanism: "plain",
      username: process.env.CONFLUENT_API_KEY!,
      password: process.env.CONFLUENT_API_SECRET!,
    },
    logLevel: logLevel.WARN,
  });
}

function producer(): Promise<Producer> {
  bus.producer ??= (async () => {
    const p = kafka().producer();
    await p.connect();
    return p;
  })().catch((err) => {
    bus.producer = undefined;
    throw err;
  });
  return bus.producer;
}

const PUBLISH_TIMEOUT_MS = 3_000;

/**
 * Fire-and-forget safe: resolves false instead of throwing. The record
 * timestamp (Flink's `$rowtime`) is publish time, never a past event time,
 * so a slow first publish cannot land behind the watermark and be dropped.
 */
export async function publish(topic: TopicName, key: string, value: object): Promise<boolean> {
  if (!streamingEnabled()) return false;
  const send = (async () => {
    const [p, schemaId] = await Promise.all([producer(), schemaIdFor(topic)]);
    await p.send({ topic, messages: [{ key, value: encode(schemaId, value) }] });
    return true;
  })();
  // kafkajs retries a dead broker for tens of seconds; a hearing must not wait on that.
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`timed out after ${PUBLISH_TIMEOUT_MS}ms`)), PUBLISH_TIMEOUT_MS),
  );
  try {
    return await Promise.race([send, timeout]);
  } catch (err) {
    send.catch(() => {});
    console.error(`[stream] publish to ${topic} failed:`, err);
    return false;
  }
}

/** For scripts: flush and close the producer so the process can exit. */
export async function disconnectStream(): Promise<void> {
  const p = bus.producer;
  bus.producer = undefined;
  if (p) await (await p).disconnect();
}

/* ───────────────────────── watermark heartbeat ───────────────────────── */

const TICK_RULING = {
  kind: "tick",
  ruling_id: "tick",
  hearing_id: "tick",
  incident_id: "tick",
  verdict: "NONE",
  holding: "",
  confidence: 0,
  cited_precedent_ids: [],
  window_seconds: 0,
};
const TICK_VETO = { kind: "tick", ruling_id: "tick", seconds_remaining: 0, reason: null };

/**
 * Emits one tick per second to rulings and vetoes until `seconds` from now.
 * Without it the interval join in 02_veto_window.sql never sees its watermark
 * pass opened_at + 10s on a quiet topic, and never emits the execution.
 */
export function heartbeatFor(seconds: number): void {
  if (!flinkExecutor()) return;
  bus.heartbeatUntil = Math.max(bus.heartbeatUntil, Date.now() + seconds * 1000);
  if (bus.heartbeat) return;
  bus.heartbeat = setInterval(() => {
    if (Date.now() > bus.heartbeatUntil) {
      clearInterval(bus.heartbeat);
      bus.heartbeat = undefined;
      return;
    }
    const at = new Date().toISOString();
    void publish(TOPICS.rulings, "tick", { ...TICK_RULING, opened_at: at });
    void publish(TOPICS.vetoes, "tick", { ...TICK_VETO, opened_at: at, vetoed_at: at });
  }, 1000);
}

/* ─────────────────────────── Flink decisions ─────────────────────────── */

const decisionKey = (rulingId: string, openedAt: string) =>
  `${rulingId}|${new Date(openedAt).toISOString()}`;

/**
 * Starts (once) a consumer on tribunal.executions. Call it when a veto window
 * opens so the consumer has joined its group before Flink emits ~10s later.
 */
export function watchExecutions(): void {
  if (!flinkExecutor()) return;
  bus.executionsConsumer ??= (async () => {
    // Unique group per process: every app instance must see every decision.
    const consumer = kafka().consumer({ groupId: `tribunal-app-${randomUUID()}` });
    await consumer.connect();
    await consumer.subscribe({ topics: [TOPICS.executions], fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        const row = decode<ExecutionRow>(message.value);
        const key = decisionKey(row.ruling_id, row.opened_at);
        bus.executions.set(key, row);
        bus.waiters.get(key)?.(row);
        bus.waiters.delete(key);
      },
    });
  })().catch((err) => {
    console.error("[stream] executions consumer failed:", err);
    bus.executionsConsumer = undefined;
  });
}

/** Resolves with Flink's execution order for this arming, or null on timeout. */
export function awaitExecution(
  rulingId: string,
  openedAt: string,
  timeoutMs: number,
): Promise<ExecutionRow | null> {
  watchExecutions();
  const key = decisionKey(rulingId, openedAt);
  const seen = bus.executions.get(key);
  if (seen) return Promise.resolve(seen);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      bus.waiters.delete(key);
      resolve(null);
    }, timeoutMs);
    bus.waiters.set(key, (row) => {
      clearTimeout(timer);
      resolve(row);
    });
  });
}
