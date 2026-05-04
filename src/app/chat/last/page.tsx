"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getLastChatHref } from "@/lib/last-chat";

export default function LastChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getLastChatHref());
  }, [router]);

  return null;
}
