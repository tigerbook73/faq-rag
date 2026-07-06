/**
 * @test-file   streamChat
 * @description Covers SSE event dispatch (citations/token/done/error) and abort behavior for apps/mobile/src/lib/api/chat.ts
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */
import { streamChat, type StreamChatCallbacks } from "../chat";

function sseBody(frames: string[]) {
  let i = 0;
  return {
    getReader: () => ({
      read: async () => {
        if (i < frames.length) {
          return { done: false, value: new TextEncoder().encode(frames[i++]) };
        }
        return { done: true, value: undefined };
      },
    }),
  };
}

function frame(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function waitFor(callbacks: StreamChatCallbacks, event: "onDone" | "onError"): Promise<void> {
  return new Promise((resolve) => {
    const original = callbacks[event] as ((...args: unknown[]) => void) | undefined;
    callbacks[event] = ((...args: unknown[]) => {
      original?.(...args);
      resolve();
    }) as never;
  });
}

/**
 * @test-suite  streamChat
 * @target      apps/mobile/src/lib/api/chat.ts
 * @strategy    unit, globalThis.fetch mocked with a fake ReadableStream reader
 * @cases
 *   - [PASS] dispatches citations, token, and done events
 *   - [PASS] dispatches an error event from the stream
 *   - [PASS] reports non-ok responses via onError
 *   - [PASS] aborting the returned controller suppresses onError
 */
describe("streamChat", () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn();
  });

  it("dispatches citations, token, and done events", async () => {
    const citations = [{ id: 1, documentId: "d1", documentName: "doc", chunkId: "c1", preview: "p", score: 0.9 }];
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: sseBody([
        frame({ type: "citations", citations }),
        frame({ type: "token", token: "Hi" }),
        frame({ type: "done", answer: "Hi", citations }),
      ]),
    });

    const onCitations = jest.fn();
    const onToken = jest.fn();
    const onDone = jest.fn();
    const callbacks: StreamChatCallbacks = { onCitations, onToken, onDone };
    const done = waitFor(callbacks, "onDone");

    streamChat({ question: "q", provider: "claude", history: [] }, callbacks);
    await done;

    expect(onCitations).toHaveBeenCalledWith(citations);
    expect(onToken).toHaveBeenCalledWith("Hi");
    expect(onDone).toHaveBeenCalledWith("Hi", citations);
  });

  it("dispatches an error event from the stream", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: sseBody([frame({ type: "error", message: "LLM failed" })]),
    });

    const onError = jest.fn();
    const callbacks: StreamChatCallbacks = { onError };
    const errored = waitFor(callbacks, "onError");

    streamChat({ question: "q", provider: "claude", history: [] }, callbacks);
    await errored;

    expect(onError).toHaveBeenCalledWith("LLM failed");
  });

  it("reports non-ok responses via onError", async () => {
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500, body: null });

    const onError = jest.fn();
    const callbacks: StreamChatCallbacks = { onError };
    const errored = waitFor(callbacks, "onError");

    streamChat({ question: "q", provider: "claude", history: [] }, callbacks);
    await errored;

    expect(onError).toHaveBeenCalledWith(expect.stringContaining("500"));
  });

  it("aborting the returned controller suppresses onError", async () => {
    (globalThis.fetch as jest.Mock).mockImplementation(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        }),
    );

    const onError = jest.fn();
    const onDone = jest.fn();
    const controller = streamChat({ question: "q", provider: "claude", history: [] }, { onError, onDone });
    controller.abort();

    await new Promise((resolve) => setTimeout(() => resolve(undefined), 0));

    expect(onError).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});
