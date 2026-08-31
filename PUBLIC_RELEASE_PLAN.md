# Plan: Prepare cc-track for public release

Goal (user, 2026-08-31): make the repo public-ready - purge bloat (unnecessary files, dead code, unused deps), and add docs so a newcomer understands what the project is, how it works, its requirements, and how to use it.

Status: PLANNED. Run AFTER the Next 16 upgrade (chore/next-16) is merged to front, so the audit reflects the final stack. Resumable - phases are checkpoints. Per the workflow rule: task -> implement agent(s) (file-locked) -> audit agent that fixes.

## Phase 1 - Secrets & safety (CRITICAL, blocks going public)
- [ ] Scan the WORKING TREE and the FULL GIT HISTORY for secrets: Supabase URL/keys (service key / SUPABASE_SECRET), the tracker ingestion API key, any tokens, `.env*` contents. Tools: git log -p search, gitleaks/trufflehog if available.
- [ ] Confirm `.gitignore` excludes `.env*`, local-only state, and build artifacts; confirm no `.env.local` or key was EVER committed.
- [ ] If any secret is found in history: purge with git filter-repo / BFG AND rotate the leaked credential. Do NOT just delete the file in a new commit - history must be clean before the repo is public.
- [ ] Verify `.claude/settings.local.json` and any machine-specific config are gitignored or sanitized.

## Phase 2 - Bloat purge (ponytail-audit)
- [ ] Run `/ponytail-audit` (whole-repo over-engineering scan) - ranked list of what to delete/simplify/replace with stdlib/native.
- [ ] Delete dead code, unused components/utils/types, unused dependencies (depcheck), commented-out blocks, stale comments.
- [ ] Relocate or remove the internal working plan docs at repo root (EXECUTION_PLAN.md, HARNESS_PLAN.md, LIVE_RUNS_GROUPING_PLAN.md, DESIGN_RECONCILE_PLAN.md, MOBILE_NAV_PLAN.md, NEXTJS_UPGRADE_PLAN.md, this file). For a public repo these are noise - either delete or move under a `docs/dev/` folder. Keep PRODUCT.md / DESIGN.md / SETUP_GUIDE.md if curated for public readers.
- [ ] Remove any scratch/experiment files, unused assets, and dead routes/APIs.

## Phase 3 - Public docs
- [ ] README.md rewrite for newcomers: what cc-track is (track pending/active/completed tasks + project progress across Claude Code sessions), a short architecture overview (hooks -> Supabase -> Next.js dashboard; the remote task runner / harness), REQUIREMENTS (Node, Supabase project, Claude CLI), SETUP (env vars, `supabase/schema.sql`, installing the hooks, running `npm run dev` and the agent runner), and USAGE (what each page does). Include a screenshot or two.
- [ ] Curate SETUP_GUIDE.md and PRODUCT.md for public readers (remove internal-only notes).
- [ ] Add LICENSE (ask user which) and optionally CONTRIBUTING.md.
- [ ] package.json metadata: name, description, repository, license, author - remove any personal info the user does not want public.

## Phase 4 - Final hygiene
- [ ] Confirm build + lint + tsc + detector clean on the final tree.
- [ ] Optional: tidy commit history (the "no comments" / "pending" commits) - only if the user wants it; history rewrite is destructive, get explicit approval.
- [ ] Final human review before flipping the repo public.

## Done when
Repo has no secrets (tree + history), minimal footprint, and a README + docs that let a stranger understand, set up, and use it. User does the final public-flip.

## Notes
- Do NOT flip the repo public or push to a public remote without explicit user go-ahead.
- The secret scan (Phase 1) is the hard gate - everything else is cosmetic by comparison.
