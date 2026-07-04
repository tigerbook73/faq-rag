import { useCallback } from "react";
import { useRouter } from "expo-router";
import useSWR from "swr";
import { randomUUID } from "expo-crypto";
import { listSessions, createSession, deleteSession, type ChatSession } from "../lib/api/session";

const SWR_KEY = "/api/sessions";

// Mirrors apps/web/src/components/chat/ChatSidebar/useChatSessions.ts's
// optimistic-mutate pattern (create/delete update the SWR cache immediately,
// then roll back via revalidation if the request fails).
export function useChatSessions() {
  const router = useRouter();
  const { data: sessions = [], isLoading, mutate } = useSWR<ChatSession[]>(SWR_KEY, listSessions);

  const handleNew = useCallback(async () => {
    const id = randomUUID();
    const session = await createSession({ id });
    void mutate((current) => [session, ...(current ?? [])], false);
    router.push(`/chat/${id}`);
  }, [mutate, router]);

  const handleDelete = useCallback(
    async (id: string) => {
      void mutate((current) => current?.filter((s) => s.id !== id), false);
      try {
        await deleteSession(id);
      } catch {
        void mutate();
      }
    },
    [mutate],
  );

  const navigateToSession = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router],
  );

  return { sessions, isLoading, handleNew, handleDelete, navigateToSession };
}
