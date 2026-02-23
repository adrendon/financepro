import AppHomeView from "@/components/AppHomeView";
import { createClient } from "@/utils/supabase/server";

export default async function PanelPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AppHomeView userId={user?.id ?? null} />;
}
