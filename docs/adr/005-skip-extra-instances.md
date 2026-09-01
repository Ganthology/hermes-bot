# ADR-005: Skip extra instances in v1

- Status: **Proposed**
- Date: 2026-09-01

## Context

Power users may run multiple Hermes hosts. Multi-instance switchers add cockpit complexity.

## Decision

v1 stores **one** base URL + token. Switching hosts means disconnect and reconnect.

## Consequences

Simpler secure storage and connection state. Multi-instance can revisit later without changing the agent model.
