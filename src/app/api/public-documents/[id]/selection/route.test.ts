const mockRequireUser = jest.fn();
const mockSelectPublicDocumentForUser = jest.fn();
const mockUnselectPublicDocumentForUser = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/server/data/public-documents", () => ({
  selectPublicDocumentForUser: (...args: unknown[]) => mockSelectPublicDocumentForUser(...args),
  unselectPublicDocumentForUser: (...args: unknown[]) => mockUnselectPublicDocumentForUser(...args),
}));

import { DELETE, POST } from "./route";

const params = { params: Promise.resolve({ id: "doc-1" }) };

describe("/api/public-documents/[id]/selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-2", role: "user" });
  });

  it("selects a public document for the current user", async () => {
    mockSelectPublicDocumentForUser.mockResolvedValue({ id: "selection-1", userId: "user-2", documentId: "doc-1" });

    const res = await POST(new Request("http://localhost/api/public-documents/doc-1/selection") as never, params);

    expect(res.status).toBe(201);
    expect(mockSelectPublicDocumentForUser).toHaveBeenCalledWith("user-2", "doc-1");
    expect(await res.json()).toEqual({ id: "selection-1", userId: "user-2", documentId: "doc-1" });
  });

  it("returns 404 when the document is not selectable", async () => {
    mockSelectPublicDocumentForUser.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/public-documents/doc-1/selection") as never, params);

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("removes the current user's selection", async () => {
    mockUnselectPublicDocumentForUser.mockResolvedValue({ count: 1 });

    const res = await DELETE(new Request("http://localhost/api/public-documents/doc-1/selection") as never, params);

    expect(res.status).toBe(204);
    expect(mockUnselectPublicDocumentForUser).toHaveBeenCalledWith("user-2", "doc-1");
  });
});
