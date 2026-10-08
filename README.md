# Yello Pro

Independent SaaS fork of the MG Pro administration, with a white/yellow glass interface and an interactive fictitious-data demo.

- Repository: https://github.com/tokkimi/yello-pro.com
- Vercel project: yello-pro (independent of MG Pro)
- Public URL: https://yello-pro.vercel.app
- Branch: codex/yello-pro

## Development
`npm ci`, `npm test`, `npm run build`, `npm run dev`.

## Current status
Landing, demo, grouped tools menu, progressive plan presentation and task board/list/deadline views are implemented. Task details support checklists, labels and dependencies with cycle validation. The original operational tools are retained.

Commercial registration and payment are disabled until an independent Supabase database and Stripe lifecycle webhook are configured and verified. The Stripe checkout and portal endpoint alone do not constitute a complete subscription implementation. Do not enable sales until the lifecycle handler and sandbox tests are complete. Existing tests do not prove end-to-end SaaS readiness.

Read docs/YELLO_ARCHITECTURE_AND_COVERAGE.md for the comparison and remaining work. Do not claim full Trello or Notion parity. Do not import MG Pro data, environment values or deployment configuration.
