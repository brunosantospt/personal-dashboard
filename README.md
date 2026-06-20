# Personal Dashboard

Painel pessoal full-stack, auto-hospedado, para exibição permanente em modo quiosque num tablet Android (Lenovo M10 HD). Agrega Google Calendar, Google Tasks, Spotify "now playing" e meteorologia (Open-Meteo) numa única interface, configurável por um Admin Panel.

> **Estado:** greenfield — desenvolvimento local. Hosting final: VPS Hetzner.

## Stack

- **Backend:** Python 3.11+ · FastAPI · SQLAlchemy · SQLite · WebSockets
- **Dashboard View:** HTML/CSS/JS vanilla (sem frameworks)
- **Admin Panel:** React 18 (Vite) + Tailwind
- **Infra:** Nginx · Certbot (HTTPS) · systemd/PM2

## Documentação

- **Spec técnica completa:** [`personal_dashboard_spec.docx`](./personal_dashboard_spec.docx) — fonte de verdade.
- **Guia para desenvolvimento (Claude Code):** [`CLAUDE.md`](./CLAUDE.md).
