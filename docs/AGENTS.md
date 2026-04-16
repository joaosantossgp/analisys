# AGENTS.md - Estado Atual e Historico de Sessoes

> **Para agentes de IA.** Estado atual no topo; historico abaixo.
> Antes de modificar o codigo, leia `AGENTS.md`, este arquivo e `docs/CONTEXT.md`.
> Apos concluir, atualize a secao "Estado Atual" e adicione uma entrada de sessao quando fizer sentido.
> Backlog oficial: `GitHub Issues`. Este arquivo nao e uma lista viva de tarefas.
> **Limite:** manter abaixo de 150 linhas; comprimir sessoes antigas quando necessario.

---

## Estado Atual (2026-04-12)

### Dashboard
- **3 abas renderizadas** em `dashboard/app.py`: `Visao Geral`, `Demonstracoes`, `Download`
- `dashboard/app.py` atua como orquestrador read-only
- Atualizacao de dados nao acontece no Streamlit; pertence ao app PyQt6 e aos scripts

### Banco de Dados
- **449 empresas**, 1,735,340 registros, 2022-2025 (last confirmed)
- SQLite local: `data/db/cvm_financials.db` (WAL mode)
- Tabelas: `financial_reports` (UPPER_CASE), `companies`, `account_names` (snake_case)

### App Desktop
- `cvm_pyqt_app.py` e a interface operacional principal
- Ranking inteligente: 40% market cap + 60% liquidez, combinado com desatualizacao
- Paralelismo configuravel 2-8 workers

### V2 Backend
- `apps/api`: API `FastAPI` read-only sobre `src/read_service.py`
- Endpoints: `health`, `companies`, `companies/filters`, `company detail`, `years`, `statements`, `kpis`, `refresh-status`, `base-health`

### V2 Web
- `apps/web`: `Next.js 16.2.2` + `App Router` + `TypeScript` + `Tailwind v4` + `@base-ui/react 1.3.0`
- Icones: `Material Symbols Outlined` weight 200; componentes via 21st.dev shadcn CLI
- Rotas: `/`, `/empresas`, `/empresas/[cd_cvm]`, `/design-system`
- Cores chart: OkLch com ~72° espacamento; consome somente API V2

### Testes
- `pytest tests/ -q` — V1; `pytest apps/api/tests -q` — V2 API
- `apps/web`: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e`

### Pendencias Tecnicas
- Validacao contra PostgreSQL real pendente (`DATABASE_URL` necessario)
- Deploy de preview da V2 nao iniciado; Streamlit Cloud pendente
- P10 (bancos financeiros: Itau, Bradesco) nao iniciado

---

## Decisoes Tecnicas Nao-Obvias

| Decisao | Razao |
|---------|-------|
| `int(year)` antes de param SQLite | numpy int64 falha silenciosamente |
| yfinance `dividendYield` ja em % | nao multiplicar por 100 |
| SQLAlchemy IN clause: `bindparam("x", expanding=True)` | listas como params SQL |
| `_upsert_company_metadata`: INSERT OR IGNORE + UPDATE | preserva CNPJ/ticker preenchidos por `setup_companies_table` |
| `st.components.v1.html()` para JS | `st.markdown` nao executa `<script>` |
| `fillna("")` antes de `pivot_table` | evita perda silenciosa de linhas com `STANDARD_NAME` nulo |
| `apps/api` consome `src/read_service.py` | evita reimplementar SQL e KPI logic no adaptador HTTP |

---

## Sessoes Recentes

### Sessao 39 - 2026-04-12 (Jules-only intake automatica por GitHub Actions)
- `jules-pr-governance.yml` passa a criar ou reconciliar automaticamente a task retroativa do Jules via `pull_request_target`
- Identificacao do Jules depende dos marcadores no corpo da PR + label persistente `source:jules`
- Task retroativa registra `Source PR`, lane/risco inferidos pelo path policy e write-set reconciliado a cada `synchronize`
- `PR Issue Guardrails` volta a ser estrito para PRs humanas; ignora PRs do Jules (governanca centralizada no workflow dedicado)
- Casos ambiguos, domain mix proibido ou paths nao classificados falham com pedido de triagem humana e mantem a PR em draft
- `scripts/register_jules_pr.ps1` deixa de fazer parte do fluxo oficial
- Configuracao de governanca do Jules versionada em `.github/guardrails/path-policy.json`

### Sessao 38 - 2026-04-12 (governanca retroativa para PRs do Jules)
- Workflow dedicado criado para detectar PRs do Jules e orientar regularizacao da governanca
- `PR Issue Guardrails` aceita `PR-first` somente quando autoria for do Jules e issue retroativa estiver vinculada
- Tasks retroativas usam `Workspace da task = jules://github/pr/<numero>` e label `automation:jules`
- `scripts/register_jules_pr.ps1` criado para criar task retroativa e atualizar a PR

