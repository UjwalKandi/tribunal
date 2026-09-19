import type {
  DefenseOutput,
  Hearing,
  Incident,
  PrecedentMatch,
  ProsecutionOutput,
  RulingRecord,
} from "@/lib/schemas";
import githubIncidents from "@/fixtures/github-incidents.json";
import githubPrecedents from "@/fixtures/github-precedents.json";

export const FIXTURE_INCIDENTS: Incident[] = githubIncidents.map((row) => ({
  id: row.id,
  case_number: row.case_number,
  title: row.title,
  service: row.service,
  dag_id: row.dag_id,
  severity: row.severity as Incident["severity"],
  raw_log: row.raw_log,
  error_signature: row.error_signature,
  source_url: row.source_url,
  occurred_at: row.occurred_at,
  status: row.status,
  is_precached: row.is_precached,
}));

export const FIXTURE_PROSECUTION: ProsecutionOutput = {
  respondent: "relation cache / hydrate_relation_cache",
  body: "The Prosecution moves for immediate invalidation of the relation cache and a halt on incremental materializations that rebuild from a complete-but-empty listing. The respondent cached a failed BigQuery dataset listing as empty and complete. Evidence: Fusion classifies the error as not-found and caches the dataset as empty and complete. is_incremental() is then false for every incremental model in run A, and each one is recreated with create or replace table from its full sources. No merge, no warning, exit code 0. The 404 Not Found listing failure was treated as a complete schema.",
  claims: [
    {
      claim: "A failed listing was cached as a complete empty schema.",
      evidence: "caches the dataset as empty and complete",
    },
    {
      claim: "Incremental models were rebuilt with create or replace instead of merge.",
      evidence: "each one is recreated with `create or replace table <model>` from its full sources",
    },
    {
      claim: "The driver 404 was treated as not-found for the whole dataset.",
      evidence: "errToAdbcErr renders the 404 as `... 404 Not Found: Not found: Table ...` with `StatusNotFound`",
    },
  ],
  harm: "Silent full-table recreation of incremental models. No warning. Exit code 0. Downstream consumers receive replaced relations without a merge.",
  motion: "Invalidate the relation cache for the affected dataset, halt incremental runs that used the empty listing, and re-verify through INFORMATION_SCHEMA.TABLES before any write resumption.",
};

export const FIXTURE_DEFENSE: DefenseOutput = {
  body: "The Defense concedes the failure but opposes an immediate global cache flush and write halt. Precedent TRIB-0847 records that forced cache flush on schema miss amplified harm across twelve downstream DAGs, extending MTTR from 28 to 340 minutes. TRIB-0312 and TRIB-0891 document REMEDIATION_WORSENED outcomes when write actions ran before upstream verification. The empty listing should be re-verified through INFORMATION_SCHEMA.TABLES, not treated as grounds for dataset-wide invalidation.",
  cited_precedents: [
    {
      citation: "TRIB-0847",
      relevance: "Forced cache flush on schema miss caused cascading DAG failures across 12 services.",
    },
    {
      citation: "TRIB-0312",
      relevance: "Immediate write halt without upstream verification extended outage duration fourfold.",
    },
    {
      citation: "TRIB-0891",
      relevance: "Broad remediation order amplified partial write damage in similar metadata pipeline.",
    },
  ],
  theory: "PRECEDENT_HARM",
  alternative:
    "Issue a diagnostic hold on incremental materializations for the affected dataset, re-verify listings through INFORMATION_SCHEMA.TABLES, then invalidate only the complete-but-empty cache entry.",
};

export const FIXTURE_RULING: RulingRecord = {
  id: "c0000001-0000-4000-8000-000000000001",
  hearing_id: "b0000001-0000-4000-8000-000000000001",
  verdict: "REMEDIATE",
  opinion:
    "This Tribunal finds the relation cache failed when a BigQuery listing 404 was stored as a complete empty schema. The Defense citation TRIB-0847 is distinguished on the facts. That precedent involved a global cache flush affecting twelve unrelated DAGs. Here the failure is a single dataset listing classified as not-found, after which incremental models were recreated with create or replace and no warning. The Tribunal orders targeted remediation. Step one. Halt incremental runs against the poisoned cache. Step two. Drop the complete-but-empty cache entry for that dataset only. Step three. Re-verify relations through information schema before resume. Step four. Require a warning when an incremental table is missing from cache. Disposition. Remediation ordered.",
  holding:
    "Where a failed relation listing is cached as a complete empty schema, remediation must invalidate that cache entry and re-verify through information schema before any incremental rebuild.",
  remediation_order: [
    {
      step: 1,
      action: "Halt incremental materializations that used the empty listing",
      rationale: "Prevent further create or replace rebuilds from a poisoned cache",
    },
    {
      step: 2,
      action: "Invalidate the complete-but-empty relation cache entry for that dataset only",
      rationale: "Targeted action avoids global flush precedent harm documented in TRIB-0847",
    },
    {
      step: 3,
      action: "Re-verify relations through INFORMATION_SCHEMA.TABLES before resume",
      rationale: "Upstream listing verification prevents recurrence of false-empty cache",
    },
    {
      step: 4,
      action: "Warn when an incremental model's table is missing from cache",
      rationale: "Silent full refresh with exit code 0 is the operational harm",
    },
  ],
  confidence: 0.74,
  cited_precedent_ids: ["TRIB-0847", "TRIB-0312"],
  veto_window_seconds: 10,
  veto_opens_at: new Date().toISOString(),
  executed_at: null,
  authority: null,
};

