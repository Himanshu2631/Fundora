import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Strict environment variable validation
if (url === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is undefined. Please verify environment variable loading in your .env.local file.");
}
if (anonKey === undefined) {
  throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is undefined. Please verify environment variable loading in your .env.local file.");
}

const isPlaceholder = 
  url === "https://placeholder.supabase.co" || 
  anonKey === "placeholder-anon-key" || 
  !url || 
  !anonKey;

const createMockServer = (cookieStore) => {
  return {
    auth: {
      getSession: async () => {
        const rawSession = cookieStore.get("fundora-mock-session")?.value;
        if (rawSession) {
          try {
            const session = JSON.parse(rawSession);
            return { data: { session }, error: null };
          } catch {
            return { data: { session: null }, error: null };
          }
        }
        return { data: { session: null }, error: null };
      },
      getUser: async () => {
        const rawSession = cookieStore.get("fundora-mock-session")?.value;
        if (rawSession) {
          try {
            const session = JSON.parse(rawSession);
            return { data: { user: session.user }, error: null };
          } catch {
            return { data: { user: null }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      }
    },
    from: (table) => {
      return {
        select: (fields) => {
          return {
            eq: (field, value) => {
              return {
                single: async () => {
                  if (table === "profiles") {
                    const rawSession = cookieStore.get("fundora-mock-session")?.value;
                    if (rawSession) {
                      try {
                        const session = JSON.parse(rawSession);
                        if (session.user.id === value) {
                          return {
                            data: {
                              id: session.user.id,
                              email: session.user.email,
                              full_name: session.user.user_metadata.full_name,
                              role: session.role,
                              created_at: new Date().toISOString()
                            },
                            error: null
                          };
                        }
                      } catch {}
                    }
                  }
                  return { data: null, error: { message: "Profile not found" } };
                }
              };
            }
          };
        }
      };
    }
  };
};

export const createServer = async () => {
  const cookieStore = await cookies();

  if (isPlaceholder) {
    return createMockServer(cookieStore);
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
};
