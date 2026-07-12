import { listSessions } from "@/lib/server/data/sessions";
import { listSampleQuestions } from "@/lib/server/data/sample-questions";
import { SWRBootstrap } from "@/components/chat/SWRBootstrap";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const [sessions, sampleQuestions] = await Promise.all([listSessions(), listSampleQuestions()]);
  return (
    <SWRBootstrap fallbackSessions={sessions} fallbackSampleQuestions={sampleQuestions}>
      {children}
    </SWRBootstrap>
  );
}
