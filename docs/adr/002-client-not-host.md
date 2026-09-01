# ADR-002: Client not host (v1)

- Status: **Proposed**
- Date: 2026-09-01

## Context

Hermes can run on a laptop, VPS, or hosted surface. Building installers, Fly apps, or Docker from the phone duplicates Nous tooling and expands scope.

## Decision

v1 is a **client of one existing gateway URL**. No machine provisioning, no Bot-owned backend, no Fastlane/EAS secret automation in-repo.

## Consequences

Onboarding is “paste URL + token”. Reachability and auth are the user’s host problem; the app surfaces clear connection errors.
