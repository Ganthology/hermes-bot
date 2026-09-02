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

## Dictation (stacked)

Voice-to-text on the chat composer — **not** voice-to-voice, and **not** a Hermes Bot backend.

| PR | Ships |
|----|--------|
| **1** | Mic UI (tap record → stop → transcribe → **send**), level meter, cancel, `DictationProvider` interface, unavailable / demo stub |
| **2 (this)** | Cloud STT HTTP client (Groq Whisper / OpenAI whisper & gpt-4o-*-transcribe) |
| **3** | On-device Whisper download + inference |

Flow: tap **Mic** → speak → **Stop** → provider transcribes → text **sends immediately** on the same path as Send (never parks in the composer). **Cancel** discards audio.

### Cloud STT (PR 2)

The phone calls the provider directly (`POST …/audio/transcriptions`). Keys stay in **expo-secure-store** — Hermes Bot does not proxy or host STT.

1. Open **Settings → Dictation** → select **Cloud API**
2. Pick **Groq Whisper** or **OpenAI**
3. Paste an API key → optionally override model / base URL → **Save cloud dictation**

| Engine | Default model | Default base URL |
|--------|---------------|------------------|
| Groq | `whisper-large-v3-turbo` | `https://api.groq.com/openai/v1` |
| OpenAI | `gpt-4o-mini-transcribe` | `https://api.openai.com/v1` |

Suggested OpenAI models you can tap or type: `gpt-4o-mini-transcribe`, `gpt-4o-transcribe`, `whisper-1`. Groq: `whisper-large-v3-turbo`, `whisper-large-v3`. Base URL is optional for OpenAI-compatible STT hosts.

**Keys:** create a Groq key at [console.groq.com](https://console.groq.com) or an OpenAI key at [platform.openai.com](https://platform.openai.com). Never commit keys. Clear via **Clear cloud key** in Settings.

Without a saved cloud engine, `__DEV__` still uses the **demo stub** (`EXPO_PUBLIC_DICTATION_STUB=0` → friendly “none yet”). On-device Whisper stays greyed (PR 3).

**Hermes host STT:** the TUI gateway methods this client uses have **no documented speech-to-text RPC**, so “use host STT” is not invented here — the Settings row stays a follow-up.

**Permissions:** `expo-audio` config plugin writes iOS `NSMicrophoneUsageDescription` and Android `RECORD_AUDIO`. Recording works in **Expo Go** for cloud STT (plain HTTPS). A later on-device Whisper native module will need a **dev client** / `npx expo prebuild` + `npx expo run:ios` / `run:android` — remind yourself to prebuild when that lands.

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

Then open in Expo Go / simulator (`i` / `a`), or scan the QR code.

```bash
npm run typecheck
npm run lint
```

### First run

1. Paste the Hermes **base URL** (hint: `http://HOST:9119`).
2. Paste an **auth / dashboard session token**.
3. Tap **Connect**. Credentials are stored in **expo-secure-store** (no Hermes Bot account system).
4. Tap **New agent** → name + one-line “what it is for”.
5. Open the agent and send a message. Assistant text streams from `message.delta` when the gateway is up.
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
| Dictation | Tap Mic → record → Stop → cloud (or stub) transcribe → send as a normal prompt; Settings holds the API key |
| Streaming | TUI JSON-RPC over `/api/ws` |
| Cards | `approval` / `clarify` / `sudo` / `secret` request → respond methods |

RPC used: `session.create`, `session.list` (debug only), `session.resume`, `session.history`, `prompt.submit`, `approval.respond`, `clarify.respond`, `sudo.respond`, `secret.respond`.

Stream events: `message.delta`, `message.complete`, `tool.*`, `approval.request`, `clarify.request`, `sudo.request`, `secret.request`.

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
