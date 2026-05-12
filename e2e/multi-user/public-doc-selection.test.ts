import { test, expect } from "../fixtures/auth";
import { deleteDocumentIfExists, setDocumentVisibility, uploadAndIndexTextDocument } from "../fixtures/documents";

async function getChatCitations(page: import("@playwright/test").Page, question: string) {
  const res = await page.request.post("/api/chat", {
    data: {
      question,
      history: [],
    },
  });
  expect(res.status()).toBe(200);

  const body = await res.text();
  const citationLine = body
    .split("\n")
    .find((line) => line.startsWith("data: ") && line.includes('"type":"citations"'));
  expect(citationLine).toBeTruthy();
  const payload = JSON.parse(citationLine!.slice("data: ".length)) as {
    citations: Array<{ documentId: string; documentName: string; preview: string }>;
  };
  return payload.citations;
}

test.describe("multi-user public document selection @real-api @embed @slow", () => {
  test("user2 retrieval only includes user1 public document while selected", async ({ user1Page, user2Page }) => {
    const marker = `E2E_PUBLIC_${crypto.randomUUID().replaceAll("-", "_")}`;
    const document = await uploadAndIndexTextDocument(user1Page, {
      name: `e2e-public-${marker}.txt`,
      content: `This document contains the unique retrieval marker ${marker}.`,
    });

    try {
      await setDocumentVisibility(user1Page, document.id, "public");

      const publicDocsRes = await user2Page.request.get("/api/public-documents");
      expect(publicDocsRes.status()).toBe(200);
      const publicDocs = (await publicDocsRes.json()) as {
        items: Array<{ id: string; name: string; selected: boolean }>;
      };
      expect(publicDocs.items.some((item) => item.id === document.id && item.selected === false)).toBe(true);

      const question = `What document mentions ${marker}?`;
      await expect(async () => {
        const unselectedCitations = await getChatCitations(user2Page, question);
        expect(unselectedCitations.some((citation) => citation.documentId === document.id)).toBe(false);
      }).toPass({ timeout: 15_000 });

      const selectRes = await user2Page.request.post(`/api/public-documents/${document.id}/selection`);
      expect(selectRes.status()).toBe(201);

      await expect(async () => {
        const selectedCitations = await getChatCitations(user2Page, question);
        expect(selectedCitations.some((citation) => citation.documentId === document.id)).toBe(true);
      }).toPass({ timeout: 30_000 });

      const unselectRes = await user2Page.request.delete(`/api/public-documents/${document.id}/selection`);
      expect(unselectRes.status()).toBe(204);

      await expect(async () => {
        const unselectedAgainCitations = await getChatCitations(user2Page, question);
        expect(unselectedAgainCitations.some((citation) => citation.documentId === document.id)).toBe(false);
      }).toPass({ timeout: 15_000 });
    } finally {
      await deleteDocumentIfExists(user1Page, document.id);
    }
  });
});
