# Mobile Color Token System

`apps/mobile` uses NativeWind v4 with a `tailwind.config.js`-based theme (not Tailwind v4 CSS-first like `apps/web` — see `apps/mobile/AGENTS.md`). Colors are centralized in a hand-written JS source of truth. Mode-dependent tokens resolve automatically through a CSS custom property (no paired `dark:` class needed at call sites), similar in spirit to `apps/web`'s `@theme inline` + `.dark` class approach, but implemented with NativeWind's `vars()` instead of a real CSS cascade.

## Source Of Truth

- `src/lib/theme/colors.js` is the only place color values are written. It exports `{ light, dark }`, two flat objects keyed by semantic role.
- `src/lib/theme/vars.ts` converts the mode-dependent subset of `colors.js` into CSS custom properties (`vars({ "--color-background": "3 7 18", ... })`) for both modes.
- `GluestackUIProvider` applies `style={themeVars[mode]}` on the app's root `View`, so every descendant inherits the current mode's variable values.
- `tailwind.config.js` requires `colors.js` and defines each mode-dependent token as `rgb(var(--color-x) / <alpha-value>)` — so `bg-background` alone resolves to the right value; no `dark:bg-background-dark` needed. Tokens with an identical value in both modes (`primary`, `primaryPressed`, `onPrimary`) stay plain colors, no CSS var involved.
- `src/hooks/useThemeColors.ts` wraps NativeWind's `useColorScheme()` and returns the resolved `light` or `dark` object for anything that isn't a `className` (icon props, `StyleSheet`, native APIs).
- New colors go into `colors.js` first. Never add a hex literal directly in a component.

### Modals: re-apply the vars

React Native's `<Modal>` renders its content through a portal — on the web build (react-native-web), that portal lands in a separate DOM subtree that does **not** inherit the CSS custom properties set by `GluestackUIProvider`, so `bg-card`/`text-foreground`/etc. silently resolve to nothing inside a `<Modal>`. Any component whose top-level element sits directly inside a `<Modal>` must re-apply the variables on that element:

```tsx
const vars = useThemeVars(); // src/hooks/useThemeVars.ts
<Modal ...>
  <Pressable style={vars} className="flex-1 justify-end bg-black/40" onPress={onClose}>
```

`ProviderSheet`, `RenameSessionDialog`, `action-sheet.tsx`, `UploadProgressModal`, and `knowledge.tsx`'s `DocumentActionSheet` all do this. `CitationSheet` (built on `@gorhom/bottom-sheet`, not `<Modal>`) is unaffected since it already takes plain colors via `useThemeColors()` instead of `className`.

## Tokens

| Token                           | Light                 | Dark                  | Usage                                                                               |
| ------------------------------- | --------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `background`                    | `#ffffff`             | `#030712`             | Screen-level background                                                             |
| `card`                          | `#ffffff`             | `#111827`             | Elevated surface: sheets, drawer, modals, rows nested in a sheet                    |
| `muted`                         | `#f3f4f6`             | `#1f2937`             | Subtle fill for chips/pills/message bubbles                                         |
| `foreground`                    | `#111827`             | `#f3f4f6`             | Primary text                                                                        |
| `mutedForeground`               | `#6b7280`             | `#9ca3af`             | Secondary/caption text, placeholders                                                |
| `subtleForeground`              | `#9ca3af`             | `#6b7280`             | Tertiary text, e.g. uppercase section labels                                        |
| `border`                        | `#e5e7eb`             | `#374151`             | Default input/button/card border                                                    |
| `borderMuted`                   | `#f3f4f6`             | `#1f2937`             | Divider lines (header bottom border, section separators)                            |
| `icon`                          | `#1f2937`             | `#e5e7eb`             | Default icon tint (JS-only)                                                         |
| `pressed`                       | `#f9fafb`             | `#1f2937`             | Row/button pressed-state background                                                 |
| `primary`                       | `#2563eb`             | `#2563eb`             | CTA button background (same both modes)                                             |
| `primaryPressed`                | `#1d4ed8`             | `#1d4ed8`             | CTA pressed state                                                                   |
| `primaryText`                   | `#2563eb`             | `#60a5fa`             | Accent text/icon (links, selected state)                                            |
| `destructive`                   | `#dc2626`             | `#f87171`             | Error/destructive text & icon                                                       |
| `onPrimary`                     | `#ffffff`             | `#ffffff`             | Icon/text placed on a `primary`-colored surface                                     |
| `overlay`                       | `rgba(0,0,0,0.4)`     | `rgba(0,0,0,0.4)`     | Modal/drawer backdrop (JS-only, e.g. React Navigation's `overlayColor`)             |
| `codeBlockBg` / `codeBlockText` | `#1f2937` / `#f9fafb` | `#111827` / `#f9fafb` | Markdown code block chrome (JS-only, `react-native-markdown-display` style objects) |

Tailwind exposes every token above except `icon`, `overlay`, `codeBlockBg`, `codeBlockText` — those four are JS-only values with no `className` use. `primary`, `primaryPressed`, and `onPrimary` are plain colors (identical in both modes); every other token in the table resolves through the CSS-variable mechanism described above.

## Non-className Colors

Anything that takes a plain color prop instead of a `className` — `Ionicons` `color`, `placeholderTextColor`, `RefreshControl.tintColor`, `SystemUI.setBackgroundColorAsync`, `BottomSheetModal`'s `backgroundStyle`/`handleIndicatorStyle`, React Navigation's `overlayColor`/`drawerStyle.backgroundColor`, `react-native-markdown-display`'s `StyleSheet` objects — must use `useThemeColors()`:

```tsx
const colors = useThemeColors();
<Ionicons name="trash-outline" color={colors.destructive} />;
```

Module-level `StyleSheet.create(...)` objects (which can't call hooks) import `light`/`dark` directly from `src/lib/theme/colors.js` instead — see `MessageBubble.tsx`.

## Out Of Scope

Component-local status-tone palettes (e.g. `badge.tsx`'s `success`/`info`/`danger`/`neutral` tones) are intentionally not part of the shared token set — they're a distinct semantic (status badges) not reused elsewhere, and stay as literal Tailwind classes in that component. The one exception: `badge.tsx`'s `danger` text color is kept aligned with the shared `destructive` token's light value so the two don't drift.
