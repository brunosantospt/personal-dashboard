# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Projeto: Personal Dashboard

App web full-stack, auto-hospedada numa VPS Hetzner, que mostra em modo quiosque num tablet Android (Lenovo M10 HD) um painel pessoal: relógio, data, Google Calendar, Google Tasks, Spotify "now playing" e meteorologia (Open-Meteo). Configurável por um Admin Panel separado.

**Fonte de verdade:** `personal_dashboard_spec.docx` — ler antes de qualquer decisão de arquitetura. Esta secção é só um resumo.

**Estado: greenfield.** Ainda não existe código, só a spec. Arrancar pela Fase 1 (core backend) → Fase 2 (OAuth) — sem autenticação funcional o resto não vale a pena.

### Stack
- **Backend:** Python 3.11+, FastAPI 0.110+, SQLAlchemy 2.0+, SQLite. WebSockets nativos do FastAPI.
- **Dashboard View** (o que o tablet mostra): HTML5 + CSS3 + JS vanilla, **sem frameworks**.
- **Admin Panel:** React 18 (Vite) + Tailwind.
- **Infra:** Nginx (reverse proxy), systemd ou PM2, HTTPS via Certbot. Tudo em `/opt/dashboard/`.

### Três deployables, um domínio
Tudo sob `dashboard.dominio.com`:
- `/` → Dashboard View (estático, `frontend/`) — consumido pelo tablet em kiosk.
- `/admin` → Admin Panel (estático, build Vite em `admin/dist/`).
- `/api` e `/ws` → FastAPI (porta 8000).

Backend planeado em `backend/`: `main.py`, `routers/` (auth, widgets, admin, ws), `services/` (google, spotify, meteo), `models.py`, `database.py`, `.env`. SQLite com tabelas `settings`, `oauth_tokens`, `widget_config`, `cache`.

### Invariantes que NÃO se quebram
- **Segredos só no servidor.** Client secrets e tokens OAuth nunca chegam ao frontend — este só recebe dados já processados. Tokens guardados encriptados com Fernet (chave em `.env`).
- **`.env` nunca no git** (`.gitignore`). Nada de segredos hardcoded.
- **Renovação automática de tokens** via refresh token (manutenção zero). Se o refresh falhar/for revogado → alerta no admin para re-auth.
- **Resiliência por widget:** se uma API falhar, as outras continuam. Mostrar último valor da tabela `cache` (com `ttl_seconds`) + indicador visual e timestamp.
- **Dashboard independente do admin:** a View tem de funcionar mesmo com o admin offline.
- **WebSocket com reconexão automática** no cliente — testar quedas.
- **Admin protegido:** password (hash bcrypt em `.env`), sessão JWT 24h, rate limit nas rotas de auth.

### Prioridades de produto
- O **visual da Dashboard View é o que mais importa** — é vista todos os dias a ~1.5 m. Dark mode por omissão, tipografia grande e legível. Carregar em <2 s na rede local.
- **Custo zero:** só APIs gratuitas (Google free quota, Spotify free, Open-Meteo sem chave).

### APIs externas (polling)
- Google Calendar (`calendar.readonly`) — 5 min.
- Google Tasks (`tasks.readonly`, mesmo token) — 10 min.
- Spotify (Authorization Code + PKCE; scopes `user-read-currently-playing`, `user-read-playback-state`) — 10 s quando há música a tocar.
- Open-Meteo (sem auth) — 30 min; localização default Porto (`LAT 41.1579`, `LON -8.6291`).

### Comandos
**Backend** (raiz do repo, com o venv ativo — `source .venv/bin/activate`):
```
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Serve `/api`, `/ws`, a Dashboard View em `/`, o carousel em `/photos` e o Admin em `/admin` (se `admin/dist` existir). SQLite criada no arranque.

**Admin Panel** (`admin/`): `npm install`, depois `npm run dev` (Vite na 5173, com proxy `/api`→8000) ou `npm run build` (gera `admin/dist`, servido pelo FastAPI em `/admin`).

**Config local:** copiar `.env.example` → `.env`. Para o admin, gerar hash bcrypt da password em `ADMIN_PASSWORD_HASH`. Config de apresentação (tema/layout/widgets) vive na tabela `settings` e é editada pelo Admin; os valores do `.env` (`ACCOUNT_LABELS`, `CALENDAR_HIDE`, `CALENDAR_HORIZON_DAYS`, localização) são os defaults iniciais.

---

## Regras de trabalho

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
