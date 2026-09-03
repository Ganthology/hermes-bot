# ADR-013: Connected services is a separate host-scoped catalog

- Status: **Proposed**
- Date: 2026-09-02

## Context

Hermes can reach product services in different ways: bundled `github/*` skills driving the `gh` CLI (GitHub is deliberately **not** the primary MCP catalog path), curated or custom MCP servers (`mcp-<server>` toolsets), and host CLIs. Skills and MCP tools are primitives. Phone users need a product-level answer: “what is this host already hooked up for?” — GitHub, Fly.io, Supabase, Linear, etc. — without a raw tool dump and without implying per-agent isolation that v1 does not have.

A parallel surface may browse skills and MCP primitives. That is a different job.

## Decision

1. **Connected services** is its own screen (Agent services / Connected), not nested under a skills/MCP browser in v1.
2. Rows describe **product services**, how they are wired (**skill** / **MCP** / **CLI**), and status **connected** / **not connected** / **unknown** from live host evidence only. Never invent RPCs or display secrets/tokens.
3. **GitHub-via-gh** is first-class: infer from `skills.manage` `action=list` (`github-auth`, `github/*` skills). Do not treat absence from the MCP catalog as “GitHub unavailable.”
4. Other well-known products are inferred from configured MCP servers / `mcp-*` toolsets (`mcp.servers.list`, `mcp.catalog`, `toolsets.list` / `tools.list`) when present on the host.
5. **v1 scope is host/profile**, not per-agent. Label the UI accordingly; do not fake agent-isolated integrations.
6. Read-only on the phone — no OAuth/connect flow in this ADR’s surface.

## Consequences

Reviewers should reject folding this catalog into a primitive tool browser. Auth that cannot be verified without undocumented probing stays **unknown**. Empty state points users at the Hermes machine, not in-app setup.
