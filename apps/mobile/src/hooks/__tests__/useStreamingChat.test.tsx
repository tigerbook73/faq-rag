/**
 * @test-file   useStreamingChat
 * @description Covers useStreamingChat's send guard, optimistic message pair, 50ms token-flush throttling,
 *              onDone/onError/onClose finish paths (with/without partial content, settled idempotency),
 *              persistence + session cache side effects, ephemeral-chat navigation, and unmount abort
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { useState } from "react";
import { act, waitFor } from "@testing-library/react-native";
import type { Message } from "@faq-rag/shared";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import type { ChatSession } from "@/lib/api/session";
import { queryKeys } from "@/lib/query-keys";
import { renderHookWithClient } from "@/test/react-query";
import { streamChat, type Provider, type StreamChatCallbacks } from "@/lib/api/chat";
import { updateSession } from "@/lib/api/session";
import { setLastChat } from "@/lib/api/storage";

jest.mock("@/lib/api/chat", () => ({ streamChat: jest.fn() }));

jest.mock("@/lib/api/session", () => ({ updateSession: jest.fn() }));

jest.mock("@/lib/api/storage", () => ({ setLastChat: jest.fn() }));

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));

jest.mock("expo-crypto", () => ({ randomUUID: jest.fn(() => "generated-uuid") }));

const PROVIDER = "claude" as Provider;

function useHarness(props: { chatId: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const streaming = useStreamingChat({
    chatId: props.chatId,
    messages,
    setMessages,
    session,
    setSession,
    provider: PROVIDER,
  });
  return { ...streaming, messages, session };
}

/** Captures the callbacks passed to the mocked streamChat so tests can drive them manually. */
function captureStreamChat() {
  const abort = jest.fn();
  let captured: StreamChatCallbacks | undefined;
  (streamChat as jest.Mock).mockImplementation((_params: unknown, callbacks: StreamChatCallbacks) => {
    captured = callbacks;
    return { abort };
  });
  return { getCallbacks: () => captured!, abort };
}

const RESOLVED_SESSION: ChatSession = { id: "generated-uuid", title: "hi", messages: [], createdAt: 1, updatedAt: 2 };

/**
 * @test-suite  useStreamingChat
 * @target      apps/mobile/src/hooks/useStreamingChat.ts
 * @strategy    renderHook wrapping a small useState harness + real QueryClient; @/lib/api/chat mocked with a
 *              callback-capturing streamChat so SSE events can be dispatched manually
 * @cases
 *   - [FAIL] blank input does not start a stream
 *   - [FAIL] a send while already loading is a no-op
 *   - [PASS] send optimistically appends the user message and an empty assistant message
 *   - [PASS] token events are throttled to one flush per ~50ms
 *   - [PASS] onDone finalizes the message, persists, and writes the session cache
 *   - [PASS] onDone on an ephemeral chat navigates to the real session url after persisting
 *   - [PASS] onDone on an existing chat does not navigate
 *   - [PASS] onDone still navigates even when persisting fails
 *   - [FAIL] onError with no partial content shows the error message
 *   - [FAIL] onError with partial content appends the interrupted mark
 *   - [FAIL] onClose with no partial content falls back to "Response interrupted"
 *   - [FAIL] onClose with partial content appends the interrupted mark
 *   - [PASS] onClose is a no-op once already settled
 *   - [PASS] unmounting aborts the in-flight request
 */
