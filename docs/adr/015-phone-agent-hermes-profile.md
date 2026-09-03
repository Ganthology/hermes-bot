# ADR-015: Phone agent = Hermes profile

- Status: **Proposed**
- Date: 2026-09-03

## Context

ADR-004 treated an app agent as a local roster row (name, purpose, optional profile, pinned session). ADR-008’s thin “New agent” created a chat via `session.create` and kept purpose mostly on-device.

Bot Mode on Hermes stores real teammates under host profiles (`~/.hermes/profiles` on disk). Desktop edits them through dashboard REST (`/api/profiles`, soul, description). The phone needs the same identity — open an agent, see who they are, edit that — without exposing profile machinery in the UI.

Chat still streams over the TUI gateway WebSocket on **`:9119` `/api/ws`**. Profile metadata is not the API-server chat port (`:8642`).

## Decision

1. **User-facing “agent” = one Hermes profile** on the connected host. The roster prefers `GET /api/profiles` (same base URL as connect). When that REST surface is missing, use the documented TUI twins (`profiles.list`, `profiles.create`, `profiles.describe`, `profiles.configure`) on `/api/ws`. Do not invent endpoints. Do not point profile or TUI traffic at `:8642`.

2. **Copy hides host jargon.** Default UI says Agents, Name, Role, What they do, Who they are. Never show SOUL.md, profile.yaml, `~/.hermes`, HERMES_HOME, slug, YAML, “profile”, “RPC”, or port numbers unless the user opens Advanced (host id only).

3. **Field mapping (no second store):**
   - **Name** — appearance (`display_name`, else `ui_meta.title`, else a humanized host id).
   - **Role** — one-line title (`ui_meta.title`, else `display_name` when that is all the host has).
   - **What they do** — host `description`.
   - **Who they are** — soul document content (file on disk; UI never names the file).

4. **Writes** use documented dashboard REST (`POST/PATCH/PUT/DELETE /api/profiles…`) and/or TUI configure/create. If the host cannot write, the editor still ships and Save fails with a clear message — never fake success.

5. **Chat remains TUI WS.** Opening an agent resumes or creates a pinned `stored_session_id` for that profile (ADR-004 pin). Skills/MCP/model/keys stay other screens.

## Consequences

- ADR-008’s local-only purpose text is superseded for host-backed agents; description and soul live on the host.
- ADR-004’s local roster becomes a pin/cache keyed by host agent id, not the product source of truth when profiles load.
- Older hosts without profile REST or TUI profile methods show a human empty/error state instead of a session-nickname roster pretending to be Bot Mode.
