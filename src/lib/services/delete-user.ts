import { prisma } from "@/lib/db/client";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { deleteUploadedFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

export async function deleteUserAccount(userId: string) {
  const user = await prisma.userProfile.findUnique({
    where: { id: userId },
    include: {
      documents: { select: { id: true, fileRef: true } },
    },
  });
  if (!user) return null;

  // 1. Delete storage files first — continue even if some fail
  await Promise.all(
    user.documents
      .filter((document) => !!document.fileRef)
      .map((document) =>
        deleteUploadedFile(document.fileRef as string).catch((error) => {
          logger.warn({ error, userId, documentId: document.id, fileRef: document.fileRef }, "user storage delete failed");
        }),
      ),
  );

  // 2. Delete Supabase Auth user — log but continue so DB is always cleaned up
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    logger.warn({ error, userId }, "supabase auth user delete failed");
  }

  // 3. Delete UserProfile last — cascades to sessions, documents, chunks, selections
  await prisma.userProfile.delete({ where: { id: userId } });

  return user;
}
