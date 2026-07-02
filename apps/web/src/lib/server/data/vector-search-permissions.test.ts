/**
 * @test-file   vectorSearch
 * @description validates SQL filters for embedding model isolation and status gating
 * @ai-generated
 * @reviewed-by (!HUMAN EDIT ONLY):
 */

const mockQueryRawUnsafe = jest.fn();

jest.mock("@/lib/server/db/client", () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => mockQueryRawUnsafe(...args),
  },
}));

import { vectorSearch } from "@/lib/server/retrieval/vector-search";

/**
 * @test-suite  vectorSearch SQL filters
 * @target      embedding model isolation and indexed-status filter
 * @strategy    unit, prisma.$queryRawUnsafe mocked
 * @cases
 *   - [PASS] filters by openai embedding model when model is "text-embedding-3-small"
 *   - [PASS] filters by bge-m3 or null when model is "bge-m3"
 *   - [PASS] always includes d.status = 'indexed' filter
 *   - [PASS] does not include ownership filter
 */
describe("vectorSearch SQL filters", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRawUnsafe.mockResolvedValue([]);
  });

  it('filters by openai embedding model when model is "text-embedding-3-small"', async () => {
    await vectorSearch([0.1, 0.2], 5, "text-embedding-3-small");

    const [sql, , , model] = mockQueryRawUnsafe.mock.calls[0] as [string, unknown, unknown, string];
    expect(sql).toContain("d.embedding_model = $3");
    expect(model).toBe("text-embedding-3-small");
  });

  it('filters by bge-m3 or null when model is "bge-m3"', async () => {
    await vectorSearch([0.1, 0.2], 5, "bge-m3");

    const [sql, , , model] = mockQueryRawUnsafe.mock.calls[0] as [string, unknown, unknown, string];
    expect(sql).toContain("d.embedding_model = $3");
    expect(sql).toContain("d.embedding_model IS NULL");
    expect(model).toBe("bge-m3");
  });

  it("always includes d.status = 'indexed' filter", async () => {
    await vectorSearch([0.1, 0.2], 5, "bge-m3");

    const [sql] = mockQueryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).toContain("d.status = 'indexed'");
  });

  it("does not include ownership filter", async () => {
    await vectorSearch([0.1, 0.2], 5, "openai");

    const [sql] = mockQueryRawUnsafe.mock.calls[0] as [string, ...unknown[]];
    expect(sql).not.toContain("owner_user_id");
    expect(sql).not.toContain("visibility");
  });
});
