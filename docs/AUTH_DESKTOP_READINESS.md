# AUTH_DESKTOP_READINESS — Análise de autenticação para o app desktop

**Data:** 2026-05-03  
**Issue:** [#240](https://github.com/joaosantossgp/analisys/issues/240)  
**ADR:** [docs/decisions/0006-auth-desktop.md](decisions/0006-auth-desktop.md)  
**Status:** Spike concluído — sem implementação. Recomendação: Abordagem A (PIN local único).

---

## Contexto

O app desktop CVM Analytics roda localmente: pywebview instancia um `CVMBridge` Python e
abre um `webview.Window` que carrega o Next.js standalone. Hoje não há nenhuma camada de
autenticação. Este documento avalia três abordagens viáveis e conclui que o stack atual
não bloqueia nenhuma delas.

### Stack relevante

| Componente | Arquivo | Papel |
|---|---|---|
| Entry point | `desktop/app.py` | Instancia `CVMBridge`, passa como `js_api` ao pywebview |
| Bridge Python | `desktop/bridge.py` | `CVMBridge` — métodos expostos via `window.pywebview.api.*` |
| Shim JS | `apps/web/lib/desktop-bridge.ts` | Detecta `window.pywebview` e roteia chamadas |
| Frontend | Next.js standalone (sem SSR em produção) | Roda na janela pywebview |

A janela é única (`webview.create_window` chamado uma vez). Não há servidor remoto, autenticação
de rede ou sessão HTTP no fluxo desktop — apenas mensagens JS→Python via pywebview.

---

## Abordagem A — PIN local único (`~/.cvm-analytics/auth.json`)

### Como funciona

1. Na primeira execução, o app exibe um fluxo de configuração de PIN (4–8 dígitos).
2. O PIN é hasheado com `hashlib.sha256` (ou `bcrypt`) e salvo em
   `~/.cvm-analytics/auth.json`:
   ```json
   { "pin_hash": "<hex>", "algo": "sha256" }
   ```
3. Em toda inicialização subsequente, o pywebview navega para `/login` antes de liberar
   qualquer rota da aplicação.
4. O `CVMBridge` adiciona `_authenticated: bool = False`. Cada método público verifica
   `_authenticated` e retorna `{"error": "not_authenticated"}` se falso.
5. Um novo método `login(params)` recebe `{"pin": "..."}`, valida o hash e seta
   `_authenticated = True` na instância.

### Mudanças no bridge (`desktop/bridge.py`)

```python
class CVMBridge:
    def __init__(self) -> None:
        # (campos existentes mantidos)
        self._authenticated: bool = False

    def _require_auth(self) -> dict | None:
        if not self._authenticated:
            return {"error": "not_authenticated", "code": 401}
        return None

    def login(self, params=None) -> dict:
        p = params or {}
        pin = str(p.get("pin", ""))
        import hashlib, json, pathlib
        auth_path = pathlib.Path.home() / ".cvm-analytics" / "auth.json"
        if not auth_path.exists():
            # Primeiro uso: salvar PIN
            auth_path.parent.mkdir(parents=True, exist_ok=True)
            pin_hash = hashlib.sha256(pin.encode()).hexdigest()
            auth_path.write_text(json.dumps({"pin_hash": pin_hash, "algo": "sha256"}))
            self._authenticated = True
            return {"ok": True, "first_setup": True}
        data = json.loads(auth_path.read_text())
        pin_hash = hashlib.sha256(pin.encode()).hexdigest()
        if pin_hash == data["pin_hash"]:
            self._authenticated = True
            return {"ok": True}
        return {"ok": False, "error": "PIN incorreto"}

    def logout(self, params=None) -> dict:
        self._authenticated = False
        return {"ok": True}

    def get_companies(self, params=None) -> dict:
        if err := self._require_auth(): return err
        # ... lógica existente
```

> **Invariante pywebview:** o bridge é instância única por sessão — `_authenticated`
> persiste enquanto a janela está aberta. Fechar e reabrir o app reinicia o estado.

### Mudanças na UI (`apps/web/`)

| Artefato | O que fazer |
|---|---|
| `app/login/page.tsx` (novo) | Formulário de PIN; chama `bridgeLogin(pin)` no bridge |
| `hooks/useAuth.ts` (novo) | Hook que chama `check_session` no bridge e expõe `{ authenticated, login, logout }` |
| `app/layout.tsx` | Envolve children com `<AuthGuard>` que redireciona para `/login` se não autenticado |
| `app/atualizar-base/page.tsx` | Já protegida pelo guard acima |

```ts
// lib/desktop-bridge.ts — acrescentar
export async function bridgeLogin(pin: string): Promise<{ ok: boolean; error?: string }> {
  return callBridge<{ ok: boolean; error?: string }>("login", { pin });
}
export async function bridgeLogout(): Promise<void> {
  await callBridge<{ ok: boolean }>("logout", {});
}
```

### Estimativa de esforço

**S (~1 dia)**
- Bridge: ~40 linhas novas
- UI: 1 página `/login`, 1 hook, 1 guard de layout
- Nenhuma dependência nova — `hashlib` já está na stdlib

### Limitações

- Não protege contra acesso direto ao arquivo SQLite (dados ficam em disco sem criptografia).
- Não suporta múltiplos usuários com senhas distintas.
- PIN armazenado como SHA-256 simples é suficiente para proteção casual; para ameaças
  sérias usar `bcrypt` (dependência nova: `pip install bcrypt`).

---

## Abordagem B — Multi-user com `auth_users.json` + bcrypt + session token

### Como funciona

1. `~/.cvm-analytics/auth_users.json` armazena lista de usuários com senhas hasheadas
   por bcrypt:
   ```json
   { "users": [{ "username": "joao", "pw_hash": "$2b$..." }] }
   ```
2. `login(params)` recebe `{"username": "...", "password": "..."}`, verifica bcrypt, e
   gera um `session_token` (UUID4) armazenado em `self._sessions: set[str]`.
3. Cada chamada subsequente ao bridge passa `{"session_token": "..."}` nos params. O
   bridge valida antes de processar.
4. `logout` invalida o token da sessão.

### Mudanças no bridge

```python
import uuid, bcrypt

class CVMBridge:
    def __init__(self) -> None:
        # (campos existentes)
        self._sessions: set[str] = set()

    def _require_auth(self, params: dict) -> dict | None:
        token = params.get("session_token")
        if token not in self._sessions:
            return {"error": "not_authenticated", "code": 401}
        return None

    def login(self, params=None) -> dict:
        p = params or {}
        # ... valida username/password com bcrypt, gera token UUID4
        token = str(uuid.uuid4())
        self._sessions.add(token)
        return {"ok": True, "session_token": token}
```

> **Implicação:** cada chamada ao bridge precisaria incluir `session_token` nos params.
> O shim JS (`desktop-bridge.ts`) manteria o token em memória após o login e o injetaria
> automaticamente em `callBridge`.

### Mudanças na UI

Mesmas da Abordagem A, mais:
- Formulário de login com campos `username` + `password`
- `callBridge` modificado para injetar `session_token` em todos os params
- Página de gerenciamento de usuários (opcional para MVP)

### Estimativa de esforço

**M (~3 dias)**
- Bridge: ~80 linhas novas + refactor de assinatura de todos os métodos
- UI: mesmas páginas + injeção de token no shim
- Dependência nova: `bcrypt`

### Limitações

- Mais complexo que o necessário para um app de usuário único.
- Session token em memória é perdido ao fechar o app — usuário precisa fazer login
  novamente a cada abertura (aceitável).
- Não há proteção contra token sniffing dentro do processo JS (mesma origem).

---

## Abordagem C — OS-level identity via `getpass.getuser()` + ACL local

### Como funciona

1. Ao iniciar, o bridge obtém o usuário do sistema: `getpass.getuser()`.
2. Um arquivo `~/.cvm-analytics/acl.json` lista usuários permitidos:
   ```json
   { "allowed_users": ["joao"] }
   ```
3. Se o usuário não estiver na lista, o app exibe tela de acesso negado e encerra.
4. Sem senha — a autenticação depende do login do SO.

### Mudanças no bridge

```python
import getpass, json, pathlib, sys

def _check_os_auth() -> None:
    user = getpass.getuser()
    acl_path = pathlib.Path.home() / ".cvm-analytics" / "acl.json"
    if acl_path.exists():
        data = json.loads(acl_path.read_text())
        if user not in data.get("allowed_users", []):
            sys.exit(f"Usuário '{user}' não autorizado.")

# chamado em desktop/app.py antes de webview.create_window(...)
```

### Mudanças na UI

Mínimas — sem tela de login. Apenas uma página de "acesso negado" acessível se o
pywebview navegar para ela antes de fechar.

### Estimativa de esforço

**S (~0.5 dia)**
- Apenas lógica em `desktop/app.py` antes de criar a janela
- Zero mudanças no bridge ou no frontend

### Limitações

- Sem senha — proteção apenas por identidade do SO.
- Não funciona bem em cenário de PC compartilhado onde múltiplas contas do Windows
  poderiam rodar o app.
- Não há como bloquear acesso sem trocar de sessão do Windows.

---

## Comparativo

| Critério | A — PIN local | B — Multi-user | C — OS identity |
|---|---|---|---|
| Esforço | S (~1 dia) | M (~3 dias) | S (~0.5 dia) |
| Suporte multi-user | Não | Sim | Parcial (via contas SO) |
| Requer senha/PIN | Sim | Sim | Não |
| Depende de libs externas | Não (sha256) / Opcional (bcrypt) | Sim (bcrypt) | Não |
| UX de login | Simples | Moderada | Nenhuma |
| Proteção vs acesso casual | Alta | Alta | Média |
| Extensível para multi-user futuramente | Sim (→ B) | Já é | Baixa |

---

## Confirmação: o stack atual não bloqueia nenhuma das 3 abordagens

| Abordagem | Por quê não bloqueia |
|---|---|
| A | `CVMBridge.__init__` pode receber `_authenticated: bool`. O método `login()` é apenas mais um método exposto pelo bridge. O JS chama antes de qualquer outra coisa. |
| B | `callBridge` no TS já injeta params como dict — adicionar `session_token` é transparente. O bridge já manipula params livres. |
| C | `getpass.getuser()` roda antes de `webview.create_window()` — completamente fora do ciclo do bridge. |

pywebview não impõe restrições sobre quantos métodos o bridge expõe, nem sobre quando
eles podem ser chamados. O Next.js rodando standalone no processo filho não tem acesso
privilegiado ao bridge — apenas o JS na janela pywebview tem, via `window.pywebview.api`.

---

## Recomendação

**Abordagem A (PIN local único)** para o MVP atual.

O app é single-user por design (SQLite local, dados do usuário, sem backend remoto). A
Abordagem A oferece proteção adequada contra acesso casual com custo de implementação
mínimo e zero dependências novas. Se o produto evoluir para multi-usuário, a estrutura
do bridge (método `login`, flag `_authenticated`) permite migrar para B sem breaking
changes na interface JS.

Detalhes da decisão em [ADR-0006](decisions/0006-auth-desktop.md).
