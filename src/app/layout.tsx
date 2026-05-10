import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { InitialAuthState } from "@/context/auth-context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FAQ RAG",
  description: "Knowledge base Q&A powered by RAG",
};

async function getInitialAuthState(): Promise<InitialAuthState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return {
    isAuthenticated: Boolean(session),
    role: null,
    email: session?.user.email ?? null,
    id: null,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialAuthState = await getInitialAuthState();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full flex-col overflow-hidden">
        <Providers initialAuthState={initialAuthState}>{children}</Providers>
      </body>
    </html>
  );
}
