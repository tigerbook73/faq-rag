"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { lastChat } from "@/lib/last-chat";

export default function LastChatPage() {
  const router = useRouter();

  useEffect(() => {
    const lastId = lastChat.get();
    const target = lastId ? `/chat/${lastId}` : "/chat/new";
    router.replace(target);
  }, [router]);

  return null;
}
