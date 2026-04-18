# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hybrid Python project: a CLI scraper that extracts DFP/ITR financial reports from Brazil's CVM regulator and persists them to SQLite/PostgreSQL, plus a Streamlit analytics dashboard and a PyQt6 desktop app for 449+ public companies.

> For commands, architecture, and conventions: `docs/CLAUDE_REFERENCE.md` (read on demand).
> For business rules and pipeline details: `docs/CONTEXT.md` (read before touching `src/`).
> For issue-first workflow: `AGENTS.md`.
> For current state and session history: `docs/AGENTS.md`.

## Required Workflow

Before changing any versioned file:

1. At the start of every executable chat, inspect:
   - open tasks in your own `lane:*`
   - child tasks received from other lanes in your lane
   - child tasks your lane opened for other lanes
   - open PRs tied to those issues, especially deliveries waiting for consumption
2. Find or create an open `task issue` in GitHub.
3. Ensure the issue has `kind:task`, one `status:*`, one `priority:*`, one `area:*`, one `risk:*`, and one `lane:*` label.
4. Ensure the issue body declares `Owner atual`, `Lane oficial`, `Workspace da task`, `Write-set esperado`, and `Classificacao de risco`.
5. Update the issue when work starts and keep the checklist/evidence current.
6. Create or reuse a dedicated worktree at `.claude/worktrees/<lane>/<issue-number>-<slug>/`.
7. Keep the repo root stable on `main` and do not switch task branches in the main workspace.
8. Work in a branch named `task/<issue-number>-<slug>`.
9. Open a PR with `Closes #<issue-number>` in the body.
10. Finish the task with `scripts/pr_complete.ps1 -Pr <number>` or an equivalent flow that waits for checks, confirms merge, verifies the linked issue is closed, and confirms the remote branch is gone when applicable.
11. Update the issue and relevant docs before considering the task complete.
12. Commit validated checkpoints, push them promptly, and merge to `main` when the task is complete and checks are green unless the user explicitly says not to.

### Jules-only exception

- The only allowed `PR-first` exception is for pull requests published by Jules (Google Labs).
- Detection must come from the PR body markers `PR created automatically by Jules` or `jules.google.com/task/`; do not rely only on the author login.
- The dedicated `Jules PR Governance` workflow owns this exception: it applies `source:jules`, creates or reconciles the retroactive task, sets `Workspace da task = jules://github/pr/<pr-number>`, fills `Source PR`, infers lane/risk/write-set, and updates the PR body with `Closes #<issue>`.
- Until that retroactive intake is valid, the Jules PR must remain blocked and in draft.
- This exception does not apply to humans, Codex, Claude, or any other agent.

## Publish and Merge Policy

- Do not leave completed work only in the local worktree.
- Commit when you reach a coherent, validated checkpoint.
- Push when the checkpoint should be preserved remotely or reflected in the PR.
- Open or update a draft PR as soon as the branch is reviewable.
- When acceptance criteria are satisfied and relevant checks pass:
  - update the issue;
  - mark the PR ready if needed;
  - use `scripts/pr_complete.ps1` or an equivalent flow to wait through green checks and complete the merge into `main`.
- Prefer squash merge for short-lived Codex branches.
- After merge, confirm the linked task closes and the remote branch is removed when possible.
- Remove the linked task worktree after merge when it is no longer needed.

Do not use `docs/AGENTS.md` as a backlog. The official backlog lives in GitHub Issues.

## Lane and Worktree Rules

- Official lanes:
  - `lane:frontend`
  - `lane:backend`
  - `lane:ops-quality`
  - `lane:master`
- Rule of thumb: `1 task = 1 owner = 1 branch = 1 worktree = 1 PR`
- Use the repo root only as the stable `main` worktree.
- If you need to inspect another task, open a second editor window on that
  task's worktree instead of switching branches in the root workspace.
- `lane:master` is the cross-cutting execution lane for application/runtime work.
- `lane:master.plan` is read-only orchestration mode and does not write code.
- Sensitive files are governed by `.github/guardrails/path-policy.json`.
- Paths in `shared-governance`, `critical-bootstrap`, `critical-runtime`, and
  `critical-contract` require the lane and `risk:*` classification allowed by
  the path policy.

## Parallel Work Protocol

- Treat the `task issue` as the ownership boundary, not the agent identity.
- If another IA or human takes over the same task, update `Owner atual` in the
  issue before continuing work.
- Keep `Lane oficial` and `Workspace da task` current in the issue body.
- Respect the declared `Write-set esperado`. If another open task needs the same
  write-set, coordinate through the issues or reduce scope before editing.
- Record dependencies or write-set collisions in the task issue before moving
  forward.
- Risk classes:
  - `risk:safe`: isolated write-set
  - `risk:shared`: touches shared files; PR must open in draft
  - `risk:contract-sensitive`: touches public API/schema/docs; PR must open in
    draft and document compatibility
- Shared public interfaces remain `additive-only` by default during parallel
  work.
- Breaking contract changes require a dedicated `risk:contract-sensitive` task,
  explicit coordination in the issue/PR, and serialized merge timing.
- Do not touch files outside the current lane or the shared governance policy
  unless the task explicitly allows it and the guardrails pass.
- If your lane needs work from another lane, open a formal child task instead of
  handing off informally in chat.
- A child task must declare `Task mae`, `Lane solicitante`, and
  `Criterio de consumo`.
- The parent task must list its `Tasks filhas` and remain `status:blocked`
  while the downstream child task is open or under review.
- After the child task is merged but before the requester lane consumes the
  delivery, the parent task moves to `status:awaiting-consumption`.
- Only the requester lane may mark the delivery as consumed and unblock the
  parent task.

## Agent Behavior

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately — don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: record the lesson in the relevant issue comment, ADR, or durable doc
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review recent issues and docs before repeating work

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes — don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests — then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Issue Management

1. **Issue First**: no executable work starts without a `task issue`
2. **Worktree From Issue**: use `.claude/worktrees/<lane>/<issue-number>-<slug>/`
3. **Branch From Issue**: use `task/<issue-number>-<slug>`
4. **Track Progress in Issue**: keep status, checklist, and evidence current
5. **Close via PR**: use `Closes #<issue-number>` in the PR body
6. **Keep Docs Durable**: ADRs and durable docs stay in `docs/`; operational state stays in GitHub Issues

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.

## Context Compaction

When approaching context limits, compress `docs/AGENTS.md` session history: keep the
"Estado Atual" section accurate and current; reduce fully-adopted governance sessions
(where rules are already in CLAUDE.md/AGENTS.md) to a single changelog line each.
Sessions describing active or recent work should remain in full. Binary files, `data/`,
`archive/`, and `output/` are excluded via `.claudeignore` — do not read or explore them.
`docs/AGENTS.md` must not exceed 150 lines — compress when it grows past that.

When the agent context auto-compacts, always preserve:
- Task issue number and current status
- Design decisions taken in this session and their rationale
- Files modified in this session (with brief note on what changed)
- Any test failures identified and their root cause
- Critical governance rules invoked (lane ownership, risk classification, write-set restrictions)
- Active worktree path and branch name
