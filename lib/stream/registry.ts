/**
 * TRIBUNAL — minimal Schema Registry client.
 *
 * Speaks the SR REST API directly and writes the Confluent wire format
 * (magic byte 0x00 + 4-byte big-endian schema id + JSON body), which is what
 * Confluent Cloud for Apache Flink expects on a JSON Schema topic. No SDK: the
 * official serdes package pulls a dependency our npm mirror does not carry.
 */

import { TOPIC_SCHEMAS, type TopicName } from "@/lib/stream/topics";

function srConfig(): { url: string; auth: string } {
  const url = process.env.SR_URL;
  const key = process.env.SR_API_KEY;
  const secret = process.env.SR_API_SECRET;
  if (!url || !key || !secret) {
    throw new Error("SR_URL, SR_API_KEY and SR_API_SECRET must be set");
  }
  return {
    url: url.replace(/\/$/, ""),
    auth: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
  };
}

const subjectFor = (topic: string) => `${topic}-value`;

async function srFetch(path: string, init?: RequestInit): Promise<unknown> {
  const { url, auth } = srConfig();
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      "Content-Type": "application/vnd.schemaregistry.v1+json",
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Schema Registry ${res.status} on ${path}: ${JSON.stringify(body)}`);
  }
  return body;
}

/** Registers (or re-registers, idempotently) a topic's value schema. Returns its id. */
export async function registerSchema(topic: TopicName): Promise<number> {
  const body = (await srFetch(`/subjects/${encodeURIComponent(subjectFor(topic))}/versions`, {
    method: "POST",
    body: JSON.stringify({ schemaType: "JSON", schema: JSON.stringify(TOPIC_SCHEMAS[topic]) }),
  })) as { id: number };
  return body.id;
}

const idCache = new Map<string, Promise<number>>();

/** Latest schema id for a topic, registering on first use. Cached per process. */
export function schemaIdFor(topic: TopicName): Promise<number> {
  let id = idCache.get(topic);
  if (!id) {
    id = registerSchema(topic).catch((err) => {
      idCache.delete(topic);
      throw err;
    });
    idCache.set(topic, id);
  }
  return id;
}

export function encode(schemaId: number, value: unknown): Buffer {
  const header = Buffer.alloc(5);
  header.writeUInt8(0, 0);
  header.writeUInt32BE(schemaId, 1);
  return Buffer.concat([header, Buffer.from(JSON.stringify(value), "utf8")]);
}

export function decode<T>(buf: Buffer): T {
  const body = buf.length > 5 && buf.readUInt8(0) === 0 ? buf.subarray(5) : buf;
  return JSON.parse(body.toString("utf8")) as T;
}
