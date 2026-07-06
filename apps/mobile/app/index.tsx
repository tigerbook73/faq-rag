import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { randomUUID } from "expo-crypto";
import { getLastChat } from "../src/lib/api/storage";
import { getSession, createSession } from "../src/lib/api/session";

// There's no standalone chat-list route to land on anymore (the session list
// lives inside the drawer), so "/" must always resolve to a concrete chat.
// The stored chat:last id isn't trustworthy on its own — the session it
// points at may have been deleted or pruned server-side — so it's verified
// with getSession() before redirecting, falling back to creating a fresh
// session when it's missing or gone.
export default function Index() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const lastId = await getLastChat();
      if (lastId) {
        const session = await getSession(lastId);
        if (session) {
          if (!cancelled) setHref(`/chat/${lastId}`);
          return;
        }
      }
      const session = await createSession({ id: randomUUID() });
      if (!cancelled) setHref(`/chat/${session.id}`);
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!href) return null;
  return <Redirect href={href} />;
}