describe("useStreamingChat", () => {
  beforeEach(() => {
    (streamChat as jest.Mock).mockReset();
    (updateSession as jest.Mock).mockReset().mockResolvedValue(RESOLVED_SESSION);
    (setLastChat as jest.Mock).mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
  });

  it("blank input does not start a stream", async () => {
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    await act(async () => {
      await result.current.send("   ");
    });

    expect(streamChat).not.toHaveBeenCalled();
  });

  it("a send while already loading is a no-op", () => {
    captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    // Two separate act() calls (not one) so the second send() re-reads `loading`
    // from a fresh render, matching how two real dispatches would behave.
    act(() => void result.current.send("first"));
    act(() => void result.current.send("second"));

    expect(streamChat).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);
  });

  it("send optimistically appends the user message and an empty assistant message", () => {
    captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => {
      void result.current.send("hi");
    });

    expect(result.current.messages).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "" },
    ]);
  });

  it("token events are throttled to one flush per ~50ms", async () => {
    jest.useFakeTimers();
    try {
      const { getCallbacks } = captureStreamChat();
      const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

      act(() => void result.current.send("hi"));
      const callbacks = getCallbacks();

      act(() => {
        callbacks.onToken?.("a");
        callbacks.onToken?.("b");
      });
      expect(result.current.messages[1].content).toBe("");

      await act(async () => {
        await jest.advanceTimersByTimeAsync(50);
      });
      expect(result.current.messages[1].content).toBe("ab");
    } finally {
      jest.useRealTimers();
    }
  });

  it("onDone finalizes the message, persists, and writes the session cache", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result, client } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });
    const invalidateSpy = jest.spyOn(client, "invalidateQueries");

    act(() => void result.current.send("hi"));
    const citations = [{ id: 1, documentId: "d1", documentName: "doc", chunkId: "c1", preview: "p", score: 0.9 }];

    // Keep the async persistence update inside act(), otherwise React 19
    // reports setSession() as an update that happened outside the test.
    await act(async () => {
      getCallbacks().onDone?.("final answer", citations);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "final answer", citations });

    expect(updateSession).toHaveBeenCalledWith(
      "generated-uuid",
      expect.objectContaining({ title: "hi", messages: expect.any(Array) }),
    );
    expect(setLastChat).toHaveBeenCalledWith("generated-uuid");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.sessions.list() });
    expect(client.getQueryData(queryKeys.sessions.detail("generated-uuid"))).toEqual({
      ...RESOLVED_SESSION,
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "final answer", citations },
      ],
    });
  });

  it("onDone on an ephemeral chat navigates to the real session url after persisting", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onDone?.("final answer");
      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    });

    expect(mockReplace).toHaveBeenCalledWith("/chat/generated-uuid");
  });

  it("onDone on an existing chat does not navigate", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: "existing-id" } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onDone?.("final answer");
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.loading).toBe(false);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("onDone still navigates even when persisting fails", async () => {
    (updateSession as jest.Mock).mockReset().mockRejectedValue(new Error("network down"));
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onDone?.("final answer");
      await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    });

    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "final answer", citations: [] });
    expect(mockReplace).toHaveBeenCalledWith("/chat/generated-uuid");
  });

  it("onError with no partial content shows the error message", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onError?.("LLM failed");
      await waitFor(() => expect(updateSession).toHaveBeenCalled());
    });

    expect(result.current.messages[1].content).toBe("⚠️ LLM failed");
    expect(result.current.loading).toBe(false);
  });

  it("onError with partial content appends the interrupted mark", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onToken?.("partial");
      getCallbacks().onError?.("LLM failed");
      await waitFor(() => expect(updateSession).toHaveBeenCalled());
    });

    expect(result.current.messages[1].content).toBe("partial\n\n⚠️ _Response interrupted_");
  });

  it('onClose with no partial content falls back to "Response interrupted"', async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onClose?.();
      await waitFor(() => expect(updateSession).toHaveBeenCalled());
    });

    expect(result.current.messages[1].content).toBe("⚠️ Response interrupted");
  });

  it("onClose with partial content appends the interrupted mark", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onToken?.("partial");
      getCallbacks().onClose?.();
      await waitFor(() => expect(updateSession).toHaveBeenCalled());
    });

    expect(result.current.messages[1].content).toBe("partial\n\n⚠️ _Response interrupted_");
  });

  it("onClose is a no-op once already settled", async () => {
    const { getCallbacks } = captureStreamChat();
    const { result } = renderHookWithClient(useHarness, { initialProps: { chatId: "existing-id" } });

    act(() => void result.current.send("hi"));
    await act(async () => {
      getCallbacks().onDone?.("final answer");
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.loading).toBe(false);
    const settledMessages = result.current.messages;

    act(() => getCallbacks().onClose?.());

    expect(result.current.messages).toEqual(settledMessages);
  });

  it("unmounting aborts the in-flight request", () => {
    const { abort } = captureStreamChat();
    const { result, unmount } = renderHookWithClient(useHarness, { initialProps: { chatId: null } });

    act(() => void result.current.send("hi"));
    unmount();

    expect(abort).toHaveBeenCalledTimes(1);
  });
});
