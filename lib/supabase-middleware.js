import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const sanitizeEnv = (val) => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

const urlEnv = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const anonKeyEnv = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

const isPlaceholder = 
  urlEnv === "https://placeholder.supabase.co" || 
  anonKeyEnv === "placeholder-anon-key" || 
  !urlEnv || 
  !anonKeyEnv;

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let user = null;
  let role = "user";

  if (isPlaceholder) {
    const rawSession = request.cookies.get("fundora-mock-session")?.value;
    if (rawSession) {
      try {
        const session = JSON.parse(rawSession);
        user = session.user;
        role = session.role;
      } catch {
        user = null;
      }
    }
  } else {
    const supabase = createServerClient(urlEnv, anonKeyEnv, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const { data } = await supabase.auth.getUser();
    user = data?.user || null;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      role = profile?.role || "user";
    }
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Path definition checks
  const isAuthRoute = pathname === "/login" || pathname === "/signup" || pathname === "/admin-login" || pathname === "/register-subscriber/login";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = (pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin-login";

  // Redirect users already signed in away from login/signup
  if (user && isAuthRoute) {
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Redirect unauthenticated users trying to access protected paths to login
  if (!user && (isDashboardRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated admins attempting to access regular user dashboard
  if (user && role === "admin" && isDashboardRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Role validation for the admin panel
  if (user && isAdminRoute) {
    if (role !== "admin") {
      // Redirect regular users attempting to access admin routes to dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return supabaseResponse;
}
