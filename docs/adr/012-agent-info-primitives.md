# ADR-012: Agent info is where listable primitives are browsed

- Status: **Proposed**
- Date: 2026-09-02

## Context

Users need a Grok Bot–style read-only view of what an agent can do — especially **Skills** and **MCP** (servers and their tools). Product navigation lives on the agent (roster row → Agent info, and/or chat header), matching “this person.”

On Hermes, v1 app agents are often `session.create` chats on one connected host/profile. Those chats **share** that host’s skills and MCP until an agent is a real `~/.hermes` profile (Desktop Bot Mode). There is no phone-side per-agent isolation to invent.

Official TUI-gateway RPCs (verified in `tui_gateway/methods_tools.py` / `server.py`):

- `skills.manage` — `list` / `inspect` / `browse` / `search` (optional `profile`)
- `tools.list`, `tools.show`, `toolsets.list`
- `mcp.servers.list`, `mcp.catalog` (optional `profile`; management mutators exist but are out of scope)
- `session.info` may include `tools`, `skills`, `profile_name`, and `mcp_servers` (from `get_mcp_status`)

MCP tools register as `mcp_<server>_<tool>`; each server is a runtime toolset `mcp-<name>`. Undocumented or missing methods must degrade honestly in the UI — never invent endpoints. Do not point these methods at `:8642`.

## Decision

1. **Agent info** is the home for listable primitives on an agent: Skills, MCP, and later connected services.
2. v1 data is **host/profile-scoped**. The UI still opens from the agent, but labels shared scope honestly (e.g. “from this host” / profile name). Do not fake per-agent isolation.
3. Browse is **read-only** on the phone: no install/uninstall/enable MCP or skills from this surface in v1.
4. Prefer documented TUI JSON-RPC on `:9119` `/api/ws`. If a method 404s or fails, show an actionable empty/error state and document it.

## Consequences

- Roster and chat can deep-link into Agent info without changing ADR-004’s agent model.
- Connected-services catalog (GitHub CLI, Fly, Supabase as product integrations) is a parallel surface — placeholder or omit until its ADR/PR.
- When Desktop Bot Mode profiles become first-class, the same Agent info routes can switch from host-shared to profile-true data without a new product noun.
