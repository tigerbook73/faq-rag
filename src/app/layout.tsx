import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import type { InitialAuthState } from "@/context/auth-context";
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

export const viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

async function getInitialAuthState(): Promise<InitialAuthState> {
  const headersList = await headers();
  const userId = headersList.get("x-auth-id");

  if (!userId) {
    return { isAuthenticated: false, role: null, email: null, id: null };
  }

  return {
    isAuthenticated: true,
    role: null,
    email: headersList.get("x-auth-email") ?? null,
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
