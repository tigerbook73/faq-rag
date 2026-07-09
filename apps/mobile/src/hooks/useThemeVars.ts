import { useColorScheme } from "nativewind";
import { themeVars } from "../lib/theme/vars";

/**
 * Resolves the current color scheme's CSS-variable style object (see
 * src/lib/theme/vars.ts). GluestackUIProvider already applies this at the
 * root, so most components never need it directly — but content rendered
 * through React Native's `<Modal>` is portaled outside that DOM subtree on
 * web (react-native-web renders it via a separate portal root), which
 * breaks the CSS custom property inheritance the mode-dependent tokens
 * (`bg-card`, `text-foreground`, etc.) rely on. Any component whose
 * top-level element sits directly inside a `<Modal>` must re-apply this via
 * `style={useThemeVars()}` on that element.
 */
export function useThemeVars() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? themeVars.dark : themeVars.light;
}
