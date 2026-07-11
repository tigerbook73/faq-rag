import { useWindowDimensions } from "react-native";
import { Drawer } from "expo-router/drawer";
import { ChatDrawerContent } from "@/components/chat/ChatDrawerContent";
import { useThemeColors } from "@/hooks/useThemeColors";

export default function DrawerLayout() {
  const colors = useThemeColors();
  const { width: windowWidth } = useWindowDimensions();

  // A percentage width combined with maxWidth resolves inconsistently on
  // react-native-web: the drawer's measured layout width ignores maxWidth
  // while its slide-open animation respects it, leaving the drawer stuck
  // partway off-screen. Resolving to a single definite number up front
  // avoids the mismatch on every platform.
  const drawerWidth = Math.min(windowWidth * 0.84, 320);

  return (
    <Drawer
      drawerContent={(props) => <ChatDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEnabled: true,
        overlayColor: colors.overlay,
        drawerStyle: {
          width: drawerWidth,
          // `card` — one shade lighter than the chat screen's `background`
          // so the drawer has a visible boundary against it.
          backgroundColor: colors.card,
        },
      }}
    >
      <Drawer.Screen name="chat/new" />
      <Drawer.Screen name="chat/[id]" />
    </Drawer>
  );
}
