import { useCallback } from "react";
import { useRouter } from "expo-router";
import useSWR from "swr";
import { listSessions, deleteSession, updateSession, type ChatSession } from "../lib/api/session";

const SWR_KEY = "/api/sessions";

// Mirrors apps/web/src/components/chat/ChatSidebar/useChatSessions.ts's
// optimistic-mutate pattern (delete updates the SWR cache immediately, then
// rolls back via revalidation if the request fails).
export function useChatSessions() {
  const router = useRouter();
  const { data: sessions = [], isLoading, mutate } = useSWR<ChatSession[]>(SWR_KEY, listSessions);

  // Navigates to the ephemeral "new chat" screen without creating a session —
  // it's only persisted (and shows up in this list) once the first message is
  // sent, mirroring apps/web's router.push("/chat/new").
  const handleNew = useCallback(() => {
    router.push("/chat/new");
  }, [router]);

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

  const handleRename = useCallback(
    async (id: string, title: string) => {
      void mutate((current) => current?.map((s) => (s.id === id ? { ...s, title } : s)), false);
      try {
        await updateSession(id, { title });
      } catch {
        void mutate();
      }
    },
    [mutate],
  );

  const handleDeleteAll = useCallback(async () => {
    const ids = sessions.map((s) => s.id);
    void mutate([], false);
    try {
      await Promise.all(ids.map((id) => deleteSession(id)));
    } catch {
      void mutate();
    }
    router.replace("/chat/new");
  }, [sessions, mutate, router]);

  const navigateToSession = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router],
  );

  return { sessions, isLoading, handleNew, handleDelete, handleRename, handleDeleteAll, navigateToSession };
}
