import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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
    const stored = localStorage.getItem("fundora-mock-users");
    if (stored) {
      return JSON.parse(stored);
    }
    // Seed default admin and user for local testing
    const seed = [
      {
        id: "mock-uid-admin",
        email: "admin@fundora.com",
        password: "admin",
        full_name: "Admin Demo"
      },
      {
        id: "mock-uid-user",
        email: "user@fundora.com",
        password: "user",
        full_name: "User Demo"
      }
    ];
    localStorage.setItem("fundora-mock-users", JSON.stringify(seed));
    return seed;
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
          let subs = JSON.parse(localStorage.getItem("fundora-mock-subscriptions") || "[]");
          const cookieVal = getCookie("fundora-mock-subscription");
          if (cookieVal) {
            try {
              const cookieSub = JSON.parse(cookieVal);
              const exists = subs.some(s => s.id === cookieSub.id || s.stripe_subscription_id === cookieSub.stripe_subscription_id);
              if (!exists) {
                subs.push(cookieSub);
                localStorage.setItem("fundora-mock-subscriptions", JSON.stringify(subs));
              }
            } catch (e) {
              console.warn("Failed to parse mock subscription cookie:", e);
            }
          }
          return subs;
        } catch {
          return [];
        }
      };

      const saveMockSubscriptions = (subs) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-subscriptions", JSON.stringify(subs));
      };

      const getMockPayments = () => {
        if (typeof window === "undefined") return [];
        try {
          let payments = JSON.parse(localStorage.getItem("fundora-mock-payments") || "[]");
          const cookieVal = getCookie("fundora-mock-payments");
          if (cookieVal) {
            try {
              const cookiePayments = JSON.parse(cookieVal);
              let updated = false;
              cookiePayments.forEach(p => {
                if (!payments.some(lp => lp.id === p.id || lp.stripe_invoice_id === p.stripe_invoice_id)) {
                  payments.push(p);
                  updated = true;
                }
              });
              if (updated) {
                localStorage.setItem("fundora-mock-payments", JSON.stringify(payments));
              }
            } catch (e) {
              console.warn("Failed to parse mock payments cookie:", e);
            }
          }
          return payments;
        } catch {
          return [];
        }
      };

      const saveMockPayments = (payments) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-payments", JSON.stringify(payments));
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
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.length > 0 && parsed[0].why_matters) return parsed;
          }
          const seed = [
            {
              id: "CH-01",
              name: "Acres of Green",
              description: "Dedicated to restoring local woodland ecosystems, planting native broadleaf species, and protecting wildlife corridors from commercial fragmentation.",
              why_matters: "Healthy woodlands act as natural carbon sinks, buffer regional temperature rises, regulate hydrological cycles, and preserve native biodiversity crucial to the local biosphere.",
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
              why_matters: "Direct clean water access eliminates heavy waterborne pathogens (cholera/dysentery), decreases child mortality rates, and enables girls to spend their days in schools instead of walking miles to carry river water.",
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
              why_matters: "STEM education is the single most effective social mobility vehicle, giving girls in resource-constrained communities high-demand logical and coding skills to secure high-paying technical careers.",
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
              why_matters: "Mobile clinic deployment provides preventative diagnostic healthcare to regions with zero medical facilities, catching severe illnesses early and preventing catastrophic emergency hospital debt.",
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

      const getMockSelections = () => {
        if (typeof window === "undefined") return [];
        try {
          return JSON.parse(localStorage.getItem("fundora-mock-selections") || "[]");
        } catch {
          return [];
        }
      };

      const saveMockSelections = (selections) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-selections", JSON.stringify(selections));
      };

      const getMockDraws = () => {
        if (typeof window === "undefined") return [];
        try {
          const stored = localStorage.getItem("fundora-mock-draws");
          if (stored) return JSON.parse(stored);
          const seed = [
            {
              id: "DR-42",
              title: "Patagonia Eco-Retreat",
              prize: "7-night luxury eco-retreat for 2",
              month: 6,
              year: 2026,
              draw_date: "2026-06-24",
              min_score: 50,
              sponsor: "Apex Corp Sustainability Fund",
              status: "active",
              winning_numbers: []
            },
            {
              id: "DR-43",
              title: "Custom Electric Cruiser",
              prize: "Limited-edition electric bicycle",
              month: 7,
              year: 2026,
              draw_date: "2026-07-01",
              min_score: 120,
              sponsor: "GreenRide Initiative",
              status: "upcoming",
              winning_numbers: []
            },
            {
              id: "DR-44",
              title: "STEM Fellowship Retreat",
              prize: "3-day tech innovation summit pass",
              month: 7,
              year: 2026,
              draw_date: "2026-07-15",
              min_score: 200,
              sponsor: "Empower Global Edu",
              status: "upcoming",
              winning_numbers: []
            }
          ];
          localStorage.setItem("fundora-mock-draws", JSON.stringify(seed));
          return seed;
        } catch {
          return [];
        }
      };

      const saveMockDraws = (draws) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-draws", JSON.stringify(draws));
      };

      const getMockDrawEntries = () => {
        if (typeof window === "undefined") return [];
        try {
          return JSON.parse(localStorage.getItem("fundora-mock-draw-entries") || "[]");
        } catch {
          return [];
        }
      };

      const saveMockDrawEntries = (entries) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-draw-entries", JSON.stringify(entries));
      };

      const getMockClaims = () => {
        if (typeof window === "undefined") return [];
        try {
          const stored = localStorage.getItem("fundora-mock-winner-claims");
          if (stored) return JSON.parse(stored);
          const seed = [
            {
              id: "CLM-001",
              user_id: "USR-005",
              draw_id: "DR-42",
              entry_id: "mock-entry-hiroshi",
              ticket_number: "FND-884-92K",
              match_count: 5,
              prize_category: "5 Match",
              screenshot_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=600",
              status: "pending",
              submitted_at: "2026-06-20T10:00:00Z",
              created_at: "2026-06-20T10:00:00Z",
              status_history: [
                { status: "pending", timestamp: "2026-06-20T10:00:00Z", notes: "Claim submitted by user." }
              ]
            },
            {
              id: "CLM-002",
              user_id: "USR-001",
              draw_id: "DR-42",
              entry_id: "mock-entry-marcus",
              ticket_number: "FND-712-X4B",
              match_count: 4,
              prize_category: "4 Match",
              screenshot_url: "https://images.unsplash.com/photo-1563013544-824ae1d704d3?auto=format&fit=crop&q=80&w=600",
              status: "approved",
              submitted_at: "2026-06-18T14:30:00Z",
              created_at: "2026-06-18T14:30:00Z",
              status_history: [
                { status: "pending", timestamp: "2026-06-18T14:30:00Z", notes: "Claim submitted by user." },
                { status: "approved", timestamp: "2026-06-19T09:00:00Z", notes: "Screenshot verification passes. Approved by Admin." }
              ]
            },
            {
              id: "CLM-003",
              user_id: "USR-002",
              draw_id: "DR-42",
              entry_id: "mock-entry-elena",
              ticket_number: "FND-556-P8M",
              match_count: 3,
              prize_category: "3 Match",
              screenshot_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=600",
              status: "paid",
              submitted_at: "2026-06-15T12:00:00Z",
              created_at: "2026-06-15T12:00:00Z",
              status_history: [
                { status: "pending", timestamp: "2026-06-15T12:00:00Z", notes: "Claim submitted by user." },
                { status: "approved", timestamp: "2026-06-16T11:00:00Z", notes: "Match confirmed. Approved by Admin." },
                { status: "paid", timestamp: "2026-06-17T16:00:00Z", notes: "Payout completed. Reference: TXN-BANK-8842." }
              ]
            }
          ];
          localStorage.setItem("fundora-mock-winner-claims", JSON.stringify(seed));
          return seed;
        } catch {
          return [];
        }
      };

      const saveMockClaims = (claims) => {
        if (typeof window === "undefined") return;
        localStorage.setItem("fundora-mock-winner-claims", JSON.stringify(claims));
      };

      return {
        select: (fields) => {
          let matchedData = [];
          if (table === "profiles") {
            const mockUsers = getMockUsers();
            const sessionUser = [];
            const rawSession = getCookie("fundora-mock-session");
            if (rawSession) {
              try {
                const session = JSON.parse(rawSession);
                sessionUser.push({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata.full_name,
                  role: session.role,
                  created_at: new Date().toISOString()
                });
              } catch {}
            }
            
            const staticMockUsers = [
              { id: "USR-001", email: "marcus.k@email.com", full_name: "Marcus Klein", role: "user" },
              { id: "USR-002", email: "elena.r@email.com", full_name: "Elena Rodriguez", role: "user" },
              { id: "USR-003", email: "yuki.s@email.com", full_name: "Yuki Shimizu", role: "user" },
              { id: "USR-005", email: "hiroshi.t@email.com", full_name: "Hiroshi Tanaka", role: "user" },
              { id: "USR-006", email: "sarah.c@email.com", full_name: "Sarah Chen", role: "user" },
            ];

            // Derive the role for localStorage users from the active session cookie
            // so that an admin user stored in localStorage also gets role: "admin"
            const sessionUserId = sessionUser.length > 0 ? sessionUser[0].id : null;
            const sessionUserRole = sessionUser.length > 0 ? sessionUser[0].role : "user";

            matchedData = [
              ...sessionUser,
              ...mockUsers.map(u => ({
                id: u.id,
                email: u.email,
                full_name: u.full_name,
                // Assign the correct role: if this user is the currently logged-in user,
                // use the role from the session cookie; otherwise default to "user"
                role: u.id === sessionUserId ? sessionUserRole
                  : (u.email.startsWith("admin@") || u.email.includes("admin")) ? "admin" : "user",
                stripe_customer_id: u.stripe_customer_id || null
              })),
              ...staticMockUsers
            ];

            const seen = new Set();
            matchedData = matchedData.filter(u => {
              if (seen.has(u.id)) return false;
              seen.add(u.id);
              return true;
            });
          } else if (table === "subscriptions") {
            matchedData = getMockSubscriptions();
          } else if (table === "payments") {
            matchedData = getMockPayments();
          } else if (table === "subscription_plans") {
            matchedData = [
              { id: "sp-scout-monthly", stripe_price_id: "price_scout_monthly", plan_name: "scout", billing_cycle: "monthly", amount: 10.00 },
              { id: "sp-scout-yearly", stripe_price_id: "price_scout_yearly", plan_name: "scout", billing_cycle: "yearly", amount: 96.00 },
              { id: "sp-advocate-monthly", stripe_price_id: "price_advocate_monthly", plan_name: "advocate", billing_cycle: "monthly", amount: 25.00 },
              { id: "sp-advocate-yearly", stripe_price_id: "price_advocate_yearly", plan_name: "advocate", billing_cycle: "yearly", amount: 240.00 },
              { id: "sp-builder-monthly", stripe_price_id: "price_builder_monthly", plan_name: "builder", billing_cycle: "monthly", amount: 100.00 },
              { id: "sp-builder-yearly", stripe_price_id: "price_builder_yearly", plan_name: "builder", billing_cycle: "yearly", amount: 960.00 }
            ];
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
          } else if (table === "user_charity_selections") {
            matchedData = getMockSelections();
          } else if (table === "draws") {
            matchedData = getMockDraws();
          } else if (table === "draw_entries") {
            matchedData = getMockDrawEntries();
          } else if (table === "winner_claims") {
            matchedData = getMockClaims();
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
              plan_name: data.plan_name || data.plan_type,
              status: data.status,
              renewal_date: data.renewal_date,
              stripe_subscription_id: data.stripe_subscription_id || null,
              subscription_id: data.subscription_id || data.stripe_subscription_id || null,
              stripe_price_id: data.stripe_price_id || null,
              customer_id: data.customer_id || null,
              card_brand: data.card_brand || null,
              card_last4: data.card_last4 || null,
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
          } else if (table === "user_charity_selections") {
            const sels = getMockSelections();
            const idx = sels.findIndex(s => s.user_id === data.user_id && s.charity_id === data.charity_id);
            const newSelection = {
              id: "mock-sel-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              charity_id: data.charity_id,
              contribution_percentage: parseInt(data.contribution_percentage, 10),
              created_at: new Date().toISOString()
            };
            if (idx !== -1) {
              sels[idx] = newSelection;
            } else {
              sels.push(newSelection);
            }
            saveMockSelections(sels);

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newSelection, error: null }),
                  maybeSingle: async () => ({ data: newSelection, error: null }),
                  then: async (resolve) => resolve({ data: [newSelection], error: null })
                };
              },
              single: async () => ({ data: newSelection, error: null }),
              maybeSingle: async () => ({ data: newSelection, error: null }),
              then: async (resolve) => resolve({ data: [newSelection], error: null })
            };
            return chain;
          } else if (table === "charities") {
            const charities = getMockCharities();
            const newCharity = {
              id: data.id || "CH-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
              name: data.name,
              description: data.description,
              image_url: data.image_url || "/acres_of_green.png",
              featured: data.featured === true || data.featured === "true",
              category: data.category || "General",
              impact: data.impact || "",
              auditor_score: data.auditor_score || "—",
              spending_ratio: data.spending_ratio || "—",
              raised: data.raised || "$0",
              created_at: new Date().toISOString()
            };
            charities.push(newCharity);
            localStorage.setItem("fundora-mock-charities", JSON.stringify(charities));

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newCharity, error: null }),
                  maybeSingle: async () => ({ data: newCharity, error: null }),
                  then: async (resolve) => resolve({ data: [newCharity], error: null })
                };
              },
              single: async () => ({ data: newCharity, error: null }),
              maybeSingle: async () => ({ data: newCharity, error: null }),
              then: async (resolve) => resolve({ data: [newCharity], error: null })
            };
            return chain;
          } else if (table === "draws") {
            const draws = getMockDraws();
            const newDraw = {
              id: data.id || "mock-draw-" + Math.random().toString(36).substring(2, 15),
              title: data.title || "Draw Title",
              prize: data.prize || "Prize Name",
              month: parseInt(data.month, 10),
              year: parseInt(data.year, 10),
              draw_date: data.draw_date,
              min_score: parseInt(data.min_score, 10) || 0,
              sponsor: data.sponsor || "Sponsor",
              status: data.status || "upcoming",
              winning_numbers: data.winning_numbers || [],
              draw_month: data.draw_month || parseInt(data.month, 10),
              generated_numbers: data.generated_numbers || [],
              generated_timestamp: data.generated_timestamp || null,
              created_at: new Date().toISOString()
            };
            draws.push(newDraw);
            saveMockDraws(draws);

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newDraw, error: null }),
                  maybeSingle: async () => ({ data: newDraw, error: null }),
                  then: async (resolve) => resolve({ data: [newDraw], error: null })
                };
              },
              single: async () => ({ data: newDraw, error: null }),
              maybeSingle: async () => ({ data: newDraw, error: null }),
              then: async (resolve) => resolve({ data: [newDraw], error: null })
            };
            return chain;
          } else if (table === "draw_entries") {
            const entries = getMockDrawEntries();
            let entryNumbers = data.numbers;
            if (!entryNumbers || entryNumbers.length === 0) {
              const nums = new Set();
              while (nums.size < 5) {
                nums.add(Math.floor(Math.random() * 99) + 1);
              }
              entryNumbers = Array.from(nums).sort((a, b) => a - b);
            }
            
            const newEntry = {
              id: data.id || "mock-entry-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              draw_id: data.draw_id,
              ticket_number: data.ticket_number,
              numbers: entryNumbers,
              created_at: new Date().toISOString()
            };
            entries.push(newEntry);
            saveMockDrawEntries(entries);

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newEntry, error: null }),
                  maybeSingle: async () => ({ data: newEntry, error: null }),
                  then: async (resolve) => resolve({ data: [newEntry], error: null })
                };
              },
              single: async () => ({ data: newEntry, error: null }),
              maybeSingle: async () => ({ data: newEntry, error: null }),
              then: async (resolve) => resolve({ data: [newEntry], error: null })
            };
            return chain;
          } else if (table === "winner_claims") {
            const claims = getMockClaims();
            const newClaim = {
              id: data.id || "mock-claim-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              draw_id: data.draw_id,
              entry_id: data.entry_id,
              match_count: parseInt(data.match_count, 10),
              prize_category: data.prize_category,
              screenshot_url: data.screenshot_url,
              status: data.status || "pending",
              submitted_at: data.submitted_at || new Date().toISOString(),
              created_at: new Date().toISOString(),
              status_history: data.status_history || [
                { status: "pending", timestamp: data.submitted_at || new Date().toISOString(), notes: "Claim submitted by user." }
              ]
            };
            claims.push(newClaim);
            saveMockClaims(claims);

            const chain = {
              select: () => {
                return {
                  single: async () => ({ data: newClaim, error: null }),
                  maybeSingle: async () => ({ data: newClaim, error: null }),
                  then: async (resolve) => resolve({ data: [newClaim], error: null })
                };
              },
              single: async () => ({ data: newClaim, error: null }),
              maybeSingle: async () => ({ data: newClaim, error: null }),
              then: async (resolve) => resolve({ data: [newClaim], error: null })
            };
            return chain;
          } else if (table === "payments") {
            const payments = getMockPayments();
            
            if (data.stripe_invoice_id && payments.some(p => p.stripe_invoice_id === data.stripe_invoice_id)) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: { message: "duplicate key value violates unique constraint" } }),
                  maybeSingle: async () => ({ data: null, error: { message: "duplicate key value violates unique constraint" } }),
                  then: async (resolve) => resolve({ data: null, error: { message: "duplicate key value violates unique constraint" } })
                }),
                single: async () => ({ data: null, error: { message: "duplicate key value violates unique constraint" } }),
                maybeSingle: async () => ({ data: null, error: { message: "duplicate key value violates unique constraint" } }),
                then: async (resolve) => resolve({ data: null, error: { message: "duplicate key value violates unique constraint" } })
              };
            }

            const newPayment = {
              id: "mock-pay-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              amount: parseFloat(data.amount),
              status: data.status,
              stripe_invoice_id: data.stripe_invoice_id || null,
              invoice_pdf_url: data.invoice_pdf_url || null,
              hosted_invoice_url: data.hosted_invoice_url || null,
              created_at: data.created_at || new Date().toISOString()
            };
            payments.push(newPayment);
            saveMockPayments(payments);

            const chain = {
              select: () => ({
                single: async () => ({ data: newPayment, error: null }),
                maybeSingle: async () => ({ data: newPayment, error: null }),
                then: async (resolve) => resolve({ data: [newPayment], error: null })
              }),
              single: async () => ({ data: newPayment, error: null }),
              maybeSingle: async () => ({ data: newPayment, error: null }),
              then: async (resolve) => resolve({ data: [newPayment], error: null })
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
              if (table === "profiles") {
                const users = getMockUsers();
                const idx = users.findIndex(u => u[field] === value);
                if (idx !== -1) {
                  users[idx] = { ...users[idx], ...updates };
                  localStorage.setItem("fundora-mock-users", JSON.stringify(users));
                }
                const rawSession = getCookie("fundora-mock-session");
                if (rawSession) {
                  try {
                    const session = JSON.parse(rawSession);
                    if (session.user[field] === value || (field === "id" && session.user.id === value)) {
                      session.user.stripe_customer_id = updates.stripe_customer_id || session.user.stripe_customer_id;
                      setCookie("fundora-mock-session", JSON.stringify(session));
                      updatedSub = {
                        id: session.user.id,
                        email: session.user.email,
                        full_name: session.user.user_metadata.full_name,
                        role: session.role,
                        stripe_customer_id: session.user.stripe_customer_id || null,
                        created_at: new Date().toISOString()
                      };
                    }
                  } catch {}
                }
                if (!updatedSub && idx !== -1) {
                  updatedSub = {
                    id: users[idx].id,
                    email: users[idx].email,
                    full_name: users[idx].full_name,
                    role: "user",
                    stripe_customer_id: users[idx].stripe_customer_id || null,
                    created_at: new Date().toISOString()
                  };
                }
              } else if (table === "subscriptions") {
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
              } else if (table === "user_charity_selections") {
                const sels = getMockSelections();
                const idx = sels.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  sels[idx] = { ...sels[idx], ...updates };
                  if (updates.contribution_percentage !== undefined) {
                    sels[idx].contribution_percentage = parseInt(updates.contribution_percentage, 10);
                  }
                  saveMockSelections(sels);
                  updatedSub = sels[idx];
                }
              } else if (table === "charities") {
                const charities = getMockCharities();
                const idx = charities.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  charities[idx] = { ...charities[idx], ...updates };
                  localStorage.setItem("fundora-mock-charities", JSON.stringify(charities));
                  updatedSub = charities[idx];
                }
              } else if (table === "draws") {
                const draws = getMockDraws();
                const idx = draws.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  draws[idx] = { ...draws[idx], ...updates };
                  saveMockDraws(draws);
                  updatedSub = draws[idx];
                }
              } else if (table === "draw_entries") {
                const entries = getMockDrawEntries();
                const idx = entries.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  entries[idx] = { ...entries[idx], ...updates };
                  saveMockDrawEntries(entries);
                  updatedSub = entries[idx];
                }
              } else if (table === "winner_claims") {
                const claims = getMockClaims();
                const idx = claims.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  const currentHistory = claims[idx].status_history || [
                    { status: "pending", timestamp: claims[idx].created_at || new Date().toISOString(), notes: "Claim submitted by user." }
                  ];
                  let newHistory = [...currentHistory];
                  if (updates.status && updates.status !== claims[idx].status) {
                    newHistory.push({
                      status: updates.status,
                      timestamp: new Date().toISOString(),
                      notes: updates.notes || `Status changed to ${updates.status} by Admin.`
                    });
                  }
                  claims[idx] = { 
                    ...claims[idx], 
                    ...updates, 
                    status_history: newHistory 
                  };
                  saveMockClaims(claims);
                  updatedSub = claims[idx];
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
              } else if (table === "user_charity_selections") {
                const sels = getMockSelections();
                const updated = sels.filter(s => s[field] !== value);
                saveMockSelections(updated);
              } else if (table === "charities") {
                const charities = getMockCharities();
                const updated = charities.filter(s => s[field] !== value);
                localStorage.setItem("fundora-mock-charities", JSON.stringify(updated));
              } else if (table === "draws") {
                const draws = getMockDraws();
                const updated = draws.filter(s => s[field] !== value);
                saveMockDraws(updated);
              } else if (table === "draw_entries") {
                const entries = getMockDrawEntries();
                const updated = entries.filter(s => s[field] !== value);
                saveMockDrawEntries(updated);
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
