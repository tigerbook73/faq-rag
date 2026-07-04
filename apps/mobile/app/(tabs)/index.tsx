import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { getLastChat } from "../../src/lib/api/storage";

// The (tabs) group owns the root path "/", but none of the tab screens is
// literally named index.tsx, so "/" would otherwise be unmatched on cold
// launch. Redirect it to the last-visited chat if one exists, otherwise the
// Chats tab, instead of adding a fourth visible tab.
export default function TabsIndex() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    getLastChat().then((id) => setHref(id ? `/chat/${id}` : "/chats"));
  }, []);

  if (!href) return null;
  return <Redirect href={href} />;
}
