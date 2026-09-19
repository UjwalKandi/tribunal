/**
 * TRIBUNAL — database access layer.
 */

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  DefenseOutput,
  Hearing,
  Incident,
  PrecedentMatch,
  ProsecutionOutput,
  Role,
  RulingOutput,
  RulingRecord,
} from "@/lib/schemas";
import {
  FIXTURE_DEFENSE,
  FIXTURE_HEARING,
  FIXTURE_INCIDENTS,
  FIXTURE_PRECEDENT_COUNT,
  FIXTURE_PROSECUTION,
  FIXTURE_RULING,
  fixtureMatchPrecedents,
  getFixtureState,
  isFixtureMode,
  resetFixtureReplay,
  distantVetoPlaceholder,
  type FixturePrecedent,
} from "@/fixtures/demo-data";

let service: SupabaseClient | null = null;

function getServiceClient(): SupabaseClient {
  if (service) return service;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service credentials not configured");
  }
  service = createClient(url, key);
  return service;
}

export function serviceClient(): SupabaseClient {
  return getServiceClient();
}

export function browserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase browser credentials not configured");
  }
  return createSupabaseBrowserClient(url, key);
}

function mapIncident(row: Record<string, unknown>): Incident {
  return {
    id: row.id as string,
    case_number: row.case_number as string,
    title: row.title as string,
    service: row.service as string,
    dag_id: (row.dag_id as string | null) ?? null,
    severity: row.severity as Incident["severity"],
    raw_log: row.raw_log as string,
    error_signature: row.error_signature as string,
    source_url: (row.source_url as string | null) ?? null,
    occurred_at: row.occurred_at as string,
    status: row.status as string,
    is_precached: row.is_precached as boolean,
  };
}

function mapHearing(row: Record<string, unknown>): Hearing {
  return {
    id: row.id as string,
    incident_id: row.incident_id as string,
    docket_number: row.docket_number as string,
    convened_at: row.convened_at as string,
    concluded_at: (row.concluded_at as string | null) ?? null,
    state: row.state as Hearing["state"],
  };
}

function mapRuling(row: Record<string, unknown>): RulingRecord {
  return {
    id: row.id as string,
    hearing_id: row.hearing_id as string,
    verdict: row.verdict as RulingRecord["verdict"],
    opinion: row.opinion as string,
    holding: row.holding as string,
    remediation_order: row.remediation_order as RulingRecord["remediation_order"],
    confidence: Number(row.confidence),
    cited_precedent_ids: row.cited_precedent_ids as string[],
    veto_window_seconds: row.veto_window_seconds as number,
    veto_opens_at: row.veto_opens_at as string,
    executed_at: (row.executed_at as string | null) ?? null,
    authority: (row.authority as RulingRecord["authority"]) ?? null,
  };
}

export async function getDocket(): Promise<Incident[]> {
  if (isFixtureMode()) {
    return FIXTURE_INCIDENTS.filter((i) => i.status === "AWAITING_HEARING");
  }
  const { data, error } = await getServiceClient().from("docket").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIncident);
}

export async function getIncident(id: string): Promise<Incident> {
  if (isFixtureMode()) {
    const incident = FIXTURE_INCIDENTS.find((i) => i.id === id);
    if (!incident) throw new Error(`Incident not found: ${id}`);
    return incident;
  }
  const { data, error } = await getServiceClient().from("incidents").select("*").eq("id", id).single();
  if (error) throw new Error(error.message);
  return mapIncident(data);
}

export async function getIncidentByCaseNumber(caseNumber: string): Promise<Incident> {
  if (isFixtureMode()) {
    const incident = FIXTURE_INCIDENTS.find((i) => i.case_number === caseNumber);
    if (!incident) throw new Error(`Incident not found: ${caseNumber}`);
    return incident;
  }
  const { data, error } = await getServiceClient()
    .from("incidents")
    .select("*")
    .eq("case_number", caseNumber)
    .single();
  if (error) throw new Error(error.message);
  return mapIncident(data);
}

