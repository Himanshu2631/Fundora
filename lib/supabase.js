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

      const getMockScores = () => {
        if (typeof window === "undefined") return [];
        try {
          return JSON.parse(localStorage.getItem("fundora-mock-scores") || "[]");
        } catch {
          return [];
        }
      };

      const saveMockScores = (scores) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-scores", JSON.stringify(scores));
      };

      const getMockCharities = () => {
        if (typeof window === "undefined") return [];
        try {
          const stored = localStorage.getItem("fundora-mock-charities");
          if (stored) return JSON.parse(stored);
          const seed = [
            {
              id: "CH-01",
              name: "Acres of Green",
              description: "Dedicated to restoring local woodland ecosystems, planting native broadleaf species, and protecting wildlife corridors from commercial fragmentation.",
              image_url: "/acres_of_green.png",
              featured: true,
              category: "Environment",
              impact: "7,400+ hectares of ancient forests protected this quarter.",
              auditor_score: "9.8",
              spending_ratio: "96.4%",
              raised: "$145,300"
            },
            {
              id: "CH-02",
              name: "Apex Water Initiative",
              description: "Engineering and installing long-lasting gravity-fed clean water systems, piping, and localized sand filters for remote mountain settlements.",
              image_url: "/apex_water.png",
              featured: false,
              category: "Clean Water",
              impact: "Direct access filtration installed for 12,000 villagers.",
              auditor_score: "9.9",
              spending_ratio: "98.1%",
              raised: "$98,400"
            },
            {
              id: "CH-03",
              name: "Empower Global Edu",
              description: "Onboarding and mentoring local educators to launch coding clubs, STEM circles, and advanced physics workshops for girls in developing rural centers.",
              image_url: "/empower_edu.png",
              featured: false,
              category: "Education",
              impact: "Coding and engineering fellowships for 340 women in STEM.",
              auditor_score: "9.7",
              spending_ratio: "95.5%",
              raised: "$112,000"
            },
            {
              id: "CH-04",
              name: "BioGen Health Corps",
              description: "Equipping mobile clinical vans with state-of-the-art diagnostics and basic medical supplies to deliver pediatric checkups and vaccine clinics to low-income populations.",
              image_url: "/biogen_health.png",
              featured: false,
              category: "Healthcare",
              impact: "Mobile clinic deployments to 8 underserved regions.",
              auditor_score: "9.5",
              spending_ratio: "94.2%",
              raised: "$67,200"
            }
          ];
          localStorage.setItem("fundora-mock-charities", JSON.stringify(seed));
          return seed;
        } catch {
          return [];
        }
      };

      return {
        select: (fields) => {
          let matchedData = [];
          if (table === "profiles") {
            const rawSession = getCookie("fundora-mock-session");
            if (rawSession) {
              try {
                const session = JSON.parse(rawSession);
                matchedData = [{
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata.full_name,
                  role: session.role,
                  created_at: new Date().toISOString()
                }];
              } catch {}
            }
          } else if (table === "subscriptions") {
            matchedData = getMockSubscriptions();
          } else if (table === "scores") {
            matchedData = getMockScores();
            matchedData.sort((a, b) => {
              const dateA = new Date(a.score_date);
              const dateB = new Date(b.score_date);
              if (dateA - dateB !== 0) return dateB - dateA;
              return new Date(b.created_at) - new Date(a.created_at);
            });
          } else if (table === "charities") {
            matchedData = getMockCharities();
          }

          const makeChain = (data) => {
            const chain = {
              eq: (field, value) => {
                const filtered = data.filter(item => item[field] === value);
                return makeChain(filtered);
              },
              order: (sortField, sortOptions) => {
                const sorted = [...data].sort((a, b) => {
                  if (sortField === "created_at" || sortField === "score_date") {
                    return new Date(b[sortField]) - new Date(a[sortField]);
                  }
                  return 0;
                });
                return makeChain(sorted);
              },
              limit: (limitVal) => {
                return makeChain(data.slice(0, limitVal));
              },
              maybeSingle: async () => ({ data: data[0] || null, error: null }),
              single: async () => ({ data: data[0] || null, error: data[0] ? null : { message: "Not found" } }),
              then: async (resolve) => resolve({ data, error: null })
            };
            return chain;
          };

          return makeChain(matchedData);
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
          } else if (table === "scores") {
            const srs = getMockScores();
            const newScore = {
              id: "mock-score-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              score: parseInt(data.score, 10),
              score_date: data.score_date,
              created_at: new Date().toISOString()
            };
            srs.push(newScore);
            saveMockScores(srs);

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newScore, error: null }),
                  maybeSingle: async () => ({ data: newScore, error: null }),
                  then: async (resolve) => resolve({ data: [newScore], error: null })
                };
              },
              single: async () => ({ data: newScore, error: null }),
              maybeSingle: async () => ({ data: newScore, error: null }),
              then: async (resolve) => resolve({ data: [newScore], error: null })
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
              } else if (table === "scores") {
                const srs = getMockScores();
                const idx = srs.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  const merged = { ...srs[idx], ...updates };
                  if (updates.score !== undefined) {
                    merged.score = parseInt(updates.score, 10);
                  }
                  srs[idx] = merged;
                  saveMockScores(srs);
                  updatedSub = srs[idx];
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
        },
        delete: () => {
          return {
            eq: (field, value) => {
              if (table === "scores") {
                const srs = getMockScores();
                const updated = srs.filter(s => s[field] !== value);
                saveMockScores(updated);
              }
              return {
                then: async (resolve) => resolve({ data: null, error: null })
              };
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
