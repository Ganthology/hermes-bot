# Hermes Bot

Grok Bot–style **phone client** for [Nous Hermes Agent](https://github.com/NousResearch/hermes-agent).

Native Expo / React Native UI. Named **Hermes Bot** on purpose (not Hermes Mobile). Home is a roster of named agents; each agent is one forever chat.

This repository is a **client of an existing Hermes host**. It does not provision machines, Fly, Docker, or a backend of its own. It does not wrap Telegram/WhatsApp. It is not a WebView of Hermes Desktop.

When in doubt, the phone talks to **`hermes serve` / dashboard on `:9119` → WebSocket `/api/ws`** (TUI-gateway JSON-RPC). The OpenAI-compatible API server on **`:8642` is HTTP/SSE and does NOT serve `/api/ws`** — never point TUI methods there.

## Get onboarded

Full setup (host + phone + agent checklist): [`docs/onboarding.md`](docs/onboarding.md).

Agents: [`AGENTS.md`](AGENTS.md) → skill [`.cursor/skills/onboard-hermes-bot`](.cursor/skills/onboard-hermes-bot/SKILL.md).

1. `npm install && npx expo start`
2. Point the app at a reachable **`:9119`** dashboard (not `:8642`)
3. Paste a dashboard session token (browser cookie `hermes_session_at` after login)
4. Create an agent, send a message

## UI prototypes

Look-and-feel is iterated in static **HTML + CSS**, not by restyling the Expo screens. Open the playground in a browser, pick a direction, then copy tokens into [`src/theme.ts`](src/theme.ts).

```bash
open prototypes/themes/index.html
```

[`prototypes/themes/index.html`](prototypes/themes/index.html) is a static chat shell. Switch themes (Portal, Psyche, Teal, Mono, Ember), light/dark, and phone vs desktop. The app currently ships **Psyche light**.

## Glossary and ADRs

- Language: [`docs/glossary.md`](docs/glossary.md)
- Decisions: [`docs/adr/README.md`](docs/adr/README.md)

## Prerequisites

- Node 22+ and npm (this repo locks npm via `package-lock.json`)
- A reachable Hermes host running the web dashboard / `hermes serve` (default **port 9119**), bound so the phone can reach it (not loopback-only)
- A dashboard session token / auth token the gateway will accept on the socket

```bash
# On the Hermes machine (example — see upstream docs)
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
# or: hermes serve … (same dashboard surface / :9119)
```

## Run

```bash
npm install
npx expo start
```

Then open in a **development build** / simulator (`i` / `a`). Streaming markdown needs native modules (see below) — Expo Go is not enough for chat rendering once those are installed.

```bash
npm run typecheck
npm run lint
```

### Streaming markdown (assistant)

Assistant bubbles use Software Mansion [`react-native-streamdown`](https://github.com/software-mansion-labs/react-native-streamdown) (`StreamdownText`): incomplete-stream repair via `remend` on a worklet thread, rendered with [`react-native-enriched-markdown`](https://github.com/software-mansion-labs/react-native-enriched-markdown) and its `streamingAnimation`. Live tokens come from TUI `message.delta`; `message.complete` freezes the bubble. User bubbles stay plain text.

**Expo Go vs dev client:** `react-native-enriched-markdown` (and Streamdown’s Bundle Mode worklets setup) require a custom native build. They do **not** run in Expo Go. Use:

```bash
npx expo install expo-dev-client
npx expo prebuild
npx expo run:ios   # or: npx expo run:android
```

Babel enables worklets Bundle Mode with `importForwarding.moduleNames: ['remend']` (worklets **0.10** API; older docs called this `workletizableModules`). Metro watches `node_modules/react-native-worklets/.worklets` via `getBundleModeMetroConfig`.

If Bundle Mode were unavailable, the lightest OSS fallback that still does real streaming markdown on RN would be `EnrichedMarkdownText` + `remend` on the JS thread with `streamingAnimation` — still not Expo Go, and not a timer fake-typewriter.

Turn activity (honest working caption, collapsible reasoning, tool rows) follows gateway events verified against hermes-agent: `thinking.delta`, `reasoning.delta`, `status.update`, `tool.start` / `tool.progress` / `tool.generating` / `tool.complete`. Interactive approval/clarify/sudo/secret cards are unchanged.

### First run

1. Paste the Hermes **base URL** (hint: `http://HOST:9119`).
2. Paste an **auth / dashboard session token**.
3. Tap **Connect**. Credentials are stored in **expo-secure-store** (no Hermes Bot account system).
4. Tap **New agent** → name + one-line “what it is for”.
5. Open the agent and send a message. Assistant markdown streams from `message.delta` when the gateway is up.
6. If the gateway is down or the ticket is bad, you get a human error (including WS close **4401** / **4403**), not a hang.

### Auth notes

- Desktop often mints a **single-use WS ticket** after sign-in (`POST /api/auth/ws-ticket` → `?ticket=`).
- This client tries ticket mint with the pasted token, then falls back to `?token=`.
- It does **not** fake OAuth / PKCE. If gated hosts reject the pasted token, the error shows the close code.

## What v1 does

| Surface | Behavior |
|--------|----------|
| Connect | URL + token → Secure Store |
| Home | Named agent list, empty state, New agent |
| New agent | `session.create` (+ optional `profile` if `profiles.list` returns one), pin `stored_session_id` locally |
| Chat | Composer, message list, SQLite cache, reconcile via `session.history` / resume |
| Streaming | TUI JSON-RPC over `/api/ws`; assistant markdown via StreamdownText |
| Activity | Thinking / reasoning / tool progress when the host emits it; otherwise “Working…” while the turn is in flight |
| Cards | `approval` / `clarify` / `sudo` / `secret` request → respond methods |

RPC used: `session.create`, `session.list` (debug only), `session.resume`, `session.history`, `prompt.submit`, `approval.respond`, `clarify.respond`, `sudo.respond`, `secret.respond`.

Stream events: `message.start`, `message.delta`, `message.complete`, `thinking.delta`, `reasoning.delta`, `status.update`, `tool.*`, `approval.request`, `clarify.request`, `sudo.request`, `secret.request`.

There is **no `/new` in the bot chat** — forking the relationship is out of scope for v1. Compression is assumed **in-place** (same session id).

## Explicit non-goals (v1)

- Hosting / provisioning / custom backend / Fastlane / EAS secrets
- Desktop-in-WebView shells
- Power-user cockpits (logs, env keys, MCP browser, cron, session archives) — MCP is tools **on Hermes**, not the phone protocol
- `browser_exec` session isolation (different namespace; skipped in this scaffold)
- Second conversation database — Hermes SQLite is source of truth; the phone is cache + stream

## Protocol landmines

Documented against public Hermes Agent materials (≈ 2026-08-29):

- Default dashboard bind is loopback; the phone needs a reachable host + auth.
- WS close **4401** = bad ticket; **4403** = Host/peer mismatch.
- Ordinary `prompt.submit` must **never** send rewind/`truncate_*` / `confirm_truncate` params.
- Field names for some respond payloads are poorly documented — we feature-detect and keep payloads flexible.
- Do not invent a fourth protocol.

## License

MIT — see [`LICENSE`](LICENSE).
