# ADR 0005 - Offline governance ledger during GitHub outage

- Status: accepted
- Data: 2026-04-12

## Contexto

O contrato operacional do repositorio assume backlog e rastreabilidade via GitHub
Issues, branches, worktrees e PRs. Durante a indisponibilidade temporaria desse
fluxo, o projeto ainda precisa manter:

- organizacao de trabalho
- rastreabilidade de mudancas
- clareza de write-set e ownership
- registro de decisoes duraveis
- caminho limpo de migracao de volta ao GitHub

Sem uma estrutura minima local, o repo raiz vira uma mistura de contexto de
chat, mudancas de codigo e decisoes tacitas dificeis de reconstituir.

## Decisao

Enquanto Git/GitHub estiverem fora do fluxo operacional, o projeto passa a usar
um ledger local em `docs/local-ops/` com as seguintes regras:

- `INDEX.md` funciona como backlog local temporario e fonte de verdade offline
- cada task local recebe ID estavel `LT-####`
- cada task local declara owner, lane, workspace offline, write-set, risco e
  mapeamento futuro para issue GitHub
- evidencias operacionais vivem em `docs/local-ops/evidence/<task-id>/`
- decisoes duraveis continuam em `docs/decisions/`
- `.ai-activity.log` continua como trilha append-only de mudancas executadas

## Consequencias

### Positivas

- reduz retrabalho e perda de contexto durante o periodo offline
- deixa claro o que e backlog local, o que e decisao duravel e o que e trilha de
  execucao
- facilita criar issues futuras sem reabrir investigacoes ja concluida

### Custos

- exige disciplina manual de atualizacao do ledger e das evidencias
- nao substitui branch/worktree/PR; apenas reduz o caos enquanto eles nao
  estiverem disponiveis

## Retorno ao fluxo formal

Quando GitHub voltar:

1. cada `LT-####` relevante deve virar issue formal
2. a issue deve apontar para a evidencia acumulada localmente
3. o ledger local deve registrar numero da issue, branch e PR correspondentes
4. a task local so deve ser arquivada depois que a migracao estiver clara
