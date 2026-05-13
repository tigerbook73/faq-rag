const mockQueryRaw = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

import { vectorSearch } from "@/lib/server/retrieval/vector-search";

describe("vectorSearch permissions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRaw.mockResolvedValue([]);
  });

  it("filters retrieval to owned indexed documents and selected public documents", async () => {
    await vectorSearch([0.1, 0.2], 5, "user-2");

    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    const [strings, ...values] = mockQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    const sql = strings.join("?");

    expect(sql).toContain("d.status = 'indexed'");
    expect(sql).toContain("d.owner_user_id = ?");
    expect(sql).toContain("d.visibility = 'public'");
    expect(sql).toContain("FROM public_document_selections s");
    expect(sql).toContain("s.document_id = d.id");
    expect(sql).toContain("s.user_id = ?");
    expect(values).toContain("user-2");
  });
});
