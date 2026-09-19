/**
 * TRIBUNAL — the ONLY module that talks to a model.
 *
 * OWNER: 🅰 wt-court
 * Constitution rule: nothing else in the codebase calls an LLM or an embedding
 * endpoint. If you find yourself importing an SDK anywhere else, stop.
 *
 * Server-only. Never import this from a Client Component.
 */

import type { z } from "zod";

export const MODEL_CHAT = process.env.TRIBUNAL_CHAT_MODEL ?? "gpt-4o-mini";
export const MODEL_EMBED = process.env.TRIBUNAL_EMBED_MODEL ?? "text-embedding-3-small";

/** Per docs/AGENTS.md. Judge is colder than counsel on purpose. */
export const TEMPERATURE = {
  PROSECUTION: 0.4,
  DEFENSE: 0.4,
  JUDGE: 0.2,
} as const;

/** Hard ceiling. A hanging request is a failed demo. */
export const TIMEOUT_MS = 8_000;

export class LlmValidationError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "LlmValidationError";
  }
}

export class LlmTimeoutError extends Error {
  constructor(readonly ms: number) {
    super(`LLM call exceeded ${ms}ms`);
    this.name = "LlmTimeoutError";
  }
}

export interface CompleteOptions<T extends z.ZodTypeAny> {
  system: string;
  user: string;
  schema: T;
  temperature: number;
  /** One retry on Zod failure, then throw. Callers fall back to pre-cached. */
  retries?: number;
  timeoutMs?: number;
  /** Tag for server-side logging so we can debug after the demo. */
  label: string;
}

/**
 * Request JSON from the model and validate it against `schema`.
 *
 * TODO(🅰): implement.
 *   1. JSON-mode / response_format json_object
 *   2. AbortController on timeoutMs → throw LlmTimeoutError
 *   3. console.log the RAW response with `label` before parsing — we need this
 *      to debug at 13:30 and there will be no time to add it later
 *   4. schema.safeParse; on failure retry once with the Zod error appended to
 *      the user message; on second failure throw LlmValidationError
 *   5. NEVER return unvalidated data
 */
export async function complete<T extends z.ZodTypeAny>(
  _opts: CompleteOptions<T>,
): Promise<z.infer<T>> {
  throw new Error("NOT_IMPLEMENTED: lib/llm.ts complete()");
}

/**
 * Embed a single string to a 1536-dim vector.
 *
 * TODO(🅰): implement. Used at hearing time (error_signature lookup) and at
 * execution time (embedding the Judge's holding so it becomes retrievable).
 */
export async function embed(_text: string): Promise<number[]> {
  throw new Error("NOT_IMPLEMENTED: lib/llm.ts embed()");
}

/**
 * Batch embed. Used ONLY by scripts/ingest.ts (🅲) for the 1,205 precedents.
 * Never called on the demo path.
 */
export async function embedBatch(_texts: string[]): Promise<number[][]> {
  throw new Error("NOT_IMPLEMENTED: lib/llm.ts embedBatch()");
}

/**
 * True when no model credentials are present. The pre-cached CASE-2281 path
 * MUST work when this returns true — that is the demo-safety gate in docs/SEED.md.
 */
export function llmAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY ?? process.env.GROQ_API_KEY);
}
