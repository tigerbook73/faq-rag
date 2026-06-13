const mockQueryRaw = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

import { vectorSearch } from "@/lib/server/retrieval/vector-search";

describe("vectorSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRaw.mockResolvedValue([]);
  });

  it("queries all indexed documents without ownership filter", async () => {
    await vectorSearch([0.1, 0.2], 5);

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    const [strings] = mockQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    const sql = strings.join("?");

    expect(sql).toContain("d.status = 'indexed'");
    expect(sql).not.toContain("owner_user_id");
    expect(sql).not.toContain("visibility");
    expect(sql).not.toContain("public_document_selections");
  });
});
