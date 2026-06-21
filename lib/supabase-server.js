import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
              let matchedData = [];
              if (table === "profiles") {
                const rawSession = cookieStore.get("fundora-mock-session")?.value;
                if (rawSession) {
                  try {
                    const session = JSON.parse(rawSession);
                    if (session.user.id === value) {
                      matchedData = [{
                        id: session.user.id,
                        email: session.user.email,
                        full_name: session.user.user_metadata.full_name,
                        role: session.role,
                        created_at: new Date().toISOString()
                      }];
                    }
                  } catch {}
                }
              } else if (table === "subscriptions") {
                const rawSub = cookieStore.get("fundora-mock-subscription")?.value;
                if (rawSub) {
                  try {
                    const sub = JSON.parse(rawSub);
                    if (sub[field] === value) {
                      matchedData = [sub];
                    }
                  } catch {}
                }
              }

              const chain = {
                order: (sortField, sortOptions) => ({
                  limit: (limitVal) => ({
                    maybeSingle: async () => ({ data: matchedData[0] || null, error: null }),
                    single: async () => ({ data: matchedData[0] || null, error: matchedData[0] ? null : { message: "Not found" } }),
                    then: async (resolve) => resolve({ data: matchedData.slice(0, limitVal), error: null })
                  }),
                  maybeSingle: async () => ({ data: matchedData[0] || null, error: null }),
                  single: async () => ({ data: matchedData[0] || null, error: matchedData[0] ? null : { message: "Not found" } }),
                  then: async (resolve) => resolve({ data: matchedData, error: null })
                }),
                maybeSingle: async () => ({ data: matchedData[0] || null, error: null }),
                single: async () => ({ data: matchedData[0] || null, error: matchedData[0] ? null : { message: "Not found" } }),
                then: async (resolve) => resolve({ data: matchedData, error: null })
              };
              return chain;
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
