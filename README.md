# CVM Reports Capture

Projeto para captura, tratamento e consulta de demonstracoes financeiras da CVM, com persistencia em SQLite/PostgreSQL, app desktop local em pywebview + UI Next.js, dashboard analitico em Streamlit, API read-only da V2 em FastAPI e app web em Next.js. O app PyQt6 continua no repositorio como legado.

> Este repositorio tem proposito duplo: manter o sistema operacional atual funcionando e servir como trilha de aprendizado para evolui-lo rumo a uma web app mais proxima de producao. A direcao da V2 esta registrada em [docs/decisions/0002-student-pack-v2-stack.md](docs/decisions/0002-student-pack-v2-stack.md), [docs/STUDENT_PACK_PLAN.md](docs/STUDENT_PACK_PLAN.md), [docs/WEBAPP_TRANSFORMATION_PLAN.md](docs/WEBAPP_TRANSFORMATION_PLAN.md), [docs/V2_PHASE1_BACKEND.md](docs/V2_PHASE1_BACKEND.md), [docs/V2_API_CONTRACT.md](docs/V2_API_CONTRACT.md) e [docs/V2_PHASE2_WEB_SLICE.md](docs/V2_PHASE2_WEB_SLICE.md).

## Estrutura principal

- `desktop/app.py`: app local oficial em pywebview com a UI do site (`apps/web`) e bridge Python local.
- `desktop/cvm_pyqt_app.py`: interface PyQt6 legada, mantida apenas para fallback operacional.
- `main.py`: CLI suportada para refresh pontual.
- `apps/api/`: API `FastAPI` read-only da V2.
- `apps/web/`: primeiro slice web da V2 em `Next.js`.
- `src/`: nucleo de captura, padronizacao, leitura, refresh e exportacao.
- `scripts/`: setup de banco, batches, diagnosticos e validacoes.
- `dashboard/`: dashboard analitico em Streamlit.
- `data/`: banco SQLite local, insumos e caches.
- `output/`: logs e artefatos gerados.
- `docs/`: contexto, roadmap e contratos da V2.

## Fluxo recomendado

1. Instalar dependencias Python:

```bash
pip install -r requirements.txt
pip install -r apps/api/requirements-dev.txt
```

2. Se for usar a web:

```bash
cd apps/web
npm install
```

3. Validar ambiente:

```bash
python scripts/runtime_doctor.py --require-canonical
```

4. Inicializar banco em maquina nova:

```bash
python scripts/setup_db.py
python scripts/setup_companies_table.py
```

5. Abrir o app local oficial:

```bash
python -m desktop.app --dev
```

6. Gerar executavel local quando precisar distribuir/validar standalone:

```powershell
.\desktop\build_desktop.ps1
.\dist\CVMAnalytics\CVMAnalytics.exe
```

7. Alternativas headless:

```bash
python main.py --companies PETROBRAS --start_year 2021 --end_year 2025 --type consolidated --skip_complete
python scripts/batch_completo.py --dry-run
python scripts/atualizar_todos.py --anos 2024 2025
```

8. Subir superficies de leitura separadas, quando necessario:

```bash
streamlit run dashboard/app.py
uvicorn apps.api.app.main:app --reload
cd apps/web && npm run dev
```

## Trabalho por task

O repo raiz deve permanecer estavel em `master`. Toda task executavel usa:

- issue com `lane:*`, `risk:*` e `write-set esperado`
- branch `task/<issue-number>-<slug>`
- worktree dedicada em `.claude/worktrees/<lane>/<issue-number>-<slug>/`
- check inicial por chat para tasks abertas da propria lane, child tasks
  recebidas, child tasks solicitadas e PRs abertas ligadas a essas issues
- child task formal quando uma lane precisar de write-set de outra lane; a task
  mae fica `status:blocked` e depois `status:awaiting-consumption` ate a
  solicitante consumir a entrega

Helpers locais:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/worktree_create.ps1 -Issue 27 -Slug exemplo-task -Lane ops-quality
powershell -ExecutionPolicy Bypass -File scripts/worktree_status.ps1
powershell -ExecutionPolicy Bypass -File scripts/worktree_remove.ps1 -Issue 27 -Slug exemplo-task -Lane ops-quality
powershell -ExecutionPolicy Bypass -File scripts/pr_complete.ps1 -Pr 28
```

Regras detalhadas:

- `AGENTS.md`
- `docs/governance/parallel-lanes.md`

## Interfaces oficiais

### 1. App local desktop

Interface principal local. Abre a UI do site (`apps/web`) em uma janela pywebview e usa o bridge Python local para leitura e refresh sem depender da API FastAPI.

```powershell
python -m desktop.app --dev
.\desktop\build_desktop.ps1
.\dist\CVMAnalytics\CVMAnalytics.exe
```

`desktop/cvm_pyqt_app.py` e legado e deve ser usado apenas como fallback.

### 2. Dashboard Streamlit

Aplicacao read-only para consulta do que ja esta no banco, com 3 abas: `Visao Geral`, `Demonstracoes` e `Download`.

```powershell
streamlit run dashboard/app.py
```

### 3. API V2

Aplicacao `FastAPI` read-only em `apps/api`, thin wrapper sobre `src/read_service.py`.

Endpoints principais:
- `GET /health`
- `GET /companies`
- `GET /companies/filters`
- `GET /companies/{cd_cvm}`
- `GET /companies/{cd_cvm}/years`
- `GET /companies/{cd_cvm}/statements`
- `GET /companies/{cd_cvm}/kpis`
- `GET /refresh-status`
- `GET /base-health`

```powershell
uvicorn apps.api.app.main:app --reload
```

Docs:
- Swagger: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`

### 4. Web App V2 Slice 1

Aplicacao `Next.js` em `apps/web`, consumindo exclusivamente a API V2.

Rotas entregues:
- `/`
- `/empresas`
- `/empresas/[cd_cvm]`

```powershell
cd apps/web
Copy-Item .env.example .env.local
npm run dev
```

Variavel principal:
- `API_BASE_URL=http://127.0.0.1:8000`

## Contrato operacional atual

- Configuracao centralizada em `src/settings.py`.
- Diagnostico de startup em `src/startup.py`.
- Refresh headless em `src/refresh_service.py`.
- Leitura headless em `src/read_service.py`.
- `apps/api` e a superficie HTTP oficial da V2.
- `apps/web` e o cliente web oficial do slice `Home -> Empresas -> Empresa`.

## Validacao

```bash
pytest tests/ -q
pytest apps/api/tests -q
pytest tests apps/api/tests -q --cov=src --cov=desktop --cov=dashboard --cov=apps/api/app --cov-report=xml:coverage.xml --cov-report=term
python scripts/runtime_doctor.py --require-db --table financial_reports --table companies --require-canonical
python scripts/db_portability_smoke.py --write-check
cd apps/web && npm run lint
cd apps/web && npm run typecheck
cd apps/web && npm run build
cd apps/web && npm run test:e2e
```

Validacao PostgreSQL real:

```bash
python scripts/runtime_doctor.py --database-url postgresql://user:pass@host:5432/db --require-db --table financial_reports --table companies
python scripts/db_portability_smoke.py --database-url postgresql://user:pass@host:5432/db --write-check
```

## Observacoes

- Prefira `desktop/app.py` como app local oficial.
- Prefira executar o app local como modulo em desenvolvimento: `python -m desktop.app --dev`.
- `desktop/cvm_pyqt_app.py` e legado; nao o ressuscite como experiencia principal.
- Prefira `src/refresh_service.py` e `src/read_service.py` como contratos de nucleo.
- O frontend da V2 deve consumir a API, nao reimplementar queries do `src/`.
- O dashboard atual continua sendo fallback read-only durante a transicao.
- Erros e execucoes de refresh ficam em `output/logs/`, incluindo `refresh_runs.jsonl`.
