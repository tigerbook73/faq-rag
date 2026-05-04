# UI Size System

FAQ-RAG uses Tailwind CSS v4, shadcn `base-nova`, and CSS-first tokens in `src/app/globals.css`. Keep the UI compact, stable, and workspace-oriented.

## Source Of Truth

- App-level typography, page spacing, layout width, and chat composer dimensions live in `src/app/globals.css` under `@theme inline`.
- Generic control sizing lives in `src/components/ui/*`, especially shadcn `cva` variants.
- Product-specific controls, such as chat composer buttons or citation buttons, should live in feature components instead of page-level repeated `className` overrides.

Do not add a traditional `tailwind.config.ts` just to manage UI sizes. This project uses Tailwind v4 CSS-first configuration.

## Typography

Use app typography tokens for page-level text:

- `text-app-title`: page titles and major form titles.
- `text-app-section`: section headings.
- `text-app-body`: app body text when an explicit token is useful.
- `text-app-muted`: secondary help text.
- `text-app-caption`: metadata, status, badges.

shadcn component internals may continue to use `text-sm` and `text-xs` where that matches the component density.

Use `clamp()` only for page-level type or spacing. Do not use fluid sizing for table density, chat message text, buttons, inputs, sidebar items, or other high-frequency controls.

## Spacing

Use Tailwind's default 4px spacing scale for normal layout:

- `gap-1`: icon-to-text or very compact inline groups.
- `gap-2`: toolbars and button groups.
- `space-y-2`: label plus field, heading plus description.
- `space-y-4`: forms and dialog content.
- `space-y-6`: readable page sections.
- `space-y-8`: workspace sections such as Knowledge upload plus table.

Avoid arbitrary values in feature code, such as `text-[17px]`, `mt-[13px]`, or `gap-[11px]`, unless the value is tied to viewport math, third-party positioning, or a documented component constraint.

## Layout Widths

Use app container tokens:

- `max-w-(--container-app-chat)` for chat content and composer.
- `max-w-(--container-app-readable)` for About/docs-like pages.
- `max-w-(--container-app-workspace)` for Knowledge/workspace pages.
- `max-w-(--container-app-form)` for auth forms.

Use `PageShell` for standard page padding instead of repeating page-level `px`/`py` values.

## Mobile Rules

- Keep `Input` and `Textarea` at `text-base md:text-sm`; this avoids iOS Safari focus zoom while preserving desktop density.
- Keep important mobile tap targets around 40px where practical. Compact utility buttons can be 32-36px if they are not primary actions.
- Use `h-dvh`, `min-h-0`, and `flex-1` for app-height layouts. Avoid `100vh` for mobile app shells.
- Mobile tables should scroll horizontally or become stacked rows; do not shrink text below readable sizes to fit all columns.
- Mobile sidebar should expose both the top-bar trigger and the in-sidebar trigger. The sheet close `X` remains available.

## shadcn Updates

shadcn components are local source files and may be overwritten by future `shadcn add` or update commands.

After updating a shadcn component, review the diff for the affected file:

```bash
git diff -- src/components/ui/button.tsx
```

Keep generic sizing changes small and local to `components/ui/*`. If a size is product-specific, move it into the feature component instead of changing the global shadcn default.
