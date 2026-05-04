const mockGetApiUser = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDeleteManyMessages = jest.fn();
const mockCreateManyMessages = jest.fn();
const mockDeleteManySessions = jest.fn();
const mockTransaction = jest.fn();

jest.mock("@/lib/auth/get-api-user", () => ({
  getApiUser: (...args: unknown[]) => mockGetApiUser(...args),
}));

jest.mock("@/lib/db/client", () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    session: {
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
      deleteMany: (...args: unknown[]) => mockDeleteManySessions(...args),
    },
  },
}));

import { DELETE, GET, PATCH } from "./route";
import type { NextRequest } from "next/server";

function params(id = "session-1") {
  return { params: Promise.resolve({ id }) };
}

function request(method: string, body?: unknown): NextRequest {
  return new Request(`http://localhost/api/sessions/session-1`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }) as NextRequest;
}

describe("/api/sessions/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTransaction.mockImplementation((callback) =>
      callback({
        session: {
          findUnique: mockFindUnique,
          update: mockUpdate,
          create: mockCreate,
          findFirst: mockFindFirst,
        },
        sessionMessage: {
          deleteMany: mockDeleteManyMessages,
          createMany: mockCreateManyMessages,
        },
      }),
    );
  });

  it("requires an authenticated API user", async () => {
    mockGetApiUser.mockResolvedValue(null);

    const res = await GET(request("GET"), params());

    expect(res.status).toBe(401);
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it("reads only sessions owned by the API user", async () => {
    mockGetApiUser.mockResolvedValue({ id: "user-a" });
    mockFindFirst.mockResolvedValue(null);

    const res = await GET(request("GET"), params("session-1"));

    expect(res.status).toBe(404);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "session-1", userId: "user-a" },
      }),
    );
  });

  it("rejects PATCH when the session belongs to another user", async () => {
    mockGetApiUser.mockResolvedValue({ id: "user-a" });
    mockFindUnique.mockResolvedValue({ userId: "user-b" });

    const res = await PATCH(request("PATCH", { title: "Updated" }), params("session-1"));

    expect(res.status).toBe(404);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockDeleteManyMessages).not.toHaveBeenCalled();
  });

  it("creates new sessions with the API user as owner", async () => {
    mockGetApiUser.mockResolvedValue({ id: "user-a" });
    mockFindUnique.mockResolvedValue(null);
    mockFindFirst.mockResolvedValue({ id: "session-1", userId: "user-a", messages: [] });

    const res = await PATCH(request("PATCH", { title: "Created" }), params("session-1"));

    expect(res.status).toBe(200);
    expect(mockCreate).toHaveBeenCalledWith({
      data: { id: "session-1", userId: "user-a", title: "Created" },
    });
  });

  it("deletes only sessions owned by the API user", async () => {
    mockGetApiUser.mockResolvedValue({ id: "user-a" });
    mockDeleteManySessions.mockResolvedValue({ count: 0 });

    const res = await DELETE(request("DELETE"), params("session-1"));

    expect(res.status).toBe(404);
    expect(mockDeleteManySessions).toHaveBeenCalledWith({ where: { id: "session-1", userId: "user-a" } });
  });
});
