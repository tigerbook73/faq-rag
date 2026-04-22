export interface Msg {
  role: "user" | "assistant";
  content: string;
}

export interface LLMProvider {
  name: "claude" | "deepseek";
  chat(params: { system: string; messages: Msg[] }): AsyncGenerator<string>;
}
