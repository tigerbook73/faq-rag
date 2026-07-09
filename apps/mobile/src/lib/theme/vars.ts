import { vars } from "nativewind";
import { light, dark } from "./colors";

function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

// Tokens whose value differs between light/dark are exposed as CSS custom
// properties (applied once at the root via GluestackUIProvider) so a single
// Tailwind class (`bg-background`) resolves automatically, instead of every
// call site needing a paired `dark:bg-background-dark` class. Tokens with an
// identical value in both modes (primary, primaryPressed, onPrimary) stay
// plain colors in tailwind.config.js and don't need a CSS variable.
const MODE_DEPENDENT_KEYS = [
  "background",
  "card",
  "muted",
  "foreground",
  "mutedForeground",
  "subtleForeground",
  "border",
  "borderMuted",
  "pressed",
  "primaryText",
  "destructive",
] as const;

// Must match the `--color-*` names tailwind.config.js references.
const CSS_VAR_NAME: Record<(typeof MODE_DEPENDENT_KEYS)[number], string> = {
  background: "--color-background",
  card: "--color-card",
  muted: "--color-muted",
  foreground: "--color-foreground",
  mutedForeground: "--color-muted-foreground",
  subtleForeground: "--color-subtle-foreground",
  border: "--color-border",
  borderMuted: "--color-border-muted",
  pressed: "--color-pressed",
  primaryText: "--color-primary-text",
  destructive: "--color-destructive",
};

function buildVars(tokens: typeof light) {
  const entries: Record<string, string> = {};
  for (const key of MODE_DEPENDENT_KEYS) {
    entries[CSS_VAR_NAME[key]] = hexToRgbTriplet(tokens[key]);
  }
  return vars(entries);
}

export const themeVars = {
  light: buildVars(light),
  dark: buildVars(dark),
};
