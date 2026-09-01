# ADR-007: Native UI, not Desktop-in-WebView

- Status: **Proposed**
- Date: 2026-09-01

## Context

Some mobile experiments embed Hermes Desktop or a PTY/xterm WebView. That fights phone UX and copies a shell we do not control.

## Decision

Hermes Bot is **native React Native UI only** — roster, chat, composer, interactive cards. No WebView-of-Desktop.

## Consequences

We reimplement a thin slice of gateway UX. We deliberately skip Desktop chrome and community “cockpit” remotes.
