import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { getLastChat } from "../lib/api/storage";
import { getSession } from "../lib/api/session";
import { logger } from "../lib/logger";

// There's no standalone chat-list route to land on anymore (the session list
// lives inside the drawer), so "/" must resolve to either the last-used chat
// or the ephemeral "new chat" screen. The stored chat:last id isn't
// trustworthy on its own — the session it points at may have been deleted or
// pruned server-side — so it's verified with getSession() before redirecting.
// Falls back to /chat/new (not an eagerly-created session) when it's missing
// or gone, mirroring apps/web's getLastChatHref().
export default function Index() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const lastId = await getLastChat();
      if (lastId) {
        try {
          const session = await getSession(lastId);
          if (session) {
            if (!cancelled) setHref(`/chat/${lastId}`);
            return;
          }
        } catch (err) {
          // Network/server error — fall through to /chat/new rather than
          // stranding the user on a blank screen at launch.
          logger.warn("Failed to resolve last chat session:", err instanceof Error ? err.message : String(err));
        }
      }
      if (!cancelled) setHref("/chat/new");
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!href) return null;
  return <Redirect href={href} />;
}
