import { test, expect } from "../../fixtures/auth";
import { createPendingDocument, deleteDocumentIfExists, listDocuments } from "../../fixtures/documents";

test.describe("multi-user document isolation", () => {
  test("user2 cannot list or delete user1 private documents", async ({ user1Page, user2Page }) => {
    const marker = crypto.randomUUID();
    const document = await createPendingDocument(user1Page, {
      name: `e2e-private-${marker}.txt`,
      content: `private document ${marker}`,
    });

    try {
      const user1Documents = await listDocuments(user1Page);
      expect(user1Documents.items.some((item) => item.id === document.id)).toBe(true);

      const user2Documents = await listDocuments(user2Page);
      expect(user2Documents.items.some((item) => item.id === document.id || item.name === document.name)).toBe(false);

      const deleteRes = await user2Page.request.delete(`/api/documents/${document.id}`);
      expect([403, 404]).toContain(deleteRes.status());
    } finally {
      await deleteDocumentIfExists(user1Page, document.id);
    }
  });
});
