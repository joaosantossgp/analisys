# On-Demand Release Evidence

Este checklist define a barra minima para mudancas estrategicas no fluxo
on-demand. Ele complementa os gates automatizados; nao substitui testes.

## Quando usar

Use este checklist em PRs que alterem busca/entrada, detalhe de companhia sem
dados, polling/wait state, handoff de sucesso, outcomes terminais, mensagens de
freshness ou continuidade mobile do fluxo on-demand.

Mudancas sem impacto no on-demand podem apenas declarar "nao aplicavel" no PR.

## Gates automatizados

O job `test-web` do workflow `CI` deve passar com estes passos:

- `Run web unit tests`: executa `npm run test:unit`.
- `Seed web smoke database`: executa `python ../../scripts/seed_web_smoke_db.py`.
- `Run on-demand Playwright smoke`: executa `npm run test:e2e -- tests/smoke.spec.ts`.

O smoke cobre entrada por busca, sugestoes same-origin, detalhe sem historico e
navegacao mobile critica. Os unitarios cobrem polling/wait, handoff de sucesso,
outcomes terminais e cenarios mistos de dados legiveis.

## Checklist de aceitacao

- Search/entry: busca da home ou do compare chega ao destino certo sem CORS ou
  chamada direta para host externo.
- Wait/polling: estados `queued`, `running`, reconnecting e delayed mantem
  feedback nao destrutivo e caminho de recuperacao.
- Success handoff: sucesso tecnico so vira sucesso de leitura quando existe
  `has_readable_current_data` ou sinal equivalente.
- Mobile continuity: navegacao essencial continua acessivel no viewport mobile.
- Terminal outcomes: `success`, `no_data`, `error`, stalled e already-current
  mostram copy e CTA coerentes.
- Mixed readable outcomes: erro/no-data retryable preserva a leitura existente
  quando `has_readable_current_data=true`.
- CI evidence: linkar o run do workflow `CI` com `test-web` verde.
- Manual evidence: anexar screenshot/trace apenas quando a PR muda UI visivel
  ou comportamento de navegacao que o smoke nao consegue demonstrar sozinho.

## Evidencia minima no PR

Inclua no corpo ou comentario final do PR:

- Issue/task vinculada.
- Comandos locais executados, quando aplicavel.
- Link para o run de CI.
- Resultado dos gates de on-demand.
- Riscos ou lacunas assumidas, incluindo itens future-stage only.

## Future-stage only

Nao bloquear releases atuais por itens que ainda nao existem no produto:

- progresso realtime por SSE/websockets;
- notificacoes email, push ou inbox;
- session replay ou analytics pagos;
- historico detalhado de jobs para usuario final.
