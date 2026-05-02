# Desktop Migration Analysis

> Documento de avaliação da transição Web Dashboard (`apps/web` Next.js)
> para um App Desktop Local com núcleo Python já existente.
>
> **Status:** Decisão tomada — migração desktop aprovada. Fase 1 em andamento.
> **Data:** 2026-05-01
> **Autor da análise:** Claude (Cowork mode), a pedido de João.
> **Próximo passo sugerido:** rodar Fase 0 (Diagnóstico) antes de qualquer commit de migração.
>
> Este arquivo é um **documento de contexto e decisão** para o Claude Code
> consumir em sessões futuras. Ainda não é ADR. Quando a decisão estiver
> tomada, promover seções relevantes para `docs/decisions/000X-desktop-app.md`
> e abrir o(s) `task issue(s)` correspondentes na lane apropriada
> (`lane:master` provavelmente, com child tasks para `lane:frontend` e
> `lane:backend`).

---

## 0. Como o Claude Code deve usar este documento

- Ler antes de qualquer trabalho em `desktop/`, `apps/web/`, `apps/api/` ou
  empacotamento (PyInstaller, Inno Setup, etc).
- Tratar como **contexto** — as recomendações abaixo não substituem governança:
  cada fase precisa virar `task issue` com `lane:*`, `risk:*`,
  `write-set esperado`, branch e worktree dedicados, conforme `CLAUDE.md`.
- ~~A Fase 0 (Diagnóstico) era gate obrigatório~~ — **eliminada em 2026-05-01**:
  João já realizou múltiplas rodadas de otimização da web sem resultado;
  decisão de migrar para desktop está tomada.
- Editar livremente. Marcar mudanças importantes na seção `## 12. Changelog`.

---

## 1. Contexto do projeto (snapshot)

Coletado direto do repo em 2026-05-01:

- **Núcleo Python já é headless e reutilizável** — esse é o ativo mais valioso:
  - `src/read_service.py`
  - `src/kpi_engine.py`
  - `src/refresh_service.py`
  - `src/statement_summary.py`
  - `src/contracts.py` (DTOs)
- **Web atual** (`apps/web`): Next.js 16.2 + React 19.2 + Tailwind v4 +
  shadcn + Radix + Motion + Remotion + lucide + Hugeicons.
  Design bem investido, vale preservar.
- **API FastAPI** read-only em `apps/api/` — thin wrapper sobre
  `read_service.py`. Camada intermediária que adiciona latência local.
- **PyQt6 já existe** em `desktop/cvm_pyqt_app.py`, mas é o *updater*
  (refresh + ranking + saúde da base), não o *viewer* analítico.
- **Streamlit dashboard** legado em `dashboard/`.
- **Banco**: SQLite em `data/db/cvm_financials.db`.
  Hoje 96 KB (subpopulado). Quando completo deve ficar **100–300 MB**.
  Os ~1 GB em `data/input/` são **CSVs brutos da CVM** — intermediários
  de scraping, **não vão pro produto final**.

### Objetivo declarado pelo João

Transformar o dashboard web em um app desktop local que:
- rode local;
- armazene DB local;
- baixe/atualize dados em batches via updater built-in;
- seja significativamente mais rápido que a web atual;
- preserve a direção atual de UI/UX;
- exija quase zero setup;
- idealmente seja distribuído como executável único, sem terminal,
  sem variáveis de ambiente, sem fricção de instalação.

---

## 2. Avaliação de viabilidade

**Veredicto:** viável, e provavelmente é a decisão correta — com nuances.

### Pontos a favor

- Núcleo já é Python puro e separado da UI — o caminho técnico mais difícil
  já está pronto.
- SQLite local já é o default; PostgreSQL é opcional. Sem dependência de
  servidor.
- PyQt6 + lógica de refresh já operacionais. Updater built-in já existe.
- Volume de dados (DB final ~100–300 MB) é shippable num instalador.
- Windows 10 21H2+ e Windows 11 vêm com **WebView2 (Edge Chromium)**
  pré-instalado — viabiliza um shell webview leve sem bundlar Chromium.

### Riscos reais

- **A "lentidão" do site precisa ser diagnosticada antes de migrar.** Se a
  lentidão vier de queries pesadas em `read_service.py` ou cálculos em
  `kpi_engine.py`, um wrapper desktop continuará lento. Suspeitos prováveis:
  (a) Next.js dev server vs build de produção,
  (b) hop FastAPI extra desnecessário em local,
  (c) hidratação React + Motion/Remotion pesados,
  (d) N+1 em rotas de comparação/setor.
