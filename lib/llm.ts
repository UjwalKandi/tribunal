/**
 * TRIBUNAL — the ONLY module that talks to a model.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export const MODEL_CHAT = process.env.TRIBUNAL_CHAT_MODEL ?? "gpt-4o-mini";
export const MODEL_EMBED = process.env.TRIBUNAL_EMBED_MODEL ?? "text-embedding-3-small";

export const TEMPERATURE = {
  PROSECUTION: 0.4,
  DEFENSE: 0.4,
  JUDGE: 0.2,
} as const;

export const TIMEOUT_MS = 8_000;

/** Claude is used whenever ANTHROPIC_API_KEY is set; it takes priority over OpenAI/Groq. */
export const MODEL_CLAUDE = process.env.TRIBUNAL_CLAUDE_MODEL ?? "claude-opus-5";
/**
 * How hard Claude deliberates per argument. `medium` keeps a three-argument
 * hearing watchable on stage; raise to `high` when latency matters less than depth.
 */
const CLAUDE_EFFORT = (process.env.TRIBUNAL_CLAUDE_EFFORT ?? "medium") as
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";
/** Adaptive thinking takes longer than an 8s JSON-mode call; past this the hearing degrades. */
const CLAUDE_TIMEOUT_MS = Number(process.env.TRIBUNAL_CLAUDE_TIMEOUT_MS ?? 90_000);

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
  retries?: number;
  timeoutMs?: number;
  label: string;
  /**
   * Structured-output shape for Claude (lib/court/output-schemas.ts). Zod
   * `schema` still validates the result. Ignored by the OpenAI/Groq path.
   */
  jsonSchema?: Record<string, unknown>;
}

function getApiConfig(): { url: string; key: string; chatModel: string; embedModel: string } | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      url: "https://api.openai.com/v1",
      key: process.env.OPENAI_API_KEY,
      chatModel: MODEL_CHAT,
      embedModel: MODEL_EMBED,
    };
  }
  if (process.env.GROQ_API_KEY) {
    return {
      url: "https://api.groq.com/openai/v1",
      key: process.env.GROQ_API_KEY,
      chatModel: process.env.TRIBUNAL_CHAT_MODEL ?? "llama-3.3-70b-versatile",
      embedModel: MODEL_EMBED,
    };
  }
  return null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new LlmTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

let claudeClient: Anthropic | null = null;

async function completeClaude<T extends z.ZodTypeAny>(
  opts: CompleteOptions<T>,
): Promise<z.infer<T>> {
  claudeClient ??= new Anthropic({ maxRetries: 1 });
  const retries = opts.retries ?? 1;
  const timeoutMs = opts.timeoutMs ?? CLAUDE_TIMEOUT_MS;
  let userMessage = opts.user;
  let lastRaw = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    let response: Anthropic.Beta.BetaMessage;
    try {
      // Sampling params are not accepted on current models; effort replaces temperature.
      response = await claudeClient.beta.messages.create(
        {
          model: MODEL_CLAUDE,
          max_tokens: 16_000,
          system: opts.system,
          messages: [{ role: "user", content: userMessage }],
          output_config: {
            effort: CLAUDE_EFFORT,
            ...(opts.jsonSchema ? { format: { type: "json_schema", schema: opts.jsonSchema } } : {}),
          },
          // Server-side fallback: a policy decline is retried on a fallback model in the same call.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        },
        { timeout: timeoutMs },
      );
    } catch (err) {
      if (err instanceof Anthropic.APIConnectionTimeoutError) throw new LlmTimeoutError(timeoutMs);
      throw err;
    }

    if (response.stop_reason === "refusal") {
      throw new LlmValidationError("Model declined the request", "");
    }

    lastRaw = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*|\s*```$/g, "");
    console.log(`[llm:${opts.label}] raw response:`, lastRaw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(lastRaw);
    } catch {
      if (attempt < retries) {
        userMessage = `${opts.user}\n\nYour previous response was invalid JSON. Return valid JSON only.`;
        continue;
      }
      throw new LlmValidationError("Invalid JSON from model", lastRaw);
    }

    const result = opts.schema.safeParse(parsed);
    if (result.success) return result.data;

    if (attempt < retries) {
      userMessage = `${opts.user}\n\nValidation failed: ${result.error.message}. Fix and return valid JSON.`;
      continue;
    }
    throw new LlmValidationError(result.error.message, lastRaw);
  }

  throw new LlmValidationError("Exhausted retries", lastRaw);
}

export async function complete<T extends z.ZodTypeAny>(
  opts: CompleteOptions<T>,
): Promise<z.infer<T>> {
  if (process.env.ANTHROPIC_API_KEY) return completeClaude(opts);

  const config = getApiConfig();
  if (!config) {
    throw new Error("No LLM credentials configured");
  }

  const retries = opts.retries ?? 1;
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  let userMessage = opts.user;
  let lastRaw = "";

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetchWithTimeout(
      `${config.url}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.chatModel,
          temperature: opts.temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: userMessage },
          ],
        }),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    lastRaw = data.choices?.[0]?.message?.content ?? "";
    console.log(`[llm:${opts.label}] raw response:`, lastRaw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(lastRaw);
    } catch {
      if (attempt < retries) {
        userMessage = `${opts.user}\n\nYour previous response was invalid JSON. Return valid JSON only.`;
        continue;
      }
      throw new LlmValidationError("Invalid JSON from model", lastRaw);
    }

    const result = opts.schema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    if (attempt < retries) {
      userMessage = `${opts.user}\n\nValidation failed: ${result.error.message}. Fix and return valid JSON.`;
      continue;
    }

    throw new LlmValidationError(result.error.message, lastRaw);
  }

  throw new LlmValidationError("Exhausted retries", lastRaw);
}

export async function embed(text: string): Promise<number[]> {
  const config = getApiConfig();
  if (!config) {
    throw new Error("No LLM credentials configured");
  }

  const response = await fetchWithTimeout(
    `${config.url}/embeddings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.embedModel,
        input: text,
      }),
    },
    TIMEOUT_MS,
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding request failed (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const vector = data.data?.[0]?.embedding;
  if (!vector) {
    throw new Error("No embedding returned");
  }
  return vector;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const config = getApiConfig();
  if (!config) {
    throw new Error("No LLM credentials configured");
  }

  const batchSize = 100;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const response = await fetchWithTimeout(
      `${config.url}/embeddings`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.embedModel,
          input: batch,
        }),
      },
      TIMEOUT_MS * 3,
    );

    if (!response.ok) {
      throw new Error(`Batch embedding failed (${response.status})`);
    }

    const data = (await response.json()) as {
      data?: Array<{ embedding?: number[]; index?: number }>;
    };
    const sorted = (data.data ?? []).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const item of sorted) {
      if (!item.embedding) throw new Error("Missing embedding in batch");
      results.push(item.embedding);
    }
  }

  return results;
}

export function llmAvailable(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ?? process.env.OPENAI_API_KEY ?? process.env.GROQ_API_KEY,
  );
}
