import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
