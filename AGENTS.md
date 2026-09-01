# Hermes Bot — agent map

Expo SDK 57 TypeScript phone client for an existing Nous Hermes Agent host.

## Get onboarded

Read [docs/onboarding.md](docs/onboarding.md). Skill: [.cursor/skills/onboard-hermes-bot/SKILL.md](.cursor/skills/onboard-hermes-bot/SKILL.md).

## Where things live

| Need | Go here |
|------|---------|
| Setup / try the app | [docs/onboarding.md](docs/onboarding.md), [README.md](README.md) |
| Product language | [docs/glossary.md](docs/glossary.md) |
| Architecture decisions (ADRs) | [docs/adr/README.md](docs/adr/README.md) |
| Commit shape | [.cursor/rules/commit-scope.mdc](.cursor/rules/commit-scope.mdc) |
| Native modules | [Expo SDK 57 docs](https://docs.expo.dev/versions/v57.0.0/) — prefer `npx expo install` |

## Hard constraints

- Client only. No host provisioning.
- TUI pipe is `:9119` `/api/ws`. Never `:8642` for those RPCs.
- Name is Hermes Bot, not Hermes Mobile.
- ADRs and onboarding docs are their own commits (see commit-scope rule).
