# Governance Quick Reference

> **For agents.** Operational checklist and lane rules. See `CLAUDE.md` for full context, `AGENTS.md` for workflow contract, `docs/AGENTS.md` for session state.

---

## Issue-First Workflow (8 Steps)

Before changing any versioned file:

1. **Locate or create a `task issue`** in GitHub
2. **Label the issue** with `kind:task`, one `status:*`, one `priority:*`, one `area:*`, one `risk:*`, one `lane:*`
3. **Declare in issue body:** `Owner atual`, `Lane oficial`, `Workspace da task`, `Write-set esperado`, `Classificacao de risco`
4. **Create a worktree** at `.claude/worktrees/<lane>/<issue-number>-<slug>/`
5. **Work in branch** `task/<issue-number>-<slug>` and keep the repo root stable on `main`
6. **Open a PR** with `Closes #<issue-number>` in the body
7. **Complete via script:** `scripts/pr_complete.ps1 -Pr <number>` (waits for checks, merges, verifies closure)
8. **Update issue and docs** before marking task complete

---

## Lane Assignments

**Official lanes:**
- `lane:frontend` - JavaScript/TypeScript, Next.js app, UI components
- `lane:backend` - Python, database, scraper, KPI engine, API
- `lane:ops-quality` - testing, validation, documentation, governance
- `lane:master` - cross-cutting execution across frontend/backend runtime paths

**Planning mode:**
- `lane:master.plan` - read-only orchestration mode, no file edits

**Rule:** 1 task = 1 owner = 1 lane = 1 branch = 1 worktree = 1 PR

---

## Worktree Rules

- **Repo root** stays on `main` and stable
- **Each task** gets a dedicated worktree: `.claude/worktrees/<lane>/<issue-number>-<slug>/`
- **Branching** from task worktree: `git checkout -b task/<issue-number>-<slug>`
- **Switching tasks** -> open second editor window on the other task's worktree (do NOT switch branches in the root)

---

## Risk Classifications

| Class | Definition | PR Setup | Write-set |
|-------|-----------|----------|-----------|
| `risk:safe` | Isolated, no shared files | Open as ready | Single task-specific files |
| `risk:shared` | Touches shared files | Open as DRAFT | Shared docs, configs, scripts, governance |
| `risk:contract-sensitive` | Public API/schema/docs | Open as DRAFT + document compatibility | Public interfaces only |

---

## Child Task Template

When your lane needs work from another lane:

- **Task mae:** Link to parent task
- **Lane solicitante:** Your lane (`frontend`, `backend`, `ops-quality`, `master`)
- **Criterio de consumo:** How you'll verify the delivery is ready
- **Write-set esperado:** Files the other lane will change

Parent task remains `status:blocked` until child merges.  
After merge, parent moves to `status:awaiting-consumption`.  
Only requester lane marks delivery as consumed.

---

## Critical Paths

Paths in `.github/guardrails/path-policy.json` require:
- Correct `lane:*` label
- Matching `risk:*` classification
- Explicit approval in the task body

Categories:
- `shared-governance`
- `critical-bootstrap`
- `critical-runtime`
- `critical-contract`

`lane:master` may cross frontend/backend runtime boundaries only where the path policy explicitly allows it. It does **not** own governance or bootstrap paths.

---

## PR Completion Flow

```bash
scripts/pr_complete.ps1 -Pr <number>
# Waits for checks -> merges -> verifies issue closure -> removes branch
```

---

## Common Mistakes

X **Switching branches in repo root** - use a dedicated worktree  
X **Opening PR without issue** - issue first, always  
X **Missing labels on issue** - keep the 6 required labels  
X **Skipping `Write-set esperado`** - declare what files will change  
X **Leaving work only local** - push the branch before session end  
X **Assuming `lane:master` can edit governance** - it cannot touch `critical-bootstrap` or shared governance paths

---

## References

- Full workflow: `CLAUDE.md`
- Governance contract: `AGENTS.md`
- Session state: `docs/AGENTS.md`
- Business rules: `docs/CONTEXT.md`
- Parallel lanes: `docs/governance/parallel-lanes.md`