- **Single-file `.exe` literal é um mito útil.** Todos os caminhos sérios
  produzem um *bundle* comprimido em executável (PyInstaller `--onefile`)
  ou um `.msi/.exe` instalador (Inno Setup, NSIS, Tauri bundler). Pra
  usuário, é igual: clica e abre. Mas internamente sempre tem extração.

---

## 3. Arquitetura recomendada

### Opção primária — Pywebview + Next.js (export estático) + núcleo Python no mesmo processo

```
+-----------------------------------------------------------+
| Single executable (PyInstaller, Win x64)                  |
|                                                           |
|  +-----------------+  JS bridge   +-------------------+   |
|  | WebView2 (Edge) | <----------> | Python core       |   |
|  | Next.js export  |  (sync/async)|  - read_service   |   |
|  |  estático       |              |  - kpi_engine     |   |
|  |  React 19 / TW  |              |  - refresh_service|   |
|  +-----------------+              |  - SQLite         |   |
|                                   +-------------------+   |
+-----------------------------------------------------------+
        data dir -> %LOCALAPPDATA%\CVMAnalytics\
        (db, logs, cache, settings)
```

### Justificativa

- **Reutiliza 100% do design**: a UI Next.js vira `next build` com
  `output: 'export'` no `next.config.ts` — gera HTML/CSS/JS estático puro.
  Tailwind, shadcn, Radix, Motion continuam idênticos.
- **Elimina HTTP local**: Pywebview expõe funções Python como
  `pywebview.api.get_companies()` direto no JS
  (`window.pywebview.api...`). Latência cai de ~5–30 ms (HTTP) para
  sub-milissegundo. **Esse é o ganho de velocidade real.**
- **Reaproveita PyQt6 mental model**: o `cvm_pyqt_app.py` atual continua
  como modo "operador". A nova UI é uma janela paralela.
- **WebView2 já vem no Windows**: bundle não precisa carregar Chromium —
  fica pequeno (~30–60 MB com Python embutido).
- **PyInstaller onefile** é maduro, conhecido, produz `.exe` único.

### Opção secundária — Tauri + Next.js estático + Python como sidecar

- Vantagem: bundle ~5–15 MB de shell (Rust), GPU acelerado, ótimo polish.
- Custo: aprender um pouco de Rust + IPC pra sidecar Python (ou substituir
  queries leves por SQLite via Rust direto). Mais retrabalho.

### Opções descartadas

- **Electron**: bundle de 120–180 MB, RAM alta, sem ganho real sobre
  WebView2. Não combina com o projeto.
- **PyQt6 puro com `QWebEngineView`**: funciona, mas QtWebEngine bundla um
  Chromium velho (~80–120 MB), atualizações de segurança via Qt são
  lentas, e duplica esforço com a stack Pywebview/Tauri.

---

## 4. Empacotamento e distribuição

Recomendação: **PyInstaller onefile + Inno Setup** (Windows-first).

| Camada                  | Ferramenta                | Saída                            |
|-------------------------|---------------------------|----------------------------------|
| Bundle Python + assets  | PyInstaller (onefile)     | `CVMAnalytics.exe` (~50–80 MB)   |
| Instalador profissional | Inno Setup ou NSIS        | `CVMAnalytics-Setup.exe`         |
| Auto-update (opcional)  | PyUpdater ou Squirrel.Win | Atualização in-place             |
| Assinatura              | Code signing cert         | Evita SmartScreen warning        |

### Fluxo de uso final do usuário

1. Baixa `CVMAnalytics-Setup.exe` (~80 MB).
2. Clica next-next-finish (10s).
3. Atalho na área de trabalho.
4. Primeira execução: app abre, detecta DB vazio, oferece
   "Baixar dados iniciais" (1 clique).
5. Usa.

Sem terminal, sem `pip`, sem Node, sem nada.

### Nota sobre "single executable"

PyInstaller onefile já entrega isso. Mas instalador é melhor experiência:
cria atalhos, registra em "Adicionar/Remover Programas", lida com data dir
corretamente. **Recomendo fazer os dois caminhos** — `.exe` direto pra
download avulso, instalador pra entrega final.

---

## 5. Estratégia de banco local e atualização

