import { listSessions } from "@/lib/server/data/sessions";
import { listSampleQuestions } from "@/lib/server/data/sample-questions";
import { SWRBootstrap } from "@/components/chat/SWRBootstrap";

// Without this, Next statically prerenders this layout at build time and
// serves that snapshot from the edge cache indefinitely — session list and
// sample-question data added to the DB after a deploy would never show up
// until the next build.
export const dynamic = "force-dynamic";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const [sessions, sampleQuestions] = await Promise.all([listSessions(), listSampleQuestions()]);
  return (
    <SWRBootstrap fallbackSessions={sessions} fallbackSampleQuestions={sampleQuestions}>
      {children}
    </SWRBootstrap>
  );
}
