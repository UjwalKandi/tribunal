# TONIGHT — 2 hours, then sleep

Do these in order. Stop when done. Do not start building features.

---

## 1. Drop this kit into the repo (2 min)
```bash
mkdir -p ~/code/tribunal && cd ~/code/tribunal
# copy tribunal-kit/.cursor and tribunal-kit/docs into the repo root
```

## 2. Scaffold (20 min)
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint --src-dir=false
npx shadcn@latest init
npx shadcn@latest add button card badge separator scroll-area
npm i @supabase/supabase-js @supabase/ssr zod
```
Add `font-serif` (Georgia) and a mono stack to `tailwind.config.ts`.
Set the near-black palette from `200-ui.mdc` as CSS variables in `globals.css`.

## 3. Supabase project (15 min)
- New project. Region closest to Austin.
- Copy into `.env.local`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=
  NEXT_PUBLIC_SUPABASE_ANON_KEY=
  SUPABASE_SERVICE_ROLE_KEY=
  OPENAI_API_KEY=            # or GROQ_API_KEY
  ```
- Do NOT create tables. That happens tomorrow at 10:30 via MCP — it's a demo asset.

## 4. MCP (15 min)
- Get a Supabase **personal access token** (Account → Access Tokens).
- Fill in `--project-ref` and the token in `.cursor/mcp.json`.
- Restart Cursor. Settings → MCP. **Both servers must show green.**
- Test in Agent: *"Using Supabase MCP, list the tables in my project."*
  If this fails tonight, it will fail tomorrow. Fix it now.

## 5. Deploy (20 min)
```bash
git init && git add -A && git commit -m "scaffold"
gh repo create tribunal --private --source=. --push
npx vercel --prod
```
Add all env vars in the Vercel dashboard. **Confirm the live URL loads.**
```bash
git tag v0-scaffold && git push --tags
```

## 6. Verify the rules load (5 min)
Open Cursor. New chat. Ask: *"What are the hard rules for this project?"*
It must cite the constitution — no auth, no new deps, no real remediation,
browser speechSynthesis only. If it doesn't, the `.mdc` frontmatter is wrong.

## 7. Speech smoke test (5 min)
Browser console:
```js
const u = new SpeechSynthesisUtterance("This Tribunal finds the respondent liable.");
u.rate = 0.85; u.pitch = 0.9; speechSynthesis.speak(u);
```
Pick the flattest system voice available and note its name. Hardcode it tomorrow.

## 8. Worktrees (5 min)
```bash
git worktree add ../wt-court -b feat/court
git worktree add ../wt-ui    -b feat/ui
git worktree add ../wt-data  -b feat/data
```
Open each in a separate Cursor window. Tomorrow you just start typing.

## 9. Read the PRD once, then close the laptop (10 min)
Read `docs/PRD.md`. Memorize the won't-do list. Memorize the one-sentence pitch.

---

## Tonight's exit criteria
- [ ] Live Vercel URL loads
- [ ] `.cursor/rules/` verified working in a Cursor chat
- [ ] Supabase MCP green, `list tables` works
- [ ] Context7 MCP green
- [ ] `.env.local` complete, env vars in Vercel
- [ ] speechSynthesis works, voice name noted
- [ ] 3 worktrees created
- [ ] `v0-scaffold` tagged and pushed
- [ ] You can recite the pitch without reading it

**Do not write a single feature tonight. Sleep.**

---

## Tomorrow, 10:00 AM sharp — paste this into Plan Mode
```
Read @docs/PRD.md, @docs/PLAN.md, @docs/SCHEMA.md, @docs/AGENTS.md.

Produce a build plan for TRIBUNAL with a file-by-file breakdown, in dependency order,
split across three parallel workstreams (court engine / courtroom UI / seed pipeline).

Hard constraint: net coding time is 200 minutes, feature freeze at 1:45 PM.
For each file, estimate minutes. If the total exceeds 200, tell me exactly what to cut
and rank the cuts by demo impact.

Do not write any code yet.
```
Then **cut the plan by hand** before you let a single agent start.
