import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_ROUTES = new Set(["/", "/login", "/reset-password", "/terminos", "/privacidad", "/soporte", "/auth/callback"]);

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.includes("auth-token") || name.includes("sb-"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.has(pathname);

  const hasAuthCookie = hasSupabaseAuthCookie(request);

  if (pathname === "/" && hasAuthCookie) {
    const panelUrl = new URL("/panel", request.url);
    return NextResponse.rewrite(panelUrl);
  }

  if (isPublic && pathname !== "/login") {
    return NextResponse.next({ request });
  }

  if (!isPublic && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
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

  let user: { id: string; app_metadata?: { role?: string } } | null = null;

  try {
    const userResult = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500)),
    ]);

    if (userResult && "data" in userResult) {
      user = (userResult.data.user as { id: string; app_metadata?: { role?: string } } | null) ?? null;
    }
  } catch {
    user = null;
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  if (!user && !isPublic && !hasAuthCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const needsProfileCheck = pathname.startsWith("/roles") || pathname.startsWith("/admin");

  let profile: { role: string | null } | null = null;
  if (user && needsProfileCheck) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    profile = data || null;
  }

  if (user && (pathname.startsWith("/roles") || pathname.startsWith("/admin"))) {
    const appRole = user.app_metadata?.role;
    if (appRole !== "admin" && profile?.role !== "admin") {
      return NextResponse.redirect(new URL("/panel", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
