<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## UI Size System

Before changing typography, spacing, layout widths, mobile sidebar/header behavior, or shadcn component sizes, read `docs/ui-system.md`. Keep Tailwind v4 UI tokens in `src/app/globals.css`, generic control sizing in `src/components/ui/*`, and product-specific sizing in feature components. Do not add a traditional `tailwind.config.ts` just for size tokens.
