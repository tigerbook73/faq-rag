import "../global.css";
import { Stack } from "expo-router";
import { GluestackUIProvider } from "../src/components/ui/gluestack-ui-provider";

export default function RootLayout() {
  return (
    <GluestackUIProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </GluestackUIProvider>
  );
}
