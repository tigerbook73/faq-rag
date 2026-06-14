import { listSessions } from "@/lib/server/data/sessions";
import { SWRBootstrap } from "@/components/chat/SWRBootstrap";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const sessions = await listSessions();
  return <SWRBootstrap fallbackSessions={sessions}>{children}</SWRBootstrap>;
}
