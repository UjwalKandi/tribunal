/**
 * TRIBUNAL — JSON Schemas for the three counsel outputs.
 *
 * Sent to Claude as structured-output formats so the API enforces the shape.
 * They mirror lib/schemas.ts, which stays the source of truth: lengths, ranges
 * and the TRIB-0000 citation pattern are still enforced there by Zod, after
 * the response arrives. Only keywords structured outputs supports appear here.
 */

import { Verdict } from "@/lib/schemas";

const str = { type: "string" };

function object(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const PROSECUTION_JSON = object({
  respondent: str,
  body: str,
  claims: { type: "array", items: object({ claim: str, evidence: str }) },
  harm: str,
  motion: str,
});

export const DEFENSE_JSON = object({
  body: str,
  cited_precedents: { type: "array", items: object({ citation: str, relevance: str }) },
  theory: { type: "string", enum: ["UPSTREAM_CAUSE", "PRECEDENT_HARM", "INSUFFICIENT_EVIDENCE"] },
  alternative: str,
});

export const RULING_JSON = object({
  verdict: { type: "string", enum: Verdict.options },
  opinion: str,
  holding: str,
  remediation_order: {
    type: "array",
    items: object({ step: { type: "integer" }, action: str, rationale: str }),
  },
  confidence: { type: "number" },
  cited_precedent_ids: { type: "array", items: str },
  addressed_defense_precedent: str,
  disposition: str,
});
