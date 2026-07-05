import "../global.css";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GluestackUIProvider } from "../src/components/ui/gluestack-ui-provider";
import { ProviderContextProvider } from "../src/context/provider-context";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GluestackUIProvider>
        <ProviderContextProvider>
          <BottomSheetModalProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </BottomSheetModalProvider>
        </ProviderContextProvider>
      </GluestackUIProvider>
    </GestureHandlerRootView>
  );
}
