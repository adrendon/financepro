import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/panel";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.id) {
      const metadata = (user.user_metadata || {}) as Record<string, string | undefined>;
      const fullName =
        metadata.full_name ||
        metadata.name ||
        metadata.user_name ||
        metadata.preferred_username ||
        null;
      const email = user.email || metadata.email || null;
      const avatarUrl = metadata.avatar_url || null;

      await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          email,
          avatar_url: avatarUrl,
        });
    }
  }

  const origin = requestUrl.origin;
  const safeNext = next.startsWith("/") ? next : "/panel";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
