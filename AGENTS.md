<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## UI Size System

Before changing typography, spacing, layout widths, mobile sidebar/header behavior, or shadcn component sizes, read `docs/ui-system.md`. Keep Tailwind v4 UI tokens in `src/app/globals.css`, generic control sizing in `src/components/ui/*`, and product-specific sizing in feature components. Do not add a traditional `tailwind.config.ts` just for size tokens.

## Feature Documentation System

Feature work should use a discoverable documentation bundle under `Docs/features/<feature-id>/`.

Recommended structure:

- `README.md`: feature entry point and recovery instructions.
- `REQUIREMENTS.md`: product goals, roles, use cases, business rules, and acceptance criteria.
- `DESIGN.md`: technical design, data model, API contracts, implementation phases, tests, and release strategy.
- `PROGRESS.md`: current implementation phase, last confirmed commit, completed work, known mismatches, verification status, and next entry point.
- `DECISIONS.md`: durable product or technical decisions that should not be rediscovered from chat history.
- `TASKS.md`: detailed implementation checklist when a phase needs finer breakdown.

For small features, `README.md`, `REQUIREMENTS.md`, `DESIGN.md`, and `PROGRESS.md` are enough. Add `DECISIONS.md` and `TASKS.md` when the feature grows.

When the user says "继续 <feature-id> 的开发" or "continue <feature-id>", first open `Docs/features/<feature-id>/README.md` and follow its recovery order. If the bundle does not exist yet, look for legacy docs matching the feature name under `Docs/`, then propose or perform a migration into the feature bundle before continuing substantial implementation.

Use `PROGRESS.md` as the implementation state source, `DESIGN.md` as the technical plan, and `REQUIREMENTS.md` as the product source of truth. Do not start by scanning the whole codebase. Recover state from feature docs, recent commits, and `git status` first; inspect code only when needed to resolve inconsistencies or implement the next task.

Before continuing feature implementation, apply a docs consistency gate:

- Check `git status`.
- Check commits after the `Last confirmed commit` recorded in `PROGRESS.md`.
- Detect whether `REQUIREMENTS.md`, `DESIGN.md`, `DECISIONS.md`, `TASKS.md`, or legacy feature docs changed after the last confirmed progress point.
- Treat changes to requirements, data model, API contracts, permissions, phase order, acceptance criteria, release strategy, or next task as flow-impacting.
- If flow-impacting docs changed and `PROGRESS.md` does not reflect them, pause implementation and ask to refresh the feature docs first.

Before a phase or subphase commit, update `PROGRESS.md` when the commit changes implementation status, next steps, known mismatches, or verification results. Do not update feature docs for unrelated changes. Update `DESIGN.md` only when the design changes, and update `REQUIREMENTS.md` only when product requirements change.

Commit messages for feature work should include the feature id and current phase when applicable, for example `multi-user phase 4: isolate document owner APIs`.
