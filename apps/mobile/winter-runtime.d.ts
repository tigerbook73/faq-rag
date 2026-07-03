// Expo SDK 57's Winter (WinterCG-compatible) runtime installs global TextEncoder,
// TextDecoder, DOMException, and a streaming fetch (Response.body as a real
// ReadableStream) at startup — see node_modules/expo/src/winter/*. React
// Native's own bundled ambient types (react-native/src/types/globals.d.ts)
// predate this runtime and declare none of it, so tsc doesn't know these
// globals exist without this augmentation.
declare global {
  interface ReadableStreamReadValueResult<T> {
    done: false;
    value: T;
  }
  interface ReadableStreamReadDoneResult<T> {
    done: true;
    value?: T;
  }
  type ReadableStreamReadResult<T> = ReadableStreamReadValueResult<T> | ReadableStreamReadDoneResult<T>;

  interface ReadableStreamDefaultReader<R = Uint8Array> {
    read(): Promise<ReadableStreamReadResult<R>>;
    cancel(reason?: unknown): Promise<void>;
    releaseLock(): void;
  }

  interface ReadableStream<R = Uint8Array> {
    getReader(): ReadableStreamDefaultReader<R>;
  }

  interface Response {
    readonly body: ReadableStream<Uint8Array> | null;
  }

  class TextEncoder {
    encode(input?: string): Uint8Array;
  }

  class TextDecoder {
    constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean });
    decode(input?: BufferSource, options?: { stream?: boolean }): string;
  }

  class DOMException extends Error {
    constructor(message?: string, name?: string);
    readonly name: string;
  }
}

export {};
