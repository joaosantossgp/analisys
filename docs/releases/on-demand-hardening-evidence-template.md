# On-Demand Hardening Evidence Template

Use este template em release notes ou PRs que entreguem mudancas estrategicas no
fluxo on-demand.

## Escopo validado

- Issue/PR:
- Tipo de mudanca:
- Rotas ou endpoints afetados:
- Fora de escopo declarado:

## Gates obrigatorios

- `CI / test-web / Run web unit tests`:
- `CI / test-web / Seed web smoke database`:
- `CI / test-web / Run on-demand Playwright smoke`:
- `PR Issue Guardrails`:
- `perf-guardrails`:

## Checklist funcional

- Search/entry:
- Wait/polling:
- Success handoff:
- Mobile continuity:
- Terminal outcomes:
- Mixed readable outcomes:

## Evidencia manual, se aplicavel

Anexe screenshots, traces ou notas de navegacao somente quando a mudanca altera
UI visivel, copy critica, layout mobile ou um fluxo que os gates automatizados
nao demonstram sozinho.

## Lacunas aceitas

- Future-stage only:
- Risco residual:
- Follow-up issue, se houver:
