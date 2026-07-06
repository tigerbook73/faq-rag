/** @type {import('tailwindcss').Config} */
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
};