---

## Changelog de Governanca (sessoes 22-37)

- **S37** 2026-04-09 — child tasks formais entre lanes; `Task mae`, `Lane solicitante`, `Tasks filhas`, `Criterio de consumo`; `status:awaiting-consumption`
- **S36** 2026-04-08 — `scripts/pr_complete.ps1`; fechamento exige checks verdes + merge confirmado + issue fechada + branch remota removida
- **S35** 2026-04-08 — fix em `scripts/worktree_remove.ps1` (merge-check local vazio)
- **S34** 2026-04-08 — tres lanes oficiais; `1 task = 1 owner = 1 branch = 1 worktree = 1 PR`; `path-policy.json`; guardrail de PR; scripts `worktree_*.ps1`
- **S33** 2026-04-08 — smoke V1 revalidado; `desktop/cvm_pyqt_app.py` via `python -m desktop.cvm_pyqt_app`
- **S32** 2026-04-08 — labels `risk:*`; template de task com `Owner atual`, `Write-set esperado`, `Classificacao de risco`; PRs `risk:shared`/`risk:contract-sensitive` abrem em draft
- **S31** 2026-04-08 — `AGENTS.md` na raiz; issue templates; PR template; workflow `pr-issue-guardrails.yml`; labels `kind:*`, `status:*`, `priority:*`, `area:*`
- **S30** 2026-04-08 — `/design-system` com 24 secoes; 20+ componentes 21st.dev; OkLch chart tokens; `components/providers.tsx`
- **S29** 2026-04-08 — `apps/web` criado (Next.js 16, App Router, TypeScript, Tailwind, shadcn); rotas `/`, `/empresas`, `/empresas/[cd_cvm]`
- **S28** 2026-04-08 — `apps/api` criado (FastAPI read-only sobre `src/read_service.py`); `docs/V2_API_CONTRACT.md`; CI atualizado
- **S27** 2026-04-07 — `docs/WEBAPP_TRANSFORMATION_PLAN.md`; proposito duplo documentado (sistema operacional + trilha de aprendizado)
- **S26** 2026-04-07 — ADR 0002 (stack V2: Next.js + FastAPI + PostgreSQL)
- **S25** 2026-04-06 — docs cleanup; alinhamento ao fluxo atual
- **S24** 2026-04-05 — `docs/STUDENT_PACK_PLAN.md`; milestone `Student Pack 60 dias`
- **S23** 2026-04-05 — docs alinhados ao estado real; dashboard 3 abas confirmado
- **S22** 2026-04-01 — doc-architect overhaul; ~41 scripts arquivados; docs reorganizados em `docs/`

### Sessao 43 - 2026-04-13 (governanca kickoff e merge de PRs Jules)
- Triagem da lane `ops-quality` realizada via skill kickoff.
- Issue #14 desbloqueada: `fix_jules_pr_gov.py` classificado no `path-policy.json`.
- PR #2 mergeada (Excel alignment + unblock infra); PR #6 em processo de merge.
- Conta do GitHub restaurada apos suspensao 403.

### Sessao 44 - 2026-04-14 (Merge de PRs de Otimizacao do Jules)
- Merge de 3 PRs do Jules (#23, #25, #29) focadas em performance.
- Issues retroativas (#24, #26, #30) fechadas automaticamente pelo merge.
- CI restaurado e validado apos os merges.

### Sessao 45 - 2026-04-15 (context optimizer + clone DB)
- Agent context optimizer aplicado: startup load reduzido de ~998 para ~687 linhas (-31%).
- `.claudeignore` criado; `CLAUDE.md` dividido em Level 1 (165 linhas) + `docs/CLAUDE_REFERENCE.md`.
- `docs/AGENTS.md` comprimido de 271 para 103 linhas; cap de 150 linhas estabelecido.
- PR #32 mergeada; DB de `cvm_repots_capture` clonada para `data/db/` (762 MB, gitignored).

---

> **Historico completo (sessoes 1-21):** consulte `git log --oneline`.
