import { Redirect } from "expo-router";

// The (tabs) group owns the root path "/", but none of the tab screens is
// literally named index.tsx, so "/" would otherwise be unmatched on cold
// launch. Redirect it to the Chats tab instead of adding a fourth visible tab.
export default function TabsIndex() {
  return <Redirect href="/chats" />;
}
