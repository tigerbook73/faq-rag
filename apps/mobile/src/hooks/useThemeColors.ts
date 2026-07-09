import { useColorScheme } from "nativewind";
import { light, dark } from "../lib/theme/colors";

/**
 * Resolves the current color scheme's flat token object (see
 * apps/mobile/src/lib/theme/colors.js). Use this for anything that can't
 * take a NativeWind `className` — icon `color` props, `placeholderTextColor`,
 * `SystemUI.setBackgroundColorAsync`, `RefreshControl.tintColor`,
 * `BottomSheetModal` style props, etc.
 */
export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? dark : light;
}
