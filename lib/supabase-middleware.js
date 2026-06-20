import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Strict environment variable validation
if (urlEnv === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is undefined. Please verify environment variable loading in your .env.local file.");
}
if (anonKeyEnv === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is undefined. Please verify environment variable loading in your .env.local file.");
}

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
  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/admin");

  // Redirect users already signed in away from login/signup to dashboard
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users trying to access protected paths to login
  if (!user && (isDashboardRoute || isAdminRoute)) {
    return NextResponse.redirect(new URL("/login", request.url));
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
