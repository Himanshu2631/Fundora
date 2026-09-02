import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const sanitizeEnv = (val) => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

const urlEnv = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const anonKeyEnv = sanitizeEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  ""
);

const isPlaceholder = 
  urlEnv === "https://placeholder.supabase.co" || 
  anonKeyEnv === "placeholder-anon-key" || 
  anonKeyEnv.startsWith("sb_publishable_") ||
  !urlEnv || 
  !anonKeyEnv;

// Strict timeout wrapper to ensure edge middleware never hangs or hits Vercel 504 timeouts
const withTimeout = (promise, ms = 2000) => {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Supabase middleware operation timed out")), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let user = null;
  let role = "user";

  const getMockSession = () => {
    const rawSession = request.cookies.get("fundora-mock-session")?.value;
    if (rawSession) {
      try {
        let session = null;
        try {
          session = JSON.parse(rawSession);
        } catch {
          session = JSON.parse(decodeURIComponent(rawSession));
        }
        if (session) {
          return { user: session.user || null, role: session.role || "user" };
        }
      } catch {
        return { user: null, role: "user" };
      }
    }
    return { user: null, role: "user" };
  };

  if (isPlaceholder) {
    const mock = getMockSession();
    user = mock.user;
    role = mock.role;
  } else {
    try {
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

      // Wrap Supabase network calls with a 2-second timeout boundary
      const authResult = await withTimeout(supabase.auth.getUser(), 2000).catch((err) => {
        console.warn("[Middleware] Supabase auth timed out or failed:", err.message);
        return { data: { user: null } };
      });

      user = authResult?.data?.user || null;

      if (user) {
        const profileResult = await withTimeout(
          supabase.from("profiles").select("role").eq("id", user.id).single(),
          1500
        ).catch(() => ({ data: null }));

        role = profileResult?.data?.role || "user";
      } else {
        // Fallback to check mock session cookie if Supabase user is null
        const mock = getMockSession();
        if (mock.user) {
          user = mock.user;
          role = mock.role;
        }
      }
    } catch (err) {
      console.warn("[Middleware] Edge session resolution failed:", err.message);
      // Fallback to mock session if Supabase fails/times out
      const mock = getMockSession();
      user = mock.user;
      role = mock.role;
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

