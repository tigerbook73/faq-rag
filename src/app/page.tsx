import { redirect } from "next/navigation";
import { AboutProjectPage } from "@/components/about/AboutProjectPage";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) redirect("/chat/last");

  return <AboutProjectPage />;
}
