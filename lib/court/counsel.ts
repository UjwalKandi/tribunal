/**
 * TRIBUNAL — the three counsel functions.
 */

import { DEFENSE_JSON, PROSECUTION_JSON, RULING_JSON } from "@/lib/court/output-schemas";
import {
  DefenseOutput,
  Incident,
  PrecedentMatch,
  ProsecutionOutput,
  RulingOutput,
  rejectFabricatedCitations,
} from "@/lib/schemas";
import { complete, TEMPERATURE } from "@/lib/llm";
import { matchPrecedentsDb } from "@/lib/db/queries";
import {
  DEFENSE_SYSTEM,
  JUDGE_SYSTEM,
  PROSECUTION_SYSTEM,
} from "@/lib/court/prompts";

export async function matchPrecedents(
  errorSignature: string,
  threshold = 0.72,
  count = 5,
): Promise<PrecedentMatch[]> {
  return matchPrecedentsDb(errorSignature, threshold, count);
}

export async function prosecute(incident: Incident): Promise<ProsecutionOutput> {
  return complete({
    system: PROSECUTION_SYSTEM,
    user: JSON.stringify({
      case_number: incident.case_number,
      service: incident.service,
      dag_id: incident.dag_id,
      severity: incident.severity,
      error_signature: incident.error_signature,
      raw_log: incident.raw_log,
    }),
    schema: ProsecutionOutput,
    jsonSchema: PROSECUTION_JSON,
    temperature: TEMPERATURE.PROSECUTION,
    label: "prosecution",
  });
}

export async function defend(
  incident: Incident,
  prosecution: ProsecutionOutput,
  precedents: PrecedentMatch[],
): Promise<{ output: DefenseOutput; droppedCitations: string[] }> {
  const precedentList = precedents
    .map(
      (p, i) =>
        `${i + 1}. ${p.citation} — ${p.holding} [verdict: ${p.verdict}, outcome: ${p.outcome}, MTTR: ${p.mttr_minutes ?? "unknown"}m]`,
    )
    .join("\n");

  const raw = await complete({
    system: DEFENSE_SYSTEM,
    user: JSON.stringify({
      incident: {
        case_number: incident.case_number,
        service: incident.service,
        error_signature: incident.error_signature,
        raw_log: incident.raw_log,
      },
      prosecution: {
        body: prosecution.body,
        motion: prosecution.motion,
        respondent: prosecution.respondent,
      },
      precedents: precedentList,
    }),
    schema: DefenseOutput,
    jsonSchema: DEFENSE_JSON,
    temperature: TEMPERATURE.DEFENSE,
    label: "defense",
  });

  const { kept, dropped } = rejectFabricatedCitations(raw.cited_precedents, precedents);
  return {
    output: { ...raw, cited_precedents: kept },
    droppedCitations: dropped,
  };
}

export async function adjudicate(
  incident: Incident,
  prosecution: ProsecutionOutput,
  defense: DefenseOutput,
  precedents: PrecedentMatch[],
): Promise<RulingOutput> {
  const strongest = defense.cited_precedents[0]?.citation ?? precedents[0]?.citation ?? "none";
  const precedentList = precedents
    .map((p) => `${p.citation}: ${p.holding} [${p.outcome}]`)
    .join("\n");

  const raw = await complete({
    system: JUDGE_SYSTEM,
    user: JSON.stringify({
      incident: {
        case_number: incident.case_number,
        service: incident.service,
        error_signature: incident.error_signature,
      },
      prosecution,
      defense,
      precedents: precedentList,
      instruction: `You MUST address precedent ${strongest} explicitly in your ruling.`,
    }),
    schema: RulingOutput,
    jsonSchema: RULING_JSON,
    temperature: TEMPERATURE.JUDGE,
    label: "judge",
  });

  const citedAsObjects = raw.cited_precedent_ids.map((citation) => ({ citation }));
  const { kept } = rejectFabricatedCitations(citedAsObjects, precedents);
  return {
    ...raw,
    cited_precedent_ids: kept.map((c) => c.citation),
  };
}
