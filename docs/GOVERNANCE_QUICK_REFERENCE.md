# Governance Quick Reference

> **For agents.** Operational checklist and lane rules. See `CLAUDE.md` for full context, `AGENTS.md` for workflow contract, `docs/AGENTS.md` for session state.

---

## Issue-First Workflow (8 Steps)

Before changing any versioned file:

1. **Locate or create a `task issue`** in GitHub
2. **Label the issue** with `kind:task`, one `status:*`, one `priority:*`, one `area:*`, one `risk:*`, one `lane:*`
3. **Declare in issue body:** `Owner atual`, `Lane oficial`, `Workspace da task`, `Write-set esperado`, `Classificacao de risco`
4. **Create a worktree** at `.claude/worktrees/<lane>/<issue-number>-<slug>/`
5. **Work in branch** `task/<issue-number>-<slug>` (repo root stays on `master`)
6. **Open a PR** with `Closes #<issue-number>` in the body
7. **Complete via script:** `scripts/pr_complete.ps1 -Pr <number>` (waits for checks, merges, verifies closure)
8. **Update issue & docs** before marking task complete

---

## Lane Assignments

**Official lanes:**
- `lane:frontend` — JavaScript/TypeScript, Next.js app, UI components
- `lane:backend` — Python, database, scraper, KPI engine, API
- `lane:ops-quality` — testing, validation, documentation, governance

**Rule:** 1 task = 1 owner = 1 lane = 1 branch = 1 worktree = 1 PR

---

## Worktree Rules

- **Repo root** stays on `master` and stable
- **Each task** gets a dedicated worktree: `.claude/worktrees/<lane>/<issue-number>-<slug>/`
- **Branching** from task worktree: `git checkout -b task/<issue-number>-<slug>`
- **Switching tasks** → open second editor window on other task's worktree (do NOT switch branches in root)

---

## Risk Classifications

| Class | Definition | PR Setup | Write-set |
|-------|-----------|----------|-----------|
| `risk:safe` | Isolated, no shared files | Open as ready | Single task-specific files |
| `risk:shared` | Touches shared files | Open as DRAFT | Shared src/, configs, scripts |
| `risk:contract-sensitive` | Public API/schema/docs | Open as DRAFT + document compatibility | Public interfaces only |

---

## Child Task Template

When your lane needs work from another lane:

- **Task mae:** Link to parent task
- **Lane solicitante:** Your lane (frontend/backend/ops-quality)
- **Criterio de consumo:** How you'll verify the delivery is ready
- **Write-set esperado:** Files the other lane will change

Parent task remains `status:blocked` until child merges.  
After merge, parent moves to `status:awaiting-consumption`.  
Only requester lane marks delivery as consumed.

---

## PR Completion Flow

```bash
scripts/pr_complete.ps1 -Pr <number>
# Waits for checks → merges → verifies issue closure → removes branch
```

---

## Sensitive Files

Paths in `.github/guardrails/path-policy.json` require:
- Correct `lane:*` label
- Matching `risk:*` classification
- Explicit approval in task body

Categories: `shared-governance`, `critical-bootstrap`, `critical-runtime`, `critical-contract`

---

## Quick Commands

```bash
# Activate environment
.\.venv\Scripts\Activate.ps1         # PowerShell
.venv/bin/activate                   # macOS/Linux

# Test
pytest tests/ -v

# Run dashboard
streamlit run dashboard/app.py

# Desktop app
python -m desktop.cvm_pyqt_app

# CLI scraper
python main.py --companies PETROBRAS --start_year 2021 --end_year 2025
```

---

## Common Mistakes

❌ **Switching branches in repo root** — use separate editor window for other tasks  
❌ **Opening PR without issue** — issue first, always  
❌ **Missing labels on issue** — 6 labels minimum (kind, status, priority, area, risk, lane)  
❌ **Skipping `Write-set esperado`** — declare what files you'll change  
❌ **Committing without checkpoint** — commit meaningful, testable units  
❌ **Leaving work in worktree only** — push to branch before session ends  

---

## References

- Full workflow: `CLAUDE.md`
- Governance contract: `AGENTS.md`
- Session state: `docs/AGENTS.md`
- Business rules: `docs/CONTEXT.md`
- Architecture: `CLAUDE.md` § Architecture
- Testing: `CLAUDE.md` § Testing Conventions

