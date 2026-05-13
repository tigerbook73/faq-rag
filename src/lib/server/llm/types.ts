export interface Msg {
  role: "user" | "assistant";
  content: string;
}

import type { Provider } from "./providers";

export interface LLMProvider {
  name: Provider;
  chat(params: { system: string; messages: Msg[] }): AsyncGenerator<string>;
}
