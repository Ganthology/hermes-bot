# ADR-014: Chat attachments (remote byte-upload)

- Status: **Proposed**
- Date: 2026-09-03

## Context

Users need to send photos and files from the phone composer. Hermes Bot is always a **remote** client of the TUI gateway (`:9119` `/api/ws`): the phone filesystem is not visible to the Hermes host. Desktop’s local-path RPCs (`image.attach` with a host path) only work when client and gateway share a disk.

Verified against `NousResearch/hermes-agent` `tui_gateway/methods_prompt.py` and Desktop `use-prompt-actions`:

| Kind | Remote RPC | Notes |
|------|------------|--------|
| Images | `image.attach_bytes` | Canonical params: `session_id`, `content_base64`, `filename`. Aliases `data` / `ext`. ~25 MB cap; magic-byte sniffing. |
| PDFs | `pdf.attach` | Vision-tile path: renders pages via `pdftoppm`, queues PNGs. Remote: `content_base64` (+ `filename`). |
| Other files | `file.attach` | Remote: `session_id`, `name`, `data_url` (base64 data URL). Response `ref_text` (`@file:…`) must be included in the submitted prompt text. |

Then `prompt.submit` as today. Attach all staged items first; if one fails, do not submit a half-prompt.

Inbound agent images: Desktop remote display uses **`GET /api/media?path=`** on the same dashboard host (`hermes_cli/web_server.py`). That endpoint is on **`:9119`**, not a Hermes Bot backend. If a host lacks it, skip inbound render — do not invent a phone-side proxy.

## Decision

1. Composer supports Camera / Photo library / File staging with optional caption; send allowed with attachments only.
2. Phone **always** uses the remote byte-upload path (`image.attach_bytes` / `pdf.attach` / `file.attach`). Never `image.attach` with a phone filesystem path.
3. No Hermes Bot media backend. Inbound display (when paths appear in history) fetches `GET /api/media` on the connected `:9119` host with the same dashboard token.
4. Still only `:9119` `/api/ws` for TUI RPCs. Never `:8642`.

## Consequences

Expo modules (`expo-image-picker`, `expo-document-picker`, `expo-file-system`) and OS permission strings are required. Custom native build / prebuild may be needed alongside existing Streamdown native deps. Hosts without `pdftoppm` will refuse `pdf.attach`; surface the error instead of sending.