export const FIXTURE_HEARING: Hearing = {
  id: "b0000001-0000-4000-8000-000000000001",
  incident_id: "a0000001-0000-4000-8000-000000000001",
  docket_number: "DKT-2026-1206",
  convened_at: "2026-03-14T04:00:00Z",
  concluded_at: null,
  state: "RULED",
};

export interface FixturePrecedent {
  id: string;
  precedent_number: number;
  citation: string;
  holding: string;
  summary: string;
  verdict: "REMEDIATE" | "HOLD" | "DISMISS";
  outcome: "REMEDIATION_SUCCEEDED" | "REMEDIATION_WORSENED" | "HOLD_CORRECT" | "UNKNOWN";
  mttr_minutes: number;
  keywords: string[];
  is_seeded: boolean;
  ruling_id?: string;
  incident_id?: string;
}

export const FIXTURE_PRECEDENTS: FixturePrecedent[] = githubPrecedents.map((row) => ({
  id: row.id,
  precedent_number: row.precedent_number,
  citation: row.citation,
  holding: row.holding,
  summary: row.summary,
  verdict: row.verdict as FixturePrecedent["verdict"],
  outcome: row.outcome as FixturePrecedent["outcome"],
  mttr_minutes: row.mttr_minutes,
  keywords: row.keywords,
  is_seeded: row.is_seeded,
}));

export const FIXTURE_PRECEDENT_COUNT = 1205;

export function fixtureMatchPrecedents(
  errorSignature: string,
  threshold: number,
  count: number,
  extraPrecedents: FixturePrecedent[] = [],
): PrecedentMatch[] {
  const all = [...FIXTURE_PRECEDENTS, ...extraPrecedents];
  const query = errorSignature.toLowerCase();

  const scored = all.map((p) => {
    const text = `${p.holding} ${p.summary} ${p.keywords.join(" ")}`.toLowerCase();
    const tokens = query.split(/\s+/).filter((t) => t.length > 3);
    let matches = 0;
    for (const token of tokens) {
      if (text.includes(token)) matches++;
    }
    const similarity = tokens.length > 0 ? 0.65 + (matches / tokens.length) * 0.3 : 0.5;
    return {
      id: p.id,
      precedent_number: p.precedent_number,
      citation: p.citation,
      holding: p.holding,
      summary: p.summary,
      verdict: p.verdict,
      outcome: p.outcome,
      mttr_minutes: p.mttr_minutes,
      similarity: Math.min(0.98, similarity),
      dynamic: !p.is_seeded,
    };
  });

  return scored
    .filter((p) => p.similarity > threshold)
    .sort((a, b) => {
      if (a.dynamic !== b.dynamic) return a.dynamic ? -1 : 1;
      if (a.outcome === "REMEDIATION_WORSENED" && b.outcome !== "REMEDIATION_WORSENED") return -1;
      if (b.outcome === "REMEDIATION_WORSENED" && a.outcome !== "REMEDIATION_WORSENED") return 1;
      return b.similarity - a.similarity;
    })
    .slice(0, count)
    .map(({ dynamic: _d, ...rest }) => rest);
}

interface MutableState {
  ruling: RulingRecord;
  hearing: Hearing;
  precedentCount: number;
  dynamicPrecedents: FixturePrecedent[];
  vetoes: Set<string>;
  executedRulings: Map<string, { precedentNumber: number; citation: string }>;
  liveRulings: Map<string, RulingRecord>;
  liveHearings: Map<string, Hearing>;
}

let mutableState: MutableState | null = null;

export function getFixtureState(): MutableState {
  if (!mutableState) {
    mutableState = {
      ruling: { ...FIXTURE_RULING },
      hearing: { ...FIXTURE_HEARING },
      precedentCount: FIXTURE_PRECEDENT_COUNT,
      dynamicPrecedents: [],
      vetoes: new Set(),
      executedRulings: new Map(),
      liveRulings: new Map(),
      liveHearings: new Map(),
    };
  }
  return mutableState;
}

export function resetFixtureReplay(): void {
  const state = getFixtureState();
  state.ruling = {
    ...FIXTURE_RULING,
    veto_opens_at: distantVetoPlaceholder(),
    executed_at: null,
    authority: null,
  };
  state.hearing = { ...FIXTURE_HEARING, state: "RULED", concluded_at: null };
}

function distantVetoPlaceholder(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

export { distantVetoPlaceholder };

export function isFixtureMode(): boolean {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;
}
