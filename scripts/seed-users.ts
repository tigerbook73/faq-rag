/**
 * Seed default demo users for the multi-user feature.
 *
 * Usage:
 *   pnpm users:seed        Seed local/default environment (.env + .env.development.local)
 *   pnpm users:seed:prod   Seed linked/prod environment (.env + .env.cloud)
 */

import { config as loadEnv } from "dotenv";
import { createClient, type User } from "@supabase/supabase-js";
import { PrismaClient, type UserRole } from "../src/generated/prisma";
import { DEFAULT_ADMIN_USER_ID, DEFAULT_DEMO_USERS } from "../src/lib/server/default-users";

interface SeedUser {
  id: string;
  email: string;
  password: string;
  role: UserRole;
}

const DEFAULT_USERS: SeedUser[] = DEFAULT_DEMO_USERS.map((user) => ({ ...user, role: user.role as UserRole }));

function loadEnvironment() {
  const isProd = process.argv.includes("--prod");
  loadEnv({ path: ".env", override: false });
  loadEnv({ path: isProd ? ".env.cloud" : ".env.development.local", override: true });
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

interface SupabaseAuthAdmin {
  auth: {
    admin: {
      listUsers: (params: {
        page: number;
        perPage: number;
      }) => Promise<{ data: { users: User[] }; error: Error | null }>;
    };
  };
}

async function listAuthUsersByEmail(supabase: SupabaseAuthAdmin): Promise<Map<string, User>> {
  const users = new Map<string, User>();
  const perPage = 1000;
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    for (const user of data.users) {
      if (user.email) users.set(user.email.toLowerCase(), user);
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return users;
}

async function upsertProfile(prisma: PrismaClient, user: SeedUser, authUserId: string) {
  await prisma.userProfile.upsert({
    where: { id: authUserId },
    update: { email: user.email, role: user.role },
    create: { id: authUserId, email: user.email, role: user.role },
  });
}

async function syncAdminProfile(prisma: PrismaClient, user: SeedUser, authUserId: string) {
  if (authUserId === DEFAULT_ADMIN_USER_ID) {
    await upsertProfile(prisma, user, authUserId);
    return;
  }

  const placeholder = await prisma.userProfile.findUnique({ where: { id: DEFAULT_ADMIN_USER_ID } });
  if (placeholder) {
    await prisma.userProfile.update({
      where: { id: DEFAULT_ADMIN_USER_ID },
      data: { id: authUserId, email: user.email, role: user.role },
    });
    return;
  }

  await upsertProfile(prisma, user, authUserId);
}

async function main() {
  loadEnvironment();

  const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
  const prisma = new PrismaClient({ log: ["error"] });

  try {
    const authUsersByEmail = await listAuthUsersByEmail(supabase);

    for (const user of DEFAULT_USERS) {
      const existing = authUsersByEmail.get(user.email.toLowerCase());
      let authUserId = existing?.id;

      if (authUserId) {
        const { error } = await supabase.auth.admin.updateUserById(authUserId, {
          password: user.password,
          email_confirm: true,
          user_metadata: { role: user.role },
          app_metadata: { role: user.role },
        });
        if (error) throw error;
        console.log(`Updated auth user ${user.email} (${authUserId})`);
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          id: user.id,
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: { role: user.role },
          app_metadata: { role: user.role },
        });
        if (error) throw error;
        if (!data.user) throw new Error(`Supabase did not return a user for ${user.email}`);
        authUserId = data.user.id;
        console.log(`Created auth user ${user.email} (${authUserId})`);
      }

      if (user.id === DEFAULT_ADMIN_USER_ID) {
        await syncAdminProfile(prisma, user, authUserId);
      } else {
        await upsertProfile(prisma, user, authUserId);
      }
      console.log(`Synced profile ${user.email} as ${user.role}`);
    }

    console.log("Default user seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
