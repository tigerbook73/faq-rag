/**
 * @test-file   useChatSessions
 * @description Covers useChatSessions' optimistic delete/rename/deleteAll (with invalidateQueries rollback on
 *              failure), navigation callbacks, and the refetchQueries-based refresh
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { act, waitFor } from "@testing-library/react-native";
import type { ChatSession } from "@/lib/api/session";
import { useChatSessions } from "@/hooks/useChatSessions";
import { queryKeys } from "@/lib/query-keys";
import { renderHookWithClient } from "@/test/react-query";
import { listSessions, deleteSession, updateSession } from "@/lib/api/session";

jest.mock("@/lib/api/session", () => ({
  listSessions: jest.fn(),
  deleteSession: jest.fn(),
  updateSession: jest.fn(),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const SESSIONS: ChatSession[] = [
  { id: "s1", title: "First", messages: [], createdAt: 1, updatedAt: 1 },
  { id: "s2", title: "Second", messages: [], createdAt: 2, updatedAt: 2 },
];

/**
 * @test-suite  useChatSessions
 * @target      apps/mobile/src/hooks/useChatSessions.ts
 * @strategy    renderHook + real QueryClient, @/lib/api/session and expo-router mocked
 * @cases
 *   - [PASS] loads the session list
 *   - [PASS] handleNew navigates to /chat/new
 *   - [PASS] navigateToSession navigates to /chat/<id>
 *   - [PASS] handleDelete removes the session from the cache before the request resolves
 *   - [FAIL] handleDelete rolls back via invalidateQueries when deleteSession rejects
 *   - [PASS] handleRename updates the title in the cache immediately
 *   - [FAIL] handleRename rolls back via invalidateQueries when updateSession rejects
 *   - [PASS] handleDeleteAll clears the cache, deletes every session, and navigates to /chat/new
 *   - [FAIL] handleDeleteAll still navigates to /chat/new when a delete fails
 *   - [PASS] refresh triggers a genuine refetch
 */
describe("useChatSessions", () => {
  beforeEach(() => {
    (listSessions as jest.Mock).mockReset().mockResolvedValue(SESSIONS);
    (deleteSession as jest.Mock).mockReset();
    (updateSession as jest.Mock).mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it("loads the session list", async () => {
    const { result } = renderHookWithClient(useChatSessions);

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));
  });

  it("handleNew navigates to /chat/new", async () => {
    const { result } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    act(() => result.current.handleNew());

    expect(mockPush).toHaveBeenCalledWith("/chat/new");
  });

  it("navigateToSession navigates to /chat/<id>", async () => {
    const { result } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    act(() => result.current.navigateToSession("s1"));

    expect(mockPush).toHaveBeenCalledWith("/chat/s1");
  });

  it("handleDelete removes the session from the cache before the request resolves", async () => {
    (deleteSession as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result, client } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    act(() => {
      void result.current.handleDelete("s1");
    });

    await waitFor(() =>
      expect(client.getQueryData(queryKeys.sessions.list())).toEqual(SESSIONS.filter((s) => s.id !== "s1")),
    );
    expect(deleteSession).toHaveBeenCalledWith("s1");
  });

  it("handleDelete rolls back via invalidateQueries when deleteSession rejects", async () => {
    (deleteSession as jest.Mock).mockRejectedValue(new Error("network down"));
    const { result, client } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    await act(async () => {
      await result.current.handleDelete("s1");
    });

    await waitFor(() => expect(client.getQueryData(queryKeys.sessions.list())).toEqual(SESSIONS));
    expect(listSessions).toHaveBeenCalledTimes(2);
  });

  it("handleRename updates the title in the cache immediately", async () => {
    (updateSession as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { result, client } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    act(() => {
      void result.current.handleRename("s1", "Renamed");
    });

    await waitFor(() =>
      expect(client.getQueryData<ChatSession[]>(queryKeys.sessions.list())?.find((s) => s.id === "s1")?.title).toBe(
        "Renamed",
      ),
    );
    expect(updateSession).toHaveBeenCalledWith("s1", { title: "Renamed" });
  });

  it("handleRename rolls back via invalidateQueries when updateSession rejects", async () => {
    (updateSession as jest.Mock).mockRejectedValue(new Error("network down"));
    const { result, client } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    await act(async () => {
      await result.current.handleRename("s1", "Renamed");
    });

    await waitFor(() => expect(client.getQueryData(queryKeys.sessions.list())).toEqual(SESSIONS));
    expect(listSessions).toHaveBeenCalledTimes(2);
  });

  it("handleDeleteAll clears the cache, deletes every session, and navigates to /chat/new", async () => {
    (deleteSession as jest.Mock).mockResolvedValue(undefined);
    const { result, client } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    await act(async () => {
      await result.current.handleDeleteAll();
    });

    expect(client.getQueryData(queryKeys.sessions.list())).toEqual([]);
    expect(deleteSession).toHaveBeenCalledWith("s1");
    expect(deleteSession).toHaveBeenCalledWith("s2");
    expect(mockReplace).toHaveBeenCalledWith("/chat/new");
  });

  it("still navigates to /chat/new when a delete fails", async () => {
    (deleteSession as jest.Mock).mockRejectedValue(new Error("network down"));
    const { result } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    await act(async () => {
      await result.current.handleDeleteAll();
    });

    expect(mockReplace).toHaveBeenCalledWith("/chat/new");
  });

  it("refresh triggers a genuine refetch", async () => {
    const { result } = renderHookWithClient(useChatSessions);
    await waitFor(() => expect(result.current.sessions).toEqual(SESSIONS));

    await act(async () => {
      await result.current.refresh();
    });

    expect(listSessions).toHaveBeenCalledTimes(2);
  });
});
