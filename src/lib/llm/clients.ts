import OpenAI from "openai";

export const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com",
});

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
});
