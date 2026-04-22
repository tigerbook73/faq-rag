import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 120,
});

export async function splitText(text: string): Promise<string[]> {
  return splitter.splitText(text);
}
