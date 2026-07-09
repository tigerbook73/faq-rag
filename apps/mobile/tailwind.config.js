/** @type {import('tailwindcss').Config} */
const { light } = require("./src/lib/theme/colors");

// Mode-dependent tokens resolve through a CSS custom property (set once at
// the root by GluestackUIProvider via src/lib/theme/vars.ts, keyed off the
// current color scheme) so a single class like `bg-background` picks the
// right value automatically — no paired `dark:bg-background-dark` class
// needed. Var names here must match CSS_VAR_NAME in vars.ts.
const rgbVar = (name) => `rgb(var(${name}) / <alpha-value>)`;

const themeColors = {
  background: rgbVar("--color-background"),
  card: rgbVar("--color-card"),
  muted: rgbVar("--color-muted"),
  foreground: rgbVar("--color-foreground"),
  "muted-foreground": rgbVar("--color-muted-foreground"),
  "subtle-foreground": rgbVar("--color-subtle-foreground"),
  border: rgbVar("--color-border"),
  "border-muted": rgbVar("--color-border-muted"),
  pressed: rgbVar("--color-pressed"),
  "primary-text": rgbVar("--color-primary-text"),
  destructive: rgbVar("--color-destructive"),
  // Identical value in both modes — plain colors, no CSS var needed.
  primary: light.primary,
  "primary-pressed": light.primaryPressed,
  "on-primary": light.onPrimary,
};

module.exports = {
  // The app has no manual theme toggle (app.json sets userInterfaceStyle:
  // "automatic"), so dark mode should just follow the system. "class"
  // requires something to call colorScheme.set() to toggle a .dark class,
  // which nothing here does — on web that leaves dark: variants dead no
  // matter what the OS preference is. "media" follows prefers-color-scheme
  // directly on web; native is unaffected either way (its runtime resolves
  // dark: variants from Appearance directly, regardless of this setting).
  darkMode: "media",
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: themeColors,
    },
  },
};
