<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## UI Size System

Before changing typography, spacing, layout widths, mobile sidebar/header behavior, or shadcn component sizes, read `docs/ui-system.md`. Keep Tailwind v4 UI tokens in `src/app/globals.css`, generic control sizing in `src/components/ui/*`, and product-specific sizing in feature components. Do not add a traditional `tailwind.config.ts` just for size tokens.

## Feature Documentation System

Feature work should use a discoverable lightweight documentation bundle under `docs/features/<feature-id>/`.

Required structure:

- `REQUIREMENTS.md`: product goals, roles, use cases, business rules, and acceptance criteria.
- `DESIGN.md`: technical design, data model, API contracts, implementation phases, tests, and release strategy.
- `PROGRESS.md`: current implementation phase, last confirmed commit, completed work, known mismatches, verification status, and next entry point.

When the user says "继续 <feature-id> 的开发" or "continue <feature-id>", first open `Docs/features/<feature-id>/PROGRESS.md`, then `DESIGN.md`, then `REQUIREMENTS.md`. If any of the three required files is missing, stop and report the missing file instead of continuing implementation.

Use `PROGRESS.md` as the implementation state source, `DESIGN.md` as the technical plan, and `REQUIREMENTS.md` as the product source of truth. Do not start by scanning the whole codebase. Recover state from feature docs, recent commits, and `git status` first; inspect code only when needed to resolve inconsistencies or implement the next task.

Before continuing feature implementation, apply a docs consistency gate:

- Check `git status`.
- Check commits after the `Last confirmed commit` recorded in `PROGRESS.md`.
- Detect whether `REQUIREMENTS.md`, `DESIGN.md`, or `PROGRESS.md` changed after the last confirmed progress point.
- Treat changes to requirements, data model, API contracts, permissions, phase order, acceptance criteria, release strategy, or next task as flow-impacting.
- If docs are inconsistent in a simple mechanical way, refresh the affected feature docs before implementation.
- If docs are inconsistent in a way that changes requirements, design, scope, phase order, data compatibility, or implementation tradeoffs, stop and explain the inconsistency so the user can decide.

Before a phase or subphase commit, update `PROGRESS.md` when the commit changes implementation status, next steps, known mismatches, or verification results. Do not update feature docs for unrelated changes. Update `DESIGN.md` only when the design changes, and update `REQUIREMENTS.md` only when product requirements change.

Commit messages for feature work should include the feature id and current phase when applicable, for example `multi-user phase 4: isolate document owner APIs`.
