import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listSessions, deleteSession, updateSession, type ChatSession } from "@/lib/api/session";
import { queryKeys } from "@/lib/query-keys";
import { logger } from "@/lib/logger";

// Mirrors apps/web/src/components/chat/ChatSidebar/useChatSessions.ts's
// optimistic-mutate pattern (delete updates the cache immediately, then
// rolls back via revalidation if the request fails).
export function useChatSessions() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: sessions = [], isLoading } = useQuery({ queryKey: queryKeys.sessions.list(), queryFn: listSessions });

  // Navigates to the ephemeral "new chat" screen without creating a session —
  // it's only persisted (and shows up in this list) once the first message is
  // sent, mirroring apps/web's router.push("/chat/new").
  const handleNew = useCallback(() => {
    router.push("/chat/new");
  }, [router]);

  const handleDelete = useCallback(
    async (id: string) => {
      queryClient.setQueryData<ChatSession[]>(queryKeys.sessions.list(), (current) =>
        current?.filter((s) => s.id !== id),
      );
      try {
        await deleteSession(id);
      } catch (err) {
        logger.warn("Failed to delete chat session:", err instanceof Error ? err.message : String(err));
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list() });
      }
    },
    [queryClient],
  );

  const handleRename = useCallback(
    async (id: string, title: string) => {
      queryClient.setQueryData<ChatSession[]>(queryKeys.sessions.list(), (current) =>
        current?.map((s) => (s.id === id ? { ...s, title } : s)),
      );
      try {
        await updateSession(id, { title });
      } catch (err) {
        logger.warn("Failed to rename chat session:", err instanceof Error ? err.message : String(err));
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list() });
      }
    },
    [queryClient],
  );

  const handleDeleteAll = useCallback(async () => {
    const ids = sessions.map((s) => s.id);
    queryClient.setQueryData<ChatSession[]>(queryKeys.sessions.list(), []);
    try {
      await Promise.all(ids.map((id) => deleteSession(id)));
    } catch (err) {
      logger.warn("Failed to delete all chat sessions:", err instanceof Error ? err.message : String(err));
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.list() });
    }
    router.replace("/chat/new");
  }, [sessions, queryClient, router]);

  const navigateToSession = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`);
    },
    [router],
  );

  // refetchQueries forces a genuine server round-trip rather than replaying a
  // cached update, so this is real network I/O for pull-to-refresh.
  const refresh = useCallback(() => queryClient.refetchQueries({ queryKey: queryKeys.sessions.list() }), [queryClient]);

  return {
    sessions,
    isLoading,
    handleNew,
    handleDelete,
    handleRename,
    handleDeleteAll,
    navigateToSession,
    refresh,
  };
}
