# LT-0001 - Global annual 2025 recovery and offline governance bootstrap

- Status: `done`
- Owner atual: `ai:codex`
- Lane oficial: `lane:backend`
- Workspace offline: `C:\Users\jadaojoao\Documents\cvm_repots_capture`
- Classificacao de risco: `risk:data-integrity`
- Futuro mapeamento GitHub:
  - issue title sugerido: `Recuperar anual 2025 e impedir falso "completo" em anos fechados`
  - labels sugeridos: `kind:task`, `status:in-progress`, `priority:high`, `area:data-pipeline`, `risk:data-integrity`, `lane:backend`

## Contexto

A base local passou a expor `2024` como ultimo ano anual disponivel para companhias que ja tinham `1Q25/2Q25/3Q25`. A inconsistencia nao e isolada: o banco possui cobertura trimestral de `2025`, mas nao possui nenhum periodo anual `2025`.

## Objetivos

- Rebaixar e reprocessar o `DFP 2025` oficial da CVM em escopo global.
- Impedir que o planner considere um ano fechado como completo quando so houver periodos trimestrais.
- Preservar o contrato publico anual-only de `/companies/{cd_cvm}/years`, `anos_disponiveis` e `referenceYear`.
- Criar uma governanca local minima que suporte trabalho offline sem perder rastreabilidade.

## Write-set esperado

- `src/scraper.py`
- `src/refresh_service.py`
- `desktop/services.py`
- `tests/test_scraper.py`
- `tests/test_refresh_service.py`
- `tests/test_cvm_pyqt_app.py`
- `docs/V2_API_CONTRACT.md`
- `docs/INTERFACE_MAP.md`
- `docs/CONTEXT.md`
- `docs/decisions/0005-offline-governance-ledger.md`
- `docs/local-ops/**`
- `.ai-activity.log`
- `data/input/raw/dfp_cia_aberta_2025.zip`
- `data/input/processed/*_2025.csv`
- `data/db/cvm_financials.db`

## Evidencias

- Matriz inicial: [evidence-matrix.md](C:\Users\jadaojoao\Documents\cvm_repots_capture\docs\local-ops\evidence\LT-0001\evidence-matrix.md)
- Validacao final: [post-refresh-validation.md](C:\Users\jadaojoao\Documents\cvm_repots_capture\docs\local-ops\evidence\LT-0001\post-refresh-validation.md)

## Checklist

- [x] Confirmar que a divergencia e global e nao apenas das 3 companhias alvo
- [x] Confirmar que o cache local de `DFP 2025` esta obsoleto
- [x] Confirmar que o `DFP 2025` remoto ja contem anual para Kroton/Cogna, YDUQS e Ser
- [x] Ajustar o scraper para invalidar ZIP local suspeito por metadata remota
- [x] Ajustar o planner para exigir periodo anual em anos fechados
- [x] Ajustar o health snapshot para nao tratar ano fechado trimestral como coberto
- [x] Cobrir a nova regra com testes
- [x] Atualizar a documentacao do contrato anual-only
- [x] Inicializar o ledger offline
- [x] Rodar a recarga global de `2025`
- [x] Validar `2025` anual no banco e na camada de leitura
- [x] Registrar a evidencia final e encerrar a task local

## Resultado final

- ZIP local `DFP 2025` substituido pela versao oficial atual da CVM.
- Banco passou de `0` para `406` companhias com periodo anual `2025`.
- `438` companhias tiveram refresh `2025` com `success`.
- `11` companhias ficaram em `no_data`, separadas do problema original de cache e planner.
- `17973`, `21016` e `23221` passaram a expor `2025` em `get_available_years` e no endpoint HTTP `/companies/{cd_cvm}/years`.

## Residual conhecido

- O bundle de KPIs trimestrais continua deduplicando `4Q` em `YYYY` por design atual.
- A matriz de demonstracoes ja exibe `4Q25` explicitamente para as companhias com anual `2025`.

## Decisoes desta task

- Fonte canonica do projeto para disponibilidade e conteudo: `CVM Dados Abertos (DFP/ITR)`.
- RI fica como evidencia complementar de timing/disclosure, nao como fonte primaria de ingestao.
- Ano fechado so conta como completo quando existir o pacote obrigatorio no periodo anual `YYYY`.
- O seletor de anos continua anual-only; periodos trimestrais isolados nao entram em `anos_disponiveis`.
