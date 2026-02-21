import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set(["/login", "/reset-password", "/terminos", "/privacidad", "/soporte", "/auth/callback"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.has(pathname);

  if (isPublic) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const needsProfileCheck =
    pathname.startsWith("/roles") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/informes");

  let profile: { role: string | null; subscription_tier: string | null } | null = null;
  if (user && needsProfileCheck) {
    const { data } = await supabase
      .from("profiles")
      .select("role, subscription_tier")
      .eq("id", user.id)
      .maybeSingle();
    profile = data || null;
  }

  if (user && (pathname.startsWith("/roles") || pathname.startsWith("/admin"))) {
    const appRole = user.app_metadata?.role;
    if (appRole !== "admin" && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (
    user &&
    pathname.startsWith("/informes") &&
    profile?.role !== "admin" &&
    profile?.subscription_tier !== "premium"
  ) {
    const upgradeUrl = new URL("/upgrade", request.url);
    upgradeUrl.searchParams.set("feature", "reports");
    return NextResponse.redirect(upgradeUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
