/**
 * Single source of truth for apps/mobile color tokens. Both
 * `tailwind.config.js` (className usage) and `useThemeColors()` (raw JS
 * values for icon props, StyleSheet, SystemUI, etc.) derive from this file —
 * do not hardcode hex literals elsewhere. See docs/ui-system-mobile.md.
 *
 * Plain CommonJS (not .ts) so tailwind.config.js can `require()` it
 * directly; TS call sites can still `import` it since tsconfig has
 * `allowJs: true`.
 */

const light = {
  background: "#ffffff",
  card: "#ffffff",
  // Subtle fill for chips/pills/message bubbles — same value as borderMuted
  // but a separate name since the two play different semantic roles (fill
  // vs. divider line), mirroring shadcn's separate `muted`/`border` tokens.
  muted: "#f3f4f6",
  foreground: "#111827",
  mutedForeground: "#6b7280",
  subtleForeground: "#9ca3af",
  border: "#e5e7eb",
  borderMuted: "#f3f4f6",
  icon: "#1f2937",
  pressed: "#f9fafb",
  primary: "#2563eb",
  primaryPressed: "#1d4ed8",
  primaryText: "#2563eb",
  destructive: "#dc2626",
  onPrimary: "#ffffff",
  overlay: "rgba(0,0,0,0.4)",
  // Markdown code block chrome (MessageBubble) — deliberately a dark
  // surface in both app themes for terminal-like contrast, JS-only (react
  // native-markdown-display takes StyleSheet objects, not className).
  codeBlockBg: "#1f2937",
  codeBlockText: "#f9fafb",
};

const dark = {
  background: "#030712",
  card: "#111827",
  muted: "#1f2937",
  foreground: "#f3f4f6",
  mutedForeground: "#9ca3af",
  subtleForeground: "#6b7280",
  border: "#374151",
  borderMuted: "#1f2937",
  icon: "#e5e7eb",
  pressed: "#1f2937",
  primary: "#2563eb",
  primaryPressed: "#1d4ed8",
  primaryText: "#60a5fa",
  destructive: "#f87171",
  onPrimary: "#ffffff",
  overlay: "rgba(0,0,0,0.4)",
  codeBlockBg: "#111827",
  codeBlockText: "#f9fafb",
};

module.exports = { light, dark };
