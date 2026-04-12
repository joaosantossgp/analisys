# Local Ops Index

Fonte de verdade operacional temporaria enquanto Git/GitHub estiverem fora do fluxo.

## Objetivo

- Manter backlog local minimo, rastreavel e sem depender de issue/PR remota.
- Evitar retrabalho, perda de contexto e colisao de write-set no repo raiz.
- Preparar a futura volta ao GitHub com mapeamento claro de cada task local.

## Regras offline

- `1 local task = 1 owner = 1 write-set = 1 checklist`
- Status validos: `draft`, `in_progress`, `blocked`, `done`
- `docs/AGENTS.md` continua como historico tecnico e nao vira backlog vivo
- Decisoes duraveis continuam em `docs/decisions/`
- Mudancas executadas continuam registradas em `.ai-activity.log`
- Toda task local deve declarar:
  - owner atual
  - lane oficial
  - workspace offline
  - write-set esperado
  - risco
  - futuro mapeamento para issue GitHub

## Estrutura

- `docs/local-ops/tasks/`:
  uma task por arquivo, com ID estavel `LT-####`
- `docs/local-ops/evidence/<task-id>/`:
  evidencias, matrizes, dumps e relatorios de validacao

## Backlog local ativo

| ID | Status | Lane | Owner | Write-set principal | Futuro mapeamento GitHub |
|---|---|---|---|---|---|
| `LT-0001` | `done` | `lane:backend` | `ai:codex` | `src/**`, `desktop/**`, `tests/**`, `docs/**`, `data/**` | Task: "Recuperar anual 2025 e endurecer planner/cache" |

## Protocolo de retorno ao GitHub

Quando o fluxo formal voltar:

1. Criar uma issue por task local ainda aberta ou relevante historicamente.
2. Copiar para a issue:
   - contexto
   - write-set
   - riscos
   - checklist
   - links para evidencias em `docs/local-ops/evidence/`
3. Marcar a task local com:
   - numero da issue
   - branch/PR quando existirem
   - status final de migracao
4. So depois arquivar ou congelar a task local.
