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

**Expo Go vs dev client:** `react-native-enriched-markdown` (and Streamdown’s Bundle Mode worklets setup) require a custom native build. They do **not** run in Expo Go. Camera / photo-library / document attach (`expo-image-picker`, `expo-document-picker`) also need that **dev client** (permission strings + native modules) — same prebuild path:

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
4. On **Hermes Bot** home, open an agent from the host roster — or tap **New agent**.
5. Open the agent and send a message. Assistant markdown streams from `message.delta` when the gateway is up.
6. Attach from chat: tap **+** next to the composer → **Camera**, **Photo library**, or **File**. Stage chips appear above the field (tap **×** to remove). Caption is optional — you can send attachments alone. The phone always uploads bytes over `:9119` (`image.attach_bytes` / `pdf.attach` / `file.attach`); it never sends a phone filesystem path to the gateway.
7. Tap **Info** on a roster row (or **Info** in the chat header) → Agent info → **Skills** / **MCP** to browse what this host exposes (read-only; shared across agents on the connection).
8. If the gateway is down or the ticket is bad, you get a human error (including WS close **4401** / **4403**), not a hang.

### Add or edit an agent

Agents on the phone are the same teammates as on the Hermes host (Bot Mode). The UI never asks you to edit files or paste config.

1. **New agent** — Name + What they do. Choose **Start blank** or **Copy from an existing agent**, then Continue. You land in **chat**. Edit **Who they are** later from the roster or the chat header.
2. **Edit** — From the roster row, or **Edit** in the chat header. Fields: Name, Role, What they do, Who they are. **Save** / **Discard**. Remove is confirm-only and blocked for the default agent.
3. If the host cannot list or edit agents, you see a short message with a next step — not a stack trace. Chat still uses the dashboard WebSocket; agent details use the host’s documented dashboard APIs (or the matching TUI methods when REST is unavailable).

Skills, connected services, models, and keys are separate screens — not part of this editor.

### Auth notes

- Desktop often mints a **single-use WS ticket** after sign-in (`POST /api/auth/ws-ticket` → `?ticket=`).
- This client tries ticket mint with the pasted token, then falls back to `?token=`.
- It does **not** fake OAuth / PKCE. If gated hosts reject the pasted token, the error shows the close code.

## What v1 does

| Surface | Behavior |
|--------|----------|
| Connect | URL + token → Secure Store |
| Home | Host agent roster (Name + short purpose), empty/error states, New agent |
| New agent | Name + What they do → create on host (blank or copy) → chat |
| Edit agent | Name, Role, What they do, Who they are → Save / Discard; Remove behind confirm |
| Agent info | Read-only Skills + MCP browse (host/profile-scoped); open via **Info** on a roster row or chat header |
| Chat | Composer (+ attach), message list, SQLite cache, reconcile via `session.history` / resume |
| Streaming | TUI JSON-RPC over `/api/ws`; assistant markdown via StreamdownText |
| Attachments | Camera / photo library / files → remote byte upload (`image.attach_bytes` / `pdf.attach` / `file.attach`) then `prompt.submit` |
| Activity | Thinking / reasoning / tool progress when the host emits it; otherwise “Working…” while the turn is in flight |
| Cards | `approval` / `clarify` / `sudo` / `secret` request → respond methods |

Agent metadata: dashboard `GET/POST/PATCH/PUT/DELETE /api/profiles…` (same connect host), with TUI `profiles.list` / `profiles.create` / `profiles.describe` / `profiles.configure` as fallback. Chat RPC: `session.create`, `session.resume`, `session.history`, `prompt.submit`, `image.attach_bytes`, `pdf.attach`, `file.attach`, respond methods. Agent info (read-only): `skills.manage` (list/inspect), `tools.show`, `mcp.servers.list`.

Stream events: `message.start`, `message.delta`, `message.complete`, `thinking.delta`, `reasoning.delta`, `status.update`, `tool.*`, `approval.request`, `clarify.request`, `sudo.request`, `secret.request`.

Inbound agent images: when history text includes `MEDIA:` / image paths, the phone fetches **`GET /api/media?path=`** on the same `:9119` host (dashboard token). If that endpoint is missing or refuses, the bubble skips the image (no Hermes Bot media proxy).

There is **no `/new` in the bot chat** — forking the relationship is out of scope for v1. Compression is assumed **in-place** (same session id).

## Explicit non-goals (v1)

- Hosting / provisioning / custom backend / Fastlane / EAS secrets
- Desktop-in-WebView shells
- Power-user cockpits (logs, env keys, cron, session archives) — MCP install/enable from the phone is out of scope; Agent info is **browse-only**
- Connected-services catalog (GitHub CLI, Fly, Supabase as product integrations) — parallel surface, not this PR
- `browser_exec` session isolation (different namespace; skipped in this scaffold)
- Second conversation database — Hermes SQLite is source of truth; the phone is cache + stream

## Protocol landmines

Documented against public Hermes Agent materials (≈ 2026-08-29):

- Default dashboard bind is loopback; the phone needs a reachable host + auth.
- WS close **4401** = bad ticket; **4403** = Host/peer mismatch.
- Ordinary `prompt.submit` must **never** send rewind/`truncate_*` / `confirm_truncate` params.
- Field names for some respond payloads are poorly documented — we feature-detect and keep payloads flexible.
- Attachments: never call `image.attach` with a phone path; always `image.attach_bytes` / `pdf.attach` / `file.attach` (remote byte path). Include `file.attach`’s `ref_text` in the submitted prompt.
- Do not invent a fourth protocol.

## License

MIT — see [`LICENSE`](LICENSE).
