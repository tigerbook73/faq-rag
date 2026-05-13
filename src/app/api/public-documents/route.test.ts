const mockRequireUser = jest.fn();
const mockListSelectablePublicDocuments = jest.fn();

jest.mock("@/lib/server/auth/require-user", () => ({
  requireUser: () => mockRequireUser(),
}));

jest.mock("@/lib/server/data/public-documents", () => ({
  listSelectablePublicDocuments: (...args: unknown[]) => mockListSelectablePublicDocuments(...args),
}));

import { GET } from "./route";

describe("/api/public-documents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "user-2", role: "user" });
  });

  it("lists selectable public documents for the current user", async () => {
    mockListSelectablePublicDocuments.mockResolvedValue([{ id: "doc-1", selected: false }]);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(mockListSelectablePublicDocuments).toHaveBeenCalledWith("user-2");
    expect(await res.json()).toEqual({ items: [{ id: "doc-1", selected: false }] });
  });
});
