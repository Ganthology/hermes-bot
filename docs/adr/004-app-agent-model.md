# ADR-004: App agent = profile (optional) + pinned session

- Status: **Proposed**
- Date: 2026-09-01

## Context

Hermes separates profiles (config homes) from durable chat sessions. Grok Bot UX is “named people”, not a session browser.

## Decision

An **app agent** is a local roster entry: name, one-line purpose, optional profile name, and a **pinned** `stored_session_id`. Home is the agent list. `session.list` is for debug/reconcile, not the product surface.

## Consequences

The phone holds the pin (no documented `session.pin` RPC). Users never browse raw Hermes session archives in v1.
