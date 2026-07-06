import { Drawer } from "expo-router/drawer";
import { useColorScheme } from "nativewind";
import { ChatDrawerContent } from "../../src/components/chat/ChatDrawerContent";

export default function DrawerLayout() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Drawer
      drawerContent={(props) => <ChatDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.4)",
        drawerStyle: {
          width: "84%",
          maxWidth: 320,
          backgroundColor: isDark ? "#030712" : "#ffffff",
        },
      }}
    >
      <Drawer.Screen name="chat/[id]" />
    </Drawer>
  );
}
