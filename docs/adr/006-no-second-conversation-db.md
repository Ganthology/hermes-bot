# ADR-006: No second conversation database

- Status: **Proposed**
- Date: 2026-09-01

## Context

Hermes already persists transcripts in host SQLite. A phone-authoritative sync server would diverge and invent protocol.

## Decision

Hermes host SQLite is the **source of truth**. The phone keeps a **local cache** (expo-sqlite) and live stream. On open, reconcile from `session.history` / resume. Do not assume `message.delta` fans out to other sockets.

## Consequences

Offline reading of cache is best-effort. Conflict policy is “host wins on reconcile”.
