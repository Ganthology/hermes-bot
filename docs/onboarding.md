# Onboard — Hermes Bot

For humans and agents. Product map: [README](../README.md). Decisions: [ADRs](adr/README.md). Language: [glossary](glossary.md). Agent index: [AGENTS.md](../AGENTS.md).

## What you are running

Expo (SDK 57) phone client. It does **not** start Hermes. You point it at an existing host.

Pipe: `hermes serve` / `hermes dashboard` **`:9119`** → WebSocket **`/api/ws`**. Not `:8642`.

## Machine setup

- Node 22+ and npm (`package-lock.json` is the lock)
- Xcode (iOS device/sim) or Android toolchain if you leave Expo Go
- A Hermes host with a **dashboard** that serves `/api/ws` (not a gateway-only / WhatsApp-only install)

```bash
npm install
npm run typecheck
npm run lint
npx expo start
```

Expo Go or press `i` / `a`. Physical device + custom native modules (`whisper.rn` on-device dictation, etc.): `npx expo install expo-dev-client` then `npx expo prebuild` and `npx expo run:ios --device` (or Android). Prebuild generates `/ios` and `/android` — those folders stay gitignored. On-device Whisper models download into app storage after install — see README Dictation.

## Host setup (not in this repo)

On the Hermes machine, dashboard must listen where the phone can reach it (not loopback-only):

```bash
hermes dashboard --host 0.0.0.0 --port 9119 --no-open
# or: hermes serve …  (same :9119 surface)
```

Non-loopback bind requires dashboard auth (password or OAuth). Phone does not do OAuth. After you log in in a browser at the **same URL** you will paste:

1. Copy cookie `hermes_session_at`
2. In the app: base URL `http://HOST:9119` or `https://your-host` (no `:9119` if TLS is on 443)
3. Token = that cookie

Close **4401** = bad token/ticket. **4403** = Host/peer mismatch (URL host must match how the dashboard is reached).

**Fly / old images:** official Fly Hermes often publishes no `:9119`. Hermes **v1.0.0** (gateway + WhatsApp only) has **no** `hermes dashboard` and cannot serve this app until upgraded.

## First run in the app

1. Paste base URL + token → Connect (Secure Store)
2. New agent → name + one-line purpose
3. Open chat, send a message — tokens stream if the host is up

## Agent checklist

- [ ] Read [adr/README.md](adr/README.md) before changing protocol or product shape
- [ ] Follow [.cursor/rules/commit-scope.mdc](../.cursor/rules/commit-scope.mdc) when committing
- [ ] Prefer `npx expo install` for native modules (SDK 57)
