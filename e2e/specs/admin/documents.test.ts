import { test, expect } from "../../fixtures/auth";
import { setDocumentVisibility, uploadAndIndexTextDocument } from "../../fixtures/documents";

test.describe("multi-user admin documents", () => {
  test("admin deleting a public document removes it from user public lists @embed @slow", async ({
    adminPage,
    user1Page,
    user2Page,
  }) => {
    const marker = `E2E_ADMIN_DOC_${crypto.randomUUID().replaceAll("-", "_")}`;
    const document = await uploadAndIndexTextDocument(user1Page, {
      name: `e2e-admin-delete-${marker}.txt`,
      content: `Admin delete public document marker ${marker}.`,
    });
    await setDocumentVisibility(user1Page, document.id, "public");

    const beforeRes = await user2Page.request.get("/api/public-documents");
    expect(beforeRes.status()).toBe(200);
    const before = (await beforeRes.json()) as { items: Array<{ id: string }> };
    expect(before.items.some((item) => item.id === document.id)).toBe(true);

    const deleteRes = await adminPage.request.delete(`/api/admin/documents/${document.id}`);
    expect(deleteRes.status()).toBe(204);

    const afterRes = await user2Page.request.get("/api/public-documents");
    expect(afterRes.status()).toBe(200);
    const after = (await afterRes.json()) as { items: Array<{ id: string }> };
    expect(after.items.some((item) => item.id === document.id)).toBe(false);
  });
});
