import { useWindowDimensions } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useColorScheme } from "nativewind";
import { ChatDrawerContent } from "../../src/components/chat/ChatDrawerContent";

export default function DrawerLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
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
        overlayColor: "rgba(0,0,0,0.4)",
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: isDark ? "#030712" : "#ffffff",
        },
      }}
    >
      <Drawer.Screen name="chat/[id]" />
    </Drawer>
  );
}
