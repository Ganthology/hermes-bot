# ADR-008: Conversational new agent (thin v1)

- Status: **Proposed**
- Date: 2026-09-01

## Context

The UX goal is conversational “create a teammate”. Hermes profiles can be rich YAML; that must not appear on the phone.

## Decision

v1 **New agent** is name + one-line purpose → `session.create` (optional profile if listed) → pin session id locally. Not YAML. Full conversational onboarding can deepen later without changing ADR-004.

## Consequences

Description may live primarily on-device in v1. Title is sent to the host via `session.create`.
