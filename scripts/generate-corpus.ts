import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

type Issue = {
  source: string;
  number: number;
  title: string;
  body: string;
  html_url: string;
};

const DEMO = [
  {
    case_number: "CASE-2281",
    service: "metadata-ingest",
    dag_id: "dag_metadata_sync_v3",
    severity: "P1" as const,
    id: "a0000001-0000-4000-8000-000000000001",
    source: "dbt-labs/dbt-core",
    number: 16331,
    is_precached: true,
    error_signature: "schema cache miss empty listing incremental models silent data loss",
  },
  {
    case_number: "CASE-3104",
    service: "partner-feed-etl",
    dag_id: "dag_partner_feed_v2",
    severity: "P2" as const,
    id: "a0000002-0000-4000-8000-000000000002",
    source: "apache/airflow",
    number: 66786,
    is_precached: false,
    error_signature: "retry storm duplicate key integrity error first-write race",
  },
  {
    case_number: "CASE-4417",
    service: "catalog-publish",
    dag_id: "dag_catalog_publish_v1",
    severity: "P1" as const,
    id: "a0000003-0000-4000-8000-000000000003",
    source: "apache/airflow",
    number: 66524,
    is_precached: false,
    error_signature: "stale schema cache upgrade downstream contract drift",
  },
  {
    case_number: "CASE-5002",
    service: "warehouse-compact",
    dag_id: "dag_compact_daily",
    severity: "P3" as const,
    id: "a0000004-0000-4000-8000-000000000004",
    source: "apache/airflow",
    number: 66715,
    is_precached: false,
    error_signature: "partition timeout compaction sla breach pod gc reentry",
  },
];

const CURATED: Record<
  number,
  { outcome: string; holding: string; keywords: string[] }
> = {
  312: {
    outcome: "REMEDIATION_WORSENED",
    holding:
      "Immediate write halt on metadata pipeline failures without upstream contract verification extends outage duration and must not precede diagnostic hold.",
    keywords: ["write halt", "metadata", "upstream", "contract"],
  },
  847: {
    outcome: "REMEDIATION_WORSENED",
    holding:
      "Global schema cache flush on single-table miss amplifies harm across unrelated DAGs and is prohibited without isolation analysis.",
    keywords: ["schema cache", "flush", "downstream", "DAG"],
  },
  891: {
    outcome: "REMEDIATION_WORSENED",
    holding:
      "Broad remediation orders on partial metadata writes amplify damage when retry boundaries are not established first.",
    keywords: ["partial write", "metadata", "retry", "remediation"],
  },
  1024: {
    outcome: "REMEDIATION_SUCCEEDED",
    holding:
      "Targeted cache invalidation for a single table after schema miss prevents silent data loss without global flush.",
    keywords: ["schema cache", "targeted", "invalidation"],
  },
  1150: {
    outcome: "HOLD_CORRECT",
    holding:
      "Diagnostic hold pending upstream schema_version confirmation is appropriate when contract drift is suspected but write path is uncertain.",
    keywords: ["contract drift", "schema version", "catalog", "diagnostic hold"],
  },
};

function cleanBody(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

function holdingFromTitle(title: string): string {
  const clipped = title.replace(/\[[^\]]+\]/g, "").replace(/\s+/g, " ").trim();
  return `Where ${clipped.charAt(0).toLowerCase()}${clipped.slice(1)}, remediation must be scoped to the failing component and verified against prior outcomes.`.slice(
    0,
    240,
  );
}

function pickOutcome(n: number): "REMEDIATION_SUCCEEDED" | "REMEDIATION_WORSENED" | "HOLD_CORRECT" | "UNKNOWN" {
  const r = (n * 17) % 100;
  if (r < 55) return "REMEDIATION_SUCCEEDED";
  if (r < 80) return "REMEDIATION_WORSENED";
  if (r < 95) return "HOLD_CORRECT";
  return "UNKNOWN";
}

const issues = JSON.parse(
  readFileSync(join("scripts/.cache/issues.json"), "utf8"),
) as Issue[];
const byKey = new Map(issues.map((i) => [`${i.source}:${i.number}`, i]));

const incidents = DEMO.map((demo, idx) => {
  const issue = byKey.get(`${demo.source}:${demo.number}`);
  if (!issue) throw new Error(`Missing ${demo.source}#${demo.number}`);
  const raw = cleanBody(issue.body).slice(0, 4500);
  return {
    ...demo,
    title: issue.title.slice(0, 160),
    raw_log: raw,
    source_url: issue.html_url,
    occurred_at: new Date(Date.UTC(2026, 2, 14 - idx, 3, 22, 0)).toISOString(),
    status: "AWAITING_HEARING",
  };
});

const outcomes = {
  REMEDIATION_SUCCEEDED: "REMEDIATE",
  REMEDIATION_WORSENED: "REMEDIATE",
  HOLD_CORRECT: "HOLD",
  UNKNOWN: "DISMISS",
} as const;

const TARGET = 1205;
const precedents = Array.from({ length: TARGET }, (_, i) => {
  const n = i + 1;
  const issue = issues[i % issues.length];
  const curated = CURATED[n];
  const outcome = (curated?.outcome ?? pickOutcome(n)) as keyof typeof outcomes;
  const summary = cleanBody(issue.body).replace(/\s+/g, " ").slice(0, 400);
  return {
    id: `p${String(n).padStart(4, "0")}-0000-4000-8000-000000000001`,
    precedent_number: n,
    citation: `TRIB-${String(n).padStart(4, "0")}`,
    holding: curated?.holding ?? holdingFromTitle(`${issue.title} (${n})`),
    summary,
    verdict: outcomes[outcome],
    outcome,
    mttr_minutes:
      outcome === "REMEDIATION_WORSENED"
        ? 41 + ((n * 23) % 287)
        : outcome === "HOLD_CORRECT"
          ? 14 + ((n * 11) % 76)
          : outcome === "UNKNOWN"
            ? 18 + ((n * 7) % 54)
            : 9 + ((n * 29) % 88),
    keywords: curated?.keywords ?? issue.title.toLowerCase().split(/\W+/).filter((w) => w.length > 4).slice(0, 8),
    is_seeded: true,
    source_url: issue.html_url,
  };
});

mkdirSync("fixtures", { recursive: true });
writeFileSync("fixtures/github-incidents.json", JSON.stringify(incidents, null, 2));
writeFileSync("fixtures/github-precedents.json", JSON.stringify(precedents));
console.log("incidents", incidents.map((i) => `${i.case_number} ${i.source_url}`).join("\n"));
console.log("precedents", precedents.length);
console.log("worsened", precedents.filter((p) => p.outcome === "REMEDIATION_WORSENED").length);
