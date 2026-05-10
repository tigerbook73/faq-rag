import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authErrorResponse, validationErrorResponse } from "@/lib/auth/api";
import { getProfile } from "@/lib/auth/helpers";
import { resolvePostLoginRedirect } from "@/lib/route-policy";

const SignInInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  from: z.string().optional().nullable(),
});

function supabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is not set");
  return url;
}

function supabaseAnonKey() {
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error("SUPABASE_ANON_KEY is not set");
  return key;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = SignInInputSchema.safeParse(body);
  if (!parsed.success) return validationErrorResponse(parsed.error);

  const authClient = createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await authClient.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user || !data.session?.access_token || !data.session.refresh_token) {
    return NextResponse.json({ error: error?.message ?? "Invalid email or password" }, { status: 401 });
  }

  try {
    const profile = await getProfile(data.user.id);
    let response: NextResponse = NextResponse.json({
      redirectTo: resolvePostLoginRedirect(profile.role, parsed.data.from),
    });
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });

    if (sessionError) {
      response = NextResponse.json({ error: "Unable to create session" }, { status: 401 });
      await supabase.auth.signOut();
      return response;
    }

    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
