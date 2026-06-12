import { headers } from "next/headers";
import { listSessionsForUser } from "@/lib/server/data/sessions";
import { SWRBootstrap } from "@/components/chat/SWRBootstrap";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const userId = (await headers()).get("x-auth-id");
  const sessions = userId ? await listSessionsForUser(userId) : [];

  return <SWRBootstrap fallbackSessions={sessions}>{children}</SWRBootstrap>;
}
