import { createClient } from "@/utils/supabase/server";
import { SidebarClient, SidebarProfile } from "./SidebarClient";

export async function Sidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: SidebarProfile | null = null;

  if (user?.id) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, role, subscription_tier, email")
      .eq("id", user.id)
      .maybeSingle();

    profile = (data as SidebarProfile | null) || null;
  }

  return <SidebarClient initialProfile={profile} />;
}
