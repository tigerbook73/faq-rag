import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@faq-rag/shared"],
  serverExternalPackages: [
    "@huggingface/transformers",
    "onnxruntime-node",
    "pdf-parse",
    "mammoth",
    "@prisma/client",
    "franc-min",
    "@langchain/textsplitters",
  ],
};

export default nextConfig;
