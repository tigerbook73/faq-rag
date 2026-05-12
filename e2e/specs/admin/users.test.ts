import { test, expect } from "../../fixtures/auth";

test.describe("multi-user admin operations", () => {
  test("admin can list users, delete a user, and cannot delete self", async ({ adminPage }) => {
    const usersRes = await adminPage.request.get("/api/admin/users");
    expect(usersRes.status()).toBe(200);
    const users = (await usersRes.json()) as {
      items: Array<{ id: string; email: string; role: "user" | "admin" }>;
    };
    expect(users.items.some((user) => user.email === "user1@test.com")).toBe(true);
    expect(users.items.some((user) => user.email === "user2@test.com")).toBe(true);

    const suffix = crypto.randomUUID();
    const email = `e2e-delete-${suffix}@test.com`;
    const password = "temp@123";
    const createRes = await adminPage.request.post("/api/admin/users", {
      data: { email, password },
    });
    expect(createRes.status()).toBe(201);
    const created = (await createRes.json()) as { id: string; email: string };
    expect(created.email).toBe(email);

    const deleteRes = await adminPage.request.delete(`/api/admin/users/${created.id}`);
    expect(deleteRes.status()).toBe(204);

    const signinRes = await adminPage.request.post("/api/auth/signin", {
      data: { email, password },
    });
    expect(signinRes.ok()).toBe(false);

    const meRes = await adminPage.request.get("/api/auth/me");
    expect(meRes.status()).toBe(200);
    const me = (await meRes.json()) as { id: string; email: string };
    expect(me.email).toBe("admin@test.com");

    const selfDeleteRes = await adminPage.request.delete(`/api/admin/users/${me.id}`);
    expect(selfDeleteRes.status()).toBe(400);
  });
});
