export const DEFAULT_ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";

export const DEFAULT_DEMO_USERS = [
  { id: DEFAULT_ADMIN_USER_ID, email: "admin@test.com", password: "admin@123", role: "admin" },
  { id: "00000000-0000-4000-8000-000000000002", email: "user1@test.com", password: "user1@123", role: "user" },
  { id: "00000000-0000-4000-8000-000000000003", email: "user2@test.com", password: "user2@123", role: "user" },
] as const;
