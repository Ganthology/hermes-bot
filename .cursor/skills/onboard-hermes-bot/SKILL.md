---
name: onboard-hermes-bot
description: >-
  Onboard to the Hermes Bot Expo phone client — setup, run, connect to a
  hermes serve / dashboard :9119 host, and find ADRs. Use when a human or
  agent is new to this repo, asks how to run it, get onboarded, try the app,
  or where decisions live.
---

# Onboard Hermes Bot

Read these in order. Do not invent a host, protocol, or product name.

1. [docs/onboarding.md](../../../docs/onboarding.md) — install, run, first connect
2. [README.md](../../../README.md) — what v1 does and does not do
3. [docs/glossary.md](../../../docs/glossary.md) — product language
4. [docs/adr/README.md](../../../docs/adr/README.md) — decisions (start here, then numbered ADRs)
5. [AGENTS.md](../../../AGENTS.md) — map for later work

## Rules

- Phone client only. No Fly/Docker/host provisioning in this repo.
- Talk to **`:9119` `/api/ws`**. Never `:8642` for TUI RPC.
- Name is **Hermes Bot**, not Hermes Mobile.
- Host must be a dashboard-capable Hermes (modern `hermes dashboard` / `hermes serve`). Old gateway-only Fly images have no `/api/ws`.

## After reading

`npm install && npm run typecheck && npm run lint`. Then `npx expo start` (or a installed dev client). Connect with a reachable base URL + dashboard session token.
