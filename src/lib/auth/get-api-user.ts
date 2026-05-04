import type { User } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthResult = {
  data: { user: User | null };
  error: unknown;
};

type SupabaseAuthClient = {
  auth: {
    getUser: (jwt?: string) => Promise<AuthResult>;
  };
};

export type ApiUser = User;

export type GetApiUserDeps = {
  createClient?: () => Promise<SupabaseAuthClient> | SupabaseAuthClient;
};

export function getBearerToken(headers: Headers): string | null {
  const authHeader = headers.get("authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1]?.trim();
  return token ? token : null;
}

export function hasBearerAuthHeader(headers: Headers): boolean {
  return headers.get("authorization")?.trim().toLowerCase().startsWith("bearer") ?? false;
}

export async function getApiUser(request: Pick<Request, "headers">, deps: GetApiUserDeps = {}): Promise<ApiUser | null> {
  const createClient = deps.createClient ?? createSupabaseServerClient;
  const supabase = await createClient();
  const bearerToken = getBearerToken(request.headers);

  if (bearerToken) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(bearerToken);
    return error ? null : user;
  }

  if (hasBearerAuthHeader(request.headers)) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error ? null : user;
}