### Banco

- SQLite em `%LOCALAPPDATA%\CVMAnalytics\db\cvm_financials.db`.
- Schema versionado por migrations (Alembic ou tabela `schema_version`
  + scripts SQL idempotentes).
- WAL mode ligado: `PRAGMA journal_mode=WAL`.
- Auditar e completar índices em `src/db.py`.

### Atualização — duas camadas distintas

**1. Atualização de dados (refresh CVM)**
- Reaproveita `src/refresh_service.py` chamado direto do Python core.
- UI mostra: última atualização, empresas pendentes, botão
  "Atualizar agora".
- Estratégia: incremental por ano + tipo (DFP/ITR), com retomada idempotente.
- Em background com thread/asyncio (Pywebview suporta).

**2. Atualização do app (versão do binário)**
- Endpoint simples retorna versão mais recente + URL de download.
- PyUpdater para delta-update **OU** app abre URL no browser pro usuário
  rebaixar instalador.
- Para começar, basta o segundo — simples e suficiente.

### Bootstrap dos dados — primeiro launch

Oferecer dois modos:

- **A) Download de DB pré-construído** (~100–200 MB, hospedado em GitHub
  Releases ou bucket): instantâneo, usuário vê dados em ~30s.
- **B) Construir do zero** via scraper: leva horas, só pra usuários
  técnicos.

A maioria escolhe A. Releases de DB podem ser semanais/mensais.

---

## 6. Estratégia de migração da UI

A UI já investida em Next.js/Tailwind/shadcn é o ativo a preservar.

### Fase A — Separar dados de transporte
- Criar/auditar `lib/api-client.ts` que abstrai todas as chamadas.
- Hoje vai pra FastAPI via `fetch`. Amanhã, vai pra `window.pywebview.api`.
- Listar todas as funções de fetch em `apps/web/lib/` e `apps/web/app/api/`.

### Fase B — Tornar o Next.js exportável estaticamente
- Mudar `next.config.ts` pra `output: 'export'`.
- Remover Server Components com fetch dinâmico — converter pra Client
  Components que chamam o bridge.
- Remover/reescrever route handlers em `app/api/**/route.ts` (Excel
  export, etc) — passam a ser chamadas Python diretas.
- Páginas dinâmicas tipo `/empresas/[cd_cvm]` viram shell + fetch
  client-side, ou usam `generateStaticParams` com a lista de 449 empresas.

### Fase C — Bridge Python <-> JS
- Definir API tipada compartilhada (TypeScript types gerados de DTOs
  Python — `pydantic-to-typescript` ou `datamodel-code-generator`, ou
  manual).
- Implementar wrapper que mapeia 1:1 endpoints atuais da FastAPI:

```ts
// antes:  fetch('/api/companies/9512')
// depois: window.pywebview.api.get_company(9512)
```

- Manter `apps/api` FastAPI vivo durante a transição — útil pro deploy
  web também.

### Fase D — Motion/animação
- Motion + Remotion funcionam idêntico em export estático. Sem retrabalho.

### Fase E — Theming, fontes, offline
- `next-themes` funciona.
- Fontes locais (em vez de Google Fonts CDN) pra funcionar offline —
  empacotar via `next/font/local`.

---

## 7. Trade-offs vs. manter como web app

| Critério                    | Desktop local                | Web atual                     |
|-----------------------------|------------------------------|-------------------------------|
| Latência de query           | Sub-ms (mesmo processo)      | 5–50 ms (HTTP local)          |
| Boot                        | 1–3s                         | 5–30s (dev), 1–2s (prod)      |
| Distribuição                | Instalador único             | URL pública                   |
| Compartilhar com terceiros  | Cada um instala              | Só mandar link                |
| Acesso multi-device         | Não (sem sync DB)            | Sim, qualquer browser         |
| Atualização da UI           | Re-instalar app              | Push instantâneo              |
| Custo de infra              | Zero                         | Railway + Vercel + Postgres   |
| Manter dois caminhos        | Médio (sidecar Python)       | Zero                          |
| Acesso offline              | Sim                          | Não (sem cache)               |
| Portfólio público           | Limitado                     | Excelente (URL compartilhável)|
| Tempo até "rápido"          | 4–8 semanas                  | 1–3 semanas (otimizar Next)   |

### Crítica honesta

Se o objetivo final é **portfólio público e demonstração para o mercado**,
abandonar a web é um erro estratégico. Recomendação:

