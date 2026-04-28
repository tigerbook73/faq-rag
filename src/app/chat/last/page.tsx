"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLastChatId } from "@/lib/chat-storage";

export default function LastChatPage() {
  const router = useRouter();

  useEffect(() => {
    const lastId = getLastChatId();
    const target = lastId ? `/chat/${lastId}` : "/chat/new";
    router.replace(target);
  }, [router]);

  return null;
}
