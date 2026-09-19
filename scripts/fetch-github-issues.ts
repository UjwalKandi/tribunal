/**
 * Cache public GitHub issues for TRIBUNAL seed (no auth).
 * Writes scripts/.cache/issues.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPOS = [
  {
    url: "https://api.github.com/repos/apache/airflow/issues?state=closed&labels=kind:bug&per_page=100",
    source: "apache/airflow",
  },
  {
    url: "https://api.github.com/repos/dbt-labs/dbt-core/issues?state=closed&labels=bug&per_page=100",
    source: "dbt-labs/dbt-core",
  },
  {
    url: "https://api.github.com/repos/great-expectations/great_expectations/issues?state=closed&per_page=100",
    source: "great-expectations/great_expectations",
  },
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = join(root, "scripts/.cache");
const outFile = join(cacheDir, "issues.json");

async function main() {
  const all: Array<{
    source: string;
    number: number;
    title: string;
    body: string;
    html_url: string;
  }> = [];

  for (const repo of REPOS) {
    for (let page = 1; page <= 4; page++) {
      const res = await fetch(`${repo.url}&page=${page}`, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "tribunal-seed",
        },
      });
      if (!res.ok) {
        console.error(`${repo.source} page ${page}: ${res.status} ${await res.text()}`);
        break;
      }
      const batch = (await res.json()) as Array<{
        number: number;
        title: string;
        body: string | null;
        html_url: string;
        pull_request?: unknown;
      }>;
      if (batch.length === 0) break;
      for (const issue of batch) {
        if (issue.pull_request) continue;
        const body = issue.body ?? "";
        if (body.length < 200) continue;
        all.push({
          source: repo.source,
          number: issue.number,
          title: issue.title,
          body,
          html_url: issue.html_url,
        });
      }
      console.log(`${repo.source} page ${page}: corpus ${all.length}`);
      if (all.length >= 1205) break;
    }
  }

  await mkdir(cacheDir, { recursive: true });
  await writeFile(outFile, JSON.stringify(all.slice(0, 1205), null, 0));
  console.log(`Wrote ${Math.min(all.length, 1205)} issues to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