export async function getPrecedentCount(): Promise<number> {
  if (isFixtureMode()) {
    return getFixtureState().precedentCount;
  }
  const { count, error } = await getServiceClient()
    .from("precedents")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function nextPrecedentNumber(): Promise<number> {
  if (isFixtureMode()) {
    const state = getFixtureState();
    state.precedentCount += 1;
    return state.precedentCount;
  }
  const { data, error } = await getServiceClient()
    .from("precedents")
    .select("precedent_number")
    .order("precedent_number", { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return (data?.precedent_number ?? FIXTURE_PRECEDENT_COUNT) + 1;
}

export async function getRuling(rulingId: string): Promise<RulingRecord> {
  if (isFixtureMode()) {
    const state = getFixtureState();
    const live = state.liveRulings.get(rulingId);
    if (live) return { ...live };
    if (state.ruling.id === rulingId) return { ...state.ruling };
    throw new Error(`Ruling not found: ${rulingId}`);
  }
  const { data, error } = await getServiceClient().from("rulings").select("*").eq("id", rulingId).single();
  if (error) throw new Error(error.message);
  return mapRuling(data);
}

export async function getStoredHearing(incidentId: string): Promise<{
  hearing: Hearing;
  prosecution: ProsecutionOutput;
  defense: DefenseOutput;
  ruling: RulingRecord;
} | null> {
  if (isFixtureMode()) {
    if (incidentId !== FIXTURE_HEARING.incident_id) return null;
    const state = getFixtureState();
    return {
      hearing: { ...state.hearing },
      prosecution: FIXTURE_PROSECUTION,
      defense: FIXTURE_DEFENSE,
      ruling: { ...state.ruling },
    };
  }

  const { data: hearings, error: hErr } = await getServiceClient()
    .from("hearings")
    .select("*")
    .eq("incident_id", incidentId)
    .order("convened_at", { ascending: false })
    .limit(1);
  if (hErr) throw new Error(hErr.message);
  if (!hearings?.length) return null;

  const hearing = mapHearing(hearings[0]);
  const { data: args, error: aErr } = await getServiceClient()
    .from("arguments")
    .select("*")
    .eq("hearing_id", hearing.id)
    .order("sequence");
  if (aErr) throw new Error(aErr.message);

  const prosRow = args?.find((a) => a.role === "PROSECUTION");
  const defRow = args?.find((a) => a.role === "DEFENSE");
  const { data: rulingRow, error: rErr } = await getServiceClient()
    .from("rulings")
    .select("*")
    .eq("hearing_id", hearing.id)
    .single();
  if (rErr) throw new Error(rErr.message);

  if (!prosRow || !defRow) return null;

  return {
    hearing,
    prosecution: {
      respondent: (prosRow.claims as { respondent?: string })?.respondent ?? "unknown",
      body: prosRow.body,
      claims: prosRow.claims as ProsecutionOutput["claims"],
      harm: "",
      motion: "",
    },
    defense: {
      body: defRow.body,
      cited_precedents: defRow.cited_precedents as DefenseOutput["cited_precedents"],
      theory: "PRECEDENT_HARM",
      alternative: "",
    },
    ruling: mapRuling(rulingRow),
  };
}

export async function createHearing(incident: Incident): Promise<Hearing> {
  const count = await getPrecedentCount();
  const docketNumber = `DKT-2026-${String(count + 1).padStart(4, "0")}`;

  if (isFixtureMode()) {
    const hearing: Hearing = {
      id: crypto.randomUUID(),
      incident_id: incident.id,
      docket_number: docketNumber,
      convened_at: new Date().toISOString(),
      concluded_at: null,
      state: "CONVENED",
    };
    getFixtureState().liveHearings.set(hearing.id, hearing);
    return hearing;
  }

  const { data, error } = await getServiceClient()
    .from("hearings")
    .insert({
      incident_id: incident.id,
      docket_number: docketNumber,
      state: "CONVENED",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await getServiceClient()
    .from("incidents")
    .update({ status: "IN_HEARING" })
    .eq("id", incident.id);

  return mapHearing(data);
}

export async function saveArgument(
  hearingId: string,
  role: Role,
  sequence: 1 | 2 | 3,
  payload: ProsecutionOutput | DefenseOutput | RulingOutput,
): Promise<string> {
  const id = crypto.randomUUID();
  const body =
    "body" in payload ? payload.body : "opinion" in payload ? payload.opinion : "";

  if (isFixtureMode()) {
    return id;
  }

  const { data, error } = await getServiceClient()
    .from("arguments")
    .insert({
      id,
      hearing_id: hearingId,
      role,
      sequence,
      body,
      claims: role === "PROSECUTION" ? payload : [],
      cited_precedents: role === "DEFENSE" ? (payload as DefenseOutput).cited_precedents : [],
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function saveRuling(
  hearingId: string,
  output: RulingOutput,
  vetoWindowSeconds: number,
): Promise<RulingRecord> {
  const placeholder = distantVetoPlaceholder();

  if (isFixtureMode()) {
    const state = getFixtureState();
    const ruling: RulingRecord = {
      id: crypto.randomUUID(),
      hearing_id: hearingId,
      verdict: output.verdict,
      opinion: output.opinion,
      holding: output.holding,
      remediation_order: output.remediation_order,
      confidence: output.confidence,
      cited_precedent_ids: output.cited_precedent_ids,
      veto_window_seconds: vetoWindowSeconds,
      veto_opens_at: placeholder,
      executed_at: null,
      authority: null,
    };
    state.liveRulings.set(ruling.id, ruling);
    const hearing = state.liveHearings.get(hearingId);
    if (hearing) {
      state.liveHearings.set(hearingId, { ...hearing, state: "RULED" });
    }
    return { ...ruling };
  }

  const { data, error } = await getServiceClient()
    .from("rulings")
    .insert({
      hearing_id: hearingId,
      verdict: output.verdict,
      opinion: output.opinion,
      holding: output.holding,
      remediation_order: output.remediation_order,
      confidence: output.confidence,
      cited_precedent_ids: output.cited_precedent_ids,
      veto_window_seconds: vetoWindowSeconds,
      veto_opens_at: placeholder,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);

  await getServiceClient().from("hearings").update({ state: "RULED" }).eq("id", hearingId);

  return mapRuling(data);
}

export async function markExecuted(
  rulingId: string,
  authority: "AUTONOMOUS" | "HUMAN_CONFIRMED",
): Promise<void> {
  if (isFixtureMode()) {
    const state = getFixtureState();
    const live = state.liveRulings.get(rulingId);
    if (live) {
      state.liveRulings.set(rulingId, {
        ...live,
        executed_at: new Date().toISOString(),
        authority,
      });
      const hearing = state.liveHearings.get(live.hearing_id);
      if (hearing) {
        state.liveHearings.set(live.hearing_id, {
          ...hearing,
          state: "EXECUTED",
          concluded_at: new Date().toISOString(),
        });
      }
      return;
    }
    if (state.ruling.id === rulingId) {
      state.ruling.executed_at = new Date().toISOString();
      state.ruling.authority = authority;
      state.hearing.state = "EXECUTED";
      state.hearing.concluded_at = new Date().toISOString();
    }
    return;
  }

  const { data: ruling, error: rErr } = await getServiceClient()
    .from("rulings")
    .select("hearing_id")
    .eq("id", rulingId)
    .single();
  if (rErr) throw new Error(rErr.message);

  const { error } = await getServiceClient()
    .from("rulings")
    .update({ executed_at: new Date().toISOString(), authority })
    .eq("id", rulingId);
  if (error) throw new Error(error.message);

  await getServiceClient()
    .from("hearings")
    .update({ state: "EXECUTED", concluded_at: new Date().toISOString() })
    .eq("id", ruling.hearing_id);
}

export async function insertPrecedent(row: {
  precedent_number: number;
  citation: string;
  ruling_id: string;
  incident_id: string;
  holding: string;
  summary: string;
  verdict: string;
  outcome: string;
  embedding: number[] | null;
  is_seeded: false;
}): Promise<void> {
  if (isFixtureMode()) {
    const state = getFixtureState();
    state.dynamicPrecedents.push({
      id: crypto.randomUUID(),
      precedent_number: row.precedent_number,
      citation: row.citation,
      holding: row.holding,
      summary: row.summary,
      verdict: row.verdict as FixturePrecedent["verdict"],
      outcome: row.outcome as FixturePrecedent["outcome"],
      mttr_minutes: null as unknown as number,
      keywords: row.holding.toLowerCase().split(/\s+/).slice(0, 8),
      is_seeded: false,
      ruling_id: row.ruling_id,
      incident_id: row.incident_id,
    });
    state.executedRulings.set(row.ruling_id, {
      precedentNumber: row.precedent_number,
      citation: row.citation,
    });
    return;
  }

  const { error } = await getServiceClient().from("precedents").insert({
    precedent_number: row.precedent_number,
    citation: row.citation,
    ruling_id: row.ruling_id,
    incident_id: row.incident_id,
    holding: row.holding,
    summary: row.summary,
    verdict: row.verdict,
    outcome: row.outcome,
    embedding: row.embedding,
    is_seeded: row.is_seeded,
  });
  if (error) throw new Error(error.message);
}

export async function insertVeto(
  rulingId: string,
  secondsRemaining: number,
  reason?: string,
): Promise<void> {
  if (isFixtureMode()) {
    getFixtureState().vetoes.add(rulingId);
    return;
  }

  const { data: ruling, error: rErr } = await getServiceClient()
    .from("rulings")
    .select("hearing_id")
    .eq("id", rulingId)
    .single();
  if (rErr) throw new Error(rErr.message);

  const { error } = await getServiceClient().from("vetoes").insert({
    ruling_id: rulingId,
    seconds_remaining: secondsRemaining,
    reason,
  });
  if (error) throw new Error(error.message);

  await getServiceClient()
    .from("hearings")
    .update({ state: "VETOED", concluded_at: new Date().toISOString() })
    .eq("id", ruling.hearing_id);
}

export async function setHearingState(hearingId: string, state: Hearing["state"]): Promise<void> {
  if (isFixtureMode()) {
    const fixture = getFixtureState();
    if (fixture.hearing.id === hearingId) {
      fixture.hearing.state = state;
    }
    return;
  }

  const { error } = await getServiceClient().from("hearings").update({ state }).eq("id", hearingId);
  if (error) throw new Error(error.message);
}

export async function matchPrecedentsDb(
  errorSignature: string,
  threshold: number,
  count: number,
): Promise<PrecedentMatch[]> {
  if (isFixtureMode()) {
    const state = getFixtureState();
    return fixtureMatchPrecedents(errorSignature, threshold, count, state.dynamicPrecedents);
  }

  const { embed } = await import("@/lib/llm");
  const vector = await embed(errorSignature);
  const { data, error } = await getServiceClient().rpc("match_precedents", {
    query_embedding: vector,
    match_threshold: threshold,
    match_count: count,
  });
  if (error) throw new Error(error.message);

  const matches = (data ?? []) as PrecedentMatch[];
  return matches.sort((a, b) => {
    if (a.outcome === "REMEDIATION_WORSENED" && b.outcome !== "REMEDIATION_WORSENED") return -1;
    if (b.outcome === "REMEDIATION_WORSENED" && a.outcome !== "REMEDIATION_WORSENED") return 1;
    return b.similarity - a.similarity;
  });
}

export async function hasVeto(rulingId: string): Promise<boolean> {
  if (isFixtureMode()) {
    return getFixtureState().vetoes.has(rulingId);
  }
  const { count, error } = await getServiceClient()
    .from("vetoes")
    .select("*", { count: "exact", head: true })
    .eq("ruling_id", rulingId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function getExistingExecution(
  rulingId: string,
): Promise<{ precedentNumber: number; citation: string } | null> {
  if (isFixtureMode()) {
    return getFixtureState().executedRulings.get(rulingId) ?? null;
  }
  const { data, error } = await getServiceClient()
    .from("precedents")
    .select("precedent_number, citation")
    .eq("ruling_id", rulingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { precedentNumber: data.precedent_number, citation: data.citation };
}

export async function resetRulingForReplay(rulingId: string): Promise<void> {
  if (isFixtureMode()) {
    resetFixtureReplay();
    return;
  }
  await getServiceClient()
    .from("rulings")
    .update({
      executed_at: null,
      authority: null,
      veto_opens_at: distantVetoPlaceholder(),
    })
    .eq("id", rulingId);
}

/** Starts the veto clock when the UI actually shows the window — after typewriter. */
export async function armVetoWindow(rulingId: string): Promise<RulingRecord> {
  const now = new Date().toISOString();

  if (isFixtureMode()) {
    const state = getFixtureState();
    const live = state.liveRulings.get(rulingId);
    if (live) {
      live.veto_opens_at = now;
      live.executed_at = null;
      live.authority = null;
      state.liveRulings.set(rulingId, live);
      return { ...live };
    }
    if (state.ruling.id === rulingId) {
      state.ruling = {
        ...state.ruling,
        veto_opens_at: now,
        executed_at: null,
        authority: null,
      };
      return { ...state.ruling };
    }
    throw new Error(`Ruling not found: ${rulingId}`);
  }

  const { data, error } = await getServiceClient()
    .from("rulings")
    .update({ veto_opens_at: now, executed_at: null, authority: null })
    .eq("id", rulingId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRuling(data);
}

export async function getHearingIncidentId(hearingId: string): Promise<string> {
  if (isFixtureMode()) {
    const state = getFixtureState();
    const live = state.liveHearings.get(hearingId);
    if (live) return live.incident_id;
    if (state.hearing.id === hearingId) return state.hearing.incident_id;
    return FIXTURE_HEARING.incident_id;
  }
  const { data, error } = await getServiceClient()
    .from("hearings")
    .select("incident_id")
    .eq("id", hearingId)
    .single();
  if (error) throw new Error(error.message);
  return data.incident_id;
}

export { isFixtureMode };
