const mockGetApiUser = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const sessionId = "11111111-1111-4111-8111-111111111111";

jest.mock("@/lib/auth/get-api-user", () => ({
  getApiUser: (...args: unknown[]) => mockGetApiUser(...args),
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    session: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}));

import { GET, OPTIONS, POST } from "./route";
import type { NextRequest } from "next/server";

function request(body?: unknown): NextRequest {
  return new Request("http://localhost/api/sessions", {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json", Origin: "http://localhost:8081" } : { Origin: "http://localhost:8081" },
    body: body ? JSON.stringify(body) : undefined,
  }) as NextRequest;
}

describe("/api/sessions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an authenticated API user", async () => {
    mockGetApiUser.mockResolvedValue(null);

    const res = await GET(request());

    expect(res.status).toBe(401);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it("responds to CORS preflight without authentication", () => {
    const res = OPTIONS(request());

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081");
    expect(mockGetApiUser).not.toHaveBeenCalled();
  });

  it("lists only sessions owned by the API user", async () => {
    mockGetApiUser.mockResolvedValue({ id: "user-a" });
    mockFindMany.mockResolvedValue([]);

    const res = await GET(request());

    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081");
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
      }),
    );
  });

  it("creates sessions owned by the API user", async () => {
    mockGetApiUser.mockResolvedValue({ id: "user-a" });
    mockCreate.mockResolvedValue({ id: sessionId, userId: "user-a", title: "New Chat" });

    const res = await POST(request({ id: sessionId, title: "New Chat" }));

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { id: sessionId, userId: "user-a", title: "New Chat" },
    });
  });
});
