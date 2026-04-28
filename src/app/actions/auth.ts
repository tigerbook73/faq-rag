"use server";
import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = { error?: string } | undefined;

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  const expectedUser = process.env.AUTH_USERNAME ?? "admin";
  const expectedPass = process.env.AUTH_PASSWORD;

  if (!expectedPass) {
    return { error: "AUTH_PASSWORD is not configured on the server." };
  }

  if (username !== expectedUser || password !== expectedPass) {
    return { error: "Invalid username or password." };
  }

  await createSession(username);
  const from = formData.get("from")?.toString();
  const dest = from && from.startsWith("/") && !from.startsWith("/auth") ? from : "/chat/new";
  redirect(dest);
}

export async function logout(): Promise<void> {
  await deleteSession();
  redirect("/auth/signin");
}
