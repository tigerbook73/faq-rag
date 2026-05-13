import { prisma } from "@/lib/server/db/client";

type UserRole = "user" | "admin";

export async function listUsers() {
  return prisma.userProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          documents: true,
          sessions: true,
          publicDocumentSelections: true,
        },
      },
    },
  });
}

export async function createUserProfile(input: { id: string; email: string; role?: UserRole }) {
  return prisma.userProfile.create({
    data: {
      id: input.id,
      email: input.email,
      role: input.role ?? "user",
    },
  });
}

export async function getUserProfile(userId: string) {
  return prisma.userProfile.findUnique({ where: { id: userId } });
}