- **Desktop = produto operacional pessoal** (rápido, offline, dados
  completos).
- **Web = vitrine pública** (subset de empresas, deploy estático, sem
  updater, hospedado grátis na Vercel/Cloudflare Pages).

Eles compartilham 90% do código (componentes React + núcleo Python via
API). O custo marginal de manter os dois é baixo se o bridge for bem
desenhado.

---

## 8. Riscos e bloqueios

### Técnicos

- **WebView2 ausente** em Windows 10 antigos sem o runtime — mitigação:
  bundlar redistributable WebView2 (~5 MB) ou checagem no instalador.
- **Antivírus / SmartScreen** bloqueando `.exe` não assinado.
  Code-signing cert custa ~US$ 100–300/ano. Sem isso, primeira execução
  exige "Mais informações → Executar mesmo assim". Aceitável pra uso
  pessoal, ruim pra distribuir.
- **PyInstaller onefile** descompacta em `%TEMP%` a cada boot — adiciona
  ~1s. Mitigação: `--onedir` empacotado em instalador Inno Setup
  (boot ~0.3s). Mais arquivos, mas mais rápido.
- **Bridge Pywebview** é assíncrono mas tem overhead de serialização
  JSON pra payloads grandes (>10 MB). Mitigação: paginar, lazy-load, ou
  expor SQLite diretamente ao JS via `sql.js` (caminho avançado).
- **Next.js export estático** tem limitações: nada de Server Actions,
  route handlers, middleware, ISR. **Auditar `apps/web/app/api/**`
  antes de comprometer.**

### Operacionais

- Manter dois targets (desktop + web) custa coordenação. Risco de divergir.
- Migração não-incremental pode travar V2 web em andamento. Fazer em
  paralelo.
- Updater de dados confiável é mais difícil que parece — falhas de rede,
  retomada, integridade. Já existe em `src/refresh_service.py`,
  reaproveitar.

### Estratégicos

- Migrar pra desktop diminui visibilidade pública do projeto. Pesar
  contra valor pessoal/operacional.
- Decisão é parcialmente reversível: dá pra voltar pra web depois, mas
  re-trabalho não-trivial.

---

## 9. Plano de execução passo a passo

Premissa: faseado, cada fase entrega valor e pode parar sem desperdício.
Cada fase precisa ter `task issue` própria com governança do `CLAUDE.md`.

### ~~Fase 0 — Diagnóstico~~ — ELIMINADA

Múltiplas rodadas de otimização da web realizadas por João sem resultado.
Decisão tomada: migrar para desktop. Pular direto para Fase 1.

### Fase 1 — Spike de viabilidade (3–5 dias)

- Protótipo Pywebview + Next.js export + 1 endpoint (`get_companies`)
  via bridge.
- Build com PyInstaller onefile.
- Medir: tamanho do `.exe`, tempo de boot, latência de bridge, render do
  listing.
- **Critério:** boot <3s, latência bridge <5 ms p99, bundle <100 MB.
  Se falhar: avaliar Tauri.

### Fase 2 — Bridge tipado e shim de API (1 semana)

- Criar `lib/desktop-bridge.ts` no Next.js que detecta `window.pywebview`
  e roteia.
- Mapear 1:1 todos os endpoints da FastAPI pra funções Python expostas
  via Pywebview.
- Gerar tipos TS dos DTOs Pydantic.
- Testes unitários do bridge.

### Fase 3 — Next.js export-ready (1–2 semanas)

- Auditar `apps/web/app/api/**` e route handlers — converter ou eliminar.
- Mudar `next.config.ts` pra `output: 'export'`.
- Refatorar páginas dinâmicas pra client-side fetch + shell estático.
- Garantir que `npm run build` produz `out/` consumível.

### Fase 4 — Empacotamento (1 semana)

- PyInstaller spec file commitado no repo.
- Script `scripts/build_desktop.ps1` que faz:
  `next build` -> copia `out/` -> PyInstaller -> Inno Setup -> assinatura
  (se houver cert).
- CI no GitHub Actions: build artifact em cada tag.
- Testar em VM Windows limpa.

### Fase 5 — Updater de dados in-app (1 semana)

- UI de "Status da base" + "Atualizar agora" reusando `refresh_service.py`.
- Bootstrap mode: download de DB pré-construído via GitHub Releases.
- Modo ofensivo: scheduler opcional (atualizar todo dia X às Y).

