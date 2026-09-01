# Glossary — Hermes Bot

This page is the source of truth that replaces the Notion brief for product language.

Hermes Bot is a **phone client**. Users should never need the words *session*, *profile*, *compaction*, *YAML*, or *VPS* in the UI. Those terms appear here only so engineers can map product language to Hermes Agent.

| Term | Meaning |
|------|---------|
| **Hermes Bot** | This Expo app. Named teammates, one forever chat each, home = agent list. Not “Hermes Mobile”. |
| **Instance / host** | One machine (or VM) running Hermes, typically exposed via `hermes serve` / `hermes dashboard` on **:9119**. v1 connects to **one** existing host URL. |
| **Profile** | A Hermes configuration home (`HERMES_HOME`) on that host — models, tools, skills. Optional on `session.create` when the gateway lists profiles. Users see “agents”, not profiles. |
| **Chat session** | Hermes durable conversation row (SQLite on the host). The phone **pins** `stored_session_id` locally; there is no documented `session.pin` RPC. |
| **App agent** | Product object on the phone: display name + one-line purpose + pinned chat session (+ optional profile name). Home is the agent roster. `session.list` is debug, not the product. |
| **Forever chat** | Canonical Bot Mode relationship: one continuous transcript per agent. In-place compression keeps the same id. `/new` would fork the relationship — **not in v1**. |
| **TUI gateway** | JSON-RPC control channel used by Ink TUI / dashboard chat. Phone pipe = WebSocket **`/api/ws`** on the dashboard port (**9119**), newline-delimited JSON-RPC. |
| **API server (:8642)** | OpenAI-compatible HTTP + SSE surface. **Does not** serve `/api/ws`. Never point TUI methods at 8642. |
| **Hermes Cloud** | Hosted Nous offering (if any). Hermes Bot v1 talks to **your** gateway URL, not a Bot-owned cloud. |
| **Tool Gateway / MCP** | Tools that run **on the Hermes host**. The phone does not speak MCP; it only sees tool events / approval cards from the TUI gateway. |
| **Dashboard session token** | Auth material from signing into the Hermes web dashboard. Used to open `/api/ws` (`?token=` or minted `?ticket=`). |
| **Ticket** | Single-use WebSocket auth query param minted by `POST /api/auth/ws-ticket` on gated hosts. |
| **Cache** | Local SQLite on the phone (`expo-sqlite`). Reconciled from `session.history` on open. Not a sync server; do not assume `message.delta` fans out to other sockets. |

## Port cheat sheet

| Port | Surface | Hermes Bot |
|------|---------|------------|
| **9119** | Dashboard / `hermes serve` — includes `/api/ws` | **Use this** |
| **8642** | API server HTTP/SSE | **Do not use for TUI RPC** |
