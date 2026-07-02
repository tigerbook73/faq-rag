import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      <Tabs.Screen name="knowledge" options={{ title: "Knowledge" }} />
      <Tabs.Screen name="about" options={{ title: "About" }} />
    </Tabs>
  );
}