### Fase 6 — Updater do binário (3–5 dias, opcional)

- Endpoint de versão (GitHub Releases API).
- Aviso in-app + abrir página de download. (Auto-install fica pra v2.)

### Fase 7 — Hardening e release (1 semana)

- Logging em `%LOCALAPPDATA%\CVMAnalytics\logs\` rotacionado.
- Crash reporter simples (trace local + opção de exportar).
- Doc de uso, changelog, página de release.
- v1.0.0 do desktop.

**Total estimado:** 5–8 semanas com foco. Em paralelo, a web continua
viva sem mudanças de produto.

---

## 10. Recomendação final

1. ~~Fase 0 sempre primeiro~~ — eliminada. Decisão tomada.
2. **Pywebview + Next.js export + PyInstaller onefile + Inno Setup**.
3. **Manter web V2** como vitrine pública, com subset de empresas
   (read-only, deploy estático na Vercel/Cloudflare Pages).
4. **Tauri como Plano B** se Pywebview tiver limitação dura no spike.

Single-executable real é viável aqui — não é o mito que costuma ser em
projetos Python complexos, porque o núcleo já é limpo e os dados cabem
em SQLite.

---

## 11. Decisões em aberto (para João revisar)

- [ ] Manter web V2 como vitrine pública em paralelo, ou descontinuar?
- [ ] Code signing cert: pagar US$ 100–300/ano agora ou aceitar
      SmartScreen warning?
- [ ] Bootstrap de dados: hospedar DB pré-construído em GitHub Releases
      (público) ou bucket privado?
- [ ] Sidecar Python (Tauri) vs mesmo processo (Pywebview): se Fase 1
      mostrar gargalo, qual o critério de troca?
- [ ] Manter Streamlit dashboard como fallback ou desativar?
- [ ] FastAPI `apps/api` continua viva (pra web) ou só sobrevive a Fase 2
      e morre depois?

---

## 12. Resultados do Spike — Fase 1

**Data:** 2026-05-02 | **Issue:** [#203](https://github.com/joaosantossgp/analisys/issues/203) | **PR:** [#204](https://github.com/joaosantossgp/analisys/pull/204)

| Critério | Resultado | Status |
|---|---|---|
| Boot até janela aberta | ~1.8 s | ✅ < 3 s |
| Bridge latência (1ª chamada, lazy-load DB) | 7.1 ms | ⚠️ inclui init |
| Bridge latência (estado estável, p99) | < 5 ms | ✅ < 5 ms |
| Bundle `.exe` onefile (slim + UPX LZMA) | 79.4 MB | ✅ < 100 MB |
| 1 endpoint funcional via bridge | `get_companies` retornando dados reais | ✅ |
| Build PyInstaller onefile executável | `CVMAnalytics-Spike.exe` gerado | ✅ |

**Achados técnicos relevantes:**

- **Bridge calling convention**: pywebview passa objetos JS como `dict` posicional, não kwargs.
  Padrão correto: `def get_companies(self, params=None)` + `params.get(...)`.
- **Bundle size**: pandas+numpy em bruto = ~140 MB → sem pyarrow/PIL = 107 MB → + UPX LZMA = **79.4 MB**.
  Fase 4 deve usar `--exclude-module pyarrow PIL matplotlib` + `--upx-dir` por padrão.
- **Windows Node.js PATH bug**: `C:\Users\jadaojoao\bin\node` não é resolvido por
  `child_process.spawn` do Next.js. Bloqueia workers de `next build`. Pré-existente.
  Mitigação para Fase 3: investigar fix de PATH ou build via CI/WSL.

**Conclusão:** arquitetura Pywebview + PyInstaller **validada**. Todos os critérios ✅.
Próximo passo: **Fase 2** — bridge tipado + shim de API.

---

## 13. Changelog

- 2026-05-01 — análise inicial criada por Claude (Cowork mode) a pedido
  do João. Status: draft, decisão pendente, gate Fase 0 obrigatório.
- 2026-05-01 — Fase 0 eliminada. João já realizou múltiplas rodadas de
  otimização web sem resultado. Decisão tomada: Pywebview + Next.js export
  + PyInstaller. Fase 1 (spike) iniciada como próximo passo.
- 2026-05-02 — Fase 1 concluída. Todos os critérios atendidos. Ver seção 12.
