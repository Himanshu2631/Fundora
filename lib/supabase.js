import { createBrowserClient } from "@supabase/ssr";

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

// Client-side Mock Cookie helpers
const getCookie = (name) => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
};

const setCookie = (name, value, days = 7) => {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
};

const deleteCookie = (name) => {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax`;
};

const getMockUsers = () => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("fundora-mock-users") || "[]");
  } catch {
    return [];
  }
};

const saveMockUser = (user) => {
  if (typeof window === "undefined") return;
  const users = getMockUsers();
  users.push(user);
  localStorage.setItem("fundora-mock-users", JSON.stringify(users));
};

// Global subscription list for client mock
const authSubscribers = new Set();

const createMockClient = () => {
  console.warn("⚠️ Fundora Client: Using Mock Supabase client due to placeholder credentials.");
  
  return {
    auth: {
      getSession: async () => {
        const rawSession = getCookie("fundora-mock-session");
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
        const rawSession = getCookie("fundora-mock-session");
        if (rawSession) {
          try {
            const session = JSON.parse(rawSession);
            return { data: { user: session.user }, error: null };
          } catch {
            return { data: { user: null }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        const users = getMockUsers();
        const found = users.find(u => u.email === email && u.password === password);
        if (!found) {
          return { data: { user: null, session: null }, error: { message: "Invalid email or password" } };
        }
        
        const role = email.includes("admin") || email.startsWith("admin@") ? "admin" : "user";
        const session = {
          user: {
            id: found.id,
            email: found.email,
            user_metadata: { full_name: found.full_name }
          },
          role,
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        
        setCookie("fundora-mock-session", JSON.stringify(session));
        
        // Notify subscribers
        authSubscribers.forEach(cb => cb("SIGNED_IN", session));
        
        return { data: { user: session.user, session }, error: null };
      },
      signUp: async ({ email, password, options }) => {
        const users = getMockUsers();
        const exists = users.some(u => u.email === email);
        if (exists) {
          return { data: { user: null, session: null }, error: { message: "User already exists" } };
        }
        
        const fullName = options?.data?.full_name || "Mock User";
        const newUser = {
          id: "mock-uid-" + Math.random().toString(36).substring(2, 15),
          email,
          password,
          full_name: fullName
        };
        
        saveMockUser(newUser);
        
        const role = email.includes("admin") || email.startsWith("admin@") ? "admin" : "user";
        const session = {
          user: {
            id: newUser.id,
            email: newUser.email,
            user_metadata: { full_name: newUser.full_name }
          },
          role,
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600
        };
        
        setCookie("fundora-mock-session", JSON.stringify(session));
        
        authSubscribers.forEach(cb => cb("SIGNED_IN", session));
        
        return { data: { user: session.user, session }, error: null };
      },
      updateUser: async (attributes) => {
        const rawSession = getCookie("fundora-mock-session");
        if (!rawSession) {
          return { data: { user: null }, error: { message: "No active session" } };
        }
        try {
          const session = JSON.parse(rawSession);
          if (attributes.password) {
            const users = getMockUsers();
            const idx = users.findIndex(u => u.id === session.user.id);
            if (idx !== -1) {
              users[idx].password = attributes.password;
              localStorage.setItem("fundora-mock-users", JSON.stringify(users));
            }
          }
          if (attributes.data) {
            session.user.user_metadata = {
              ...session.user.user_metadata,
              ...attributes.data
            };
            setCookie("fundora-mock-session", JSON.stringify(session));
            authSubscribers.forEach(cb => cb("USER_UPDATED", session));
          }
          return { data: { user: session.user }, error: null };
        } catch (err) {
          return { data: { user: null }, error: { message: err.message } };
        }
      },
      signOut: async () => {
        deleteCookie("fundora-mock-session");
        deleteCookie("fundora-mock-subscription");
        authSubscribers.forEach(cb => cb("SIGNED_OUT", null));
        return { error: null };
      },
      onAuthStateChange: (callback) => {
        authSubscribers.add(callback);
        
        // Fire initial callback if cookie exists
        const rawSession = getCookie("fundora-mock-session");
        if (rawSession) {
          try {
            const session = JSON.parse(rawSession);
            callback("INITIAL_SESSION", session);
          } catch {
            callback("INITIAL_SESSION", null);
          }
        } else {
          callback("INITIAL_SESSION", null);
        }
        
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authSubscribers.delete(callback);
              }
            }
          }
        };
      }
    },
    from: (table) => {
      const getMockSubscriptions = () => {
        if (typeof window === "undefined") return [];
        try {
          return JSON.parse(localStorage.getItem("fundora-mock-subscriptions") || "[]");
        } catch {
          return [];
        }
      };

      const saveMockSubscriptions = (subs) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-subscriptions", JSON.stringify(subs));
      };

      return {
        select: (fields) => {
          return {
            eq: (field, value) => {
              let matchedData = [];
              if (table === "profiles") {
                const rawSession = getCookie("fundora-mock-session");
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
                const subs = getMockSubscriptions();
                matchedData = subs.filter(s => s[field] === value);
                matchedData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
        },
        insert: (data) => {
          if (table === "subscriptions") {
            const subs = getMockSubscriptions();
            const newSub = {
              id: "mock-sub-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              plan_type: data.plan_type,
              status: data.status,
              renewal_date: data.renewal_date,
              created_at: new Date().toISOString()
            };
            subs.push(newSub);
            saveMockSubscriptions(subs);
            setCookie("fundora-mock-subscription", JSON.stringify(newSub));

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newSub, error: null }),
                  maybeSingle: async () => ({ data: newSub, error: null }),
                  then: async (resolve) => resolve({ data: [newSub], error: null })
                };
              },
              single: async () => ({ data: newSub, error: null }),
              maybeSingle: async () => ({ data: newSub, error: null }),
              then: async (resolve) => resolve({ data: [newSub], error: null })
            };
            return chain;
          }
          return {
            select: () => ({
              single: async () => ({ data: null, error: null })
            })
          };
        },
        update: (updates) => {
          return {
            eq: (field, value) => {
              let updatedSub = null;
              if (table === "subscriptions") {
                const subs = getMockSubscriptions();
                const idx = subs.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  subs[idx] = { ...subs[idx], ...updates };
                  saveMockSubscriptions(subs);
                  updatedSub = subs[idx];
                  setCookie("fundora-mock-subscription", JSON.stringify(updatedSub));
                }
              }

              const chain = {
                select: () => {
                  return {
                    single: async () => ({ data: updatedSub, error: updatedSub ? null : { message: "Not found" } }),
                    maybeSingle: async () => ({ data: updatedSub, error: null }),
                    then: async (resolve) => resolve({ data: updatedSub ? [updatedSub] : [], error: null })
                  };
                },
                single: async () => ({ data: updatedSub, error: updatedSub ? null : { message: "Not found" } }),
                maybeSingle: async () => ({ data: updatedSub, error: null }),
                then: async (resolve) => resolve({ data: updatedSub ? [updatedSub] : [], error: null })
              };
              return chain;
            }
          };
        }
      };
    }
  };
};

export const createClient = () => {
  if (isPlaceholder) {
    return createMockClient();
  }
  
  return createBrowserClient(url, anonKey);
};
