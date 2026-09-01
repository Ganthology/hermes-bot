# ADR-003: TUI gateway WebSocket is the phone pipe

- Status: **Proposed**
- Date: 2026-09-01

## Context

Hermes exposes ACP, TUI-gateway JSON-RPC, and an OpenAI-compatible API server. Desktop Bot Mode and the dashboard chat path use the TUI gateway.

## Decision

Hermes Bot speaks **TUI-gateway JSON-RPC over WebSocket `/api/ws`** on the dashboard / `hermes serve` port (**9119**). It does not use `:8642` for these methods.

## Consequences

Streaming, approvals, clarify/sudo/secret, and session lifecycle match Desktop’s control channel. API-server-only deployments are out of scope for v1 chat.
