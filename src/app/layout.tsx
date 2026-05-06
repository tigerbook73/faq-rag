import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/client";
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user
    ? await prisma.userProfile.findUnique({
        where: { id: user.id },
        select: { role: true },
      })
    : null;
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-dvh antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers isAuthenticated={!!user} role={profile?.role ?? null}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
