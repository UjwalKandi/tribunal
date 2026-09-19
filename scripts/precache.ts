/**
 * Pre-cache CASE-2281 hearing for demo-safety.
 * In fixture mode, data is already embedded in fixtures/demo-data.ts.
 */

import { createClient } from "@supabase/supabase-js";
import { FIXTURE_DEFENSE, FIXTURE_HEARING, FIXTURE_INCIDENTS, FIXTURE_PROSECUTION, FIXTURE_RULING } from "../fixtures/demo-data";
import { isFixtureMode } from "../lib/db/queries";

async function main() {
  if (isFixtureMode()) {
    console.log("Fixture mode — CASE-2281 pre-cached data is embedded.");
    console.log("Demo path works with zero model calls and no Supabase.");
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const incident = FIXTURE_INCIDENTS.find((i) => i.case_number === "CASE-2281")!;
  await supabase.from("incidents").upsert({ ...incident, is_precached: true });

  const { data: hearing } = await supabase
    .from("hearings")
    .upsert({
      id: FIXTURE_HEARING.id,
      incident_id: incident.id,
      docket_number: FIXTURE_HEARING.docket_number,
      state: "RULED",
    })
    .select("*")
    .single();

  if (!hearing) throw new Error("Failed to create hearing");

  await supabase.from("arguments").delete().eq("hearing_id", hearing.id);
  await supabase.from("arguments").insert([
    {
      hearing_id: hearing.id,
      role: "PROSECUTION",
      sequence: 1,
      body: FIXTURE_PROSECUTION.body,
      claims: FIXTURE_PROSECUTION,
    },
    {
      hearing_id: hearing.id,
      role: "DEFENSE",
      sequence: 2,
      body: FIXTURE_DEFENSE.body,
      cited_precedents: FIXTURE_DEFENSE.cited_precedents,
    },
  ]);

  await supabase.from("rulings").upsert({
    id: FIXTURE_RULING.id,
    hearing_id: hearing.id,
    verdict: FIXTURE_RULING.verdict,
    opinion: FIXTURE_RULING.opinion,
    holding: FIXTURE_RULING.holding,
    remediation_order: FIXTURE_RULING.remediation_order,
    confidence: FIXTURE_RULING.confidence,
    cited_precedent_ids: FIXTURE_RULING.cited_precedent_ids,
    veto_window_seconds: 10,
  });

  console.log("CASE-2281 pre-cached in Supabase.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
