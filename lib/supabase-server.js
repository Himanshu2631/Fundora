import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const sanitizeEnv = (val) => {
  if (!val) return "";
  return val.trim().replace(/^["']|["']$/g, "").trim();
};

const url = sanitizeEnv(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
const anonKey = sanitizeEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 
  ""
);

export const isPlaceholder = 
  url === "https://placeholder.supabase.co" || 
  anonKey === "placeholder-anon-key" || 
  !url || 
  !anonKey;

const seedDraws = [
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

const seedClaims = [
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

const createMockServer = (cookieStore) => {
  const getSubscriptionPlans = () => [
    { id: "sp-scout-monthly", stripe_price_id: "price_scout_monthly", plan_name: "scout", billing_cycle: "monthly", amount: 10.00 },
    { id: "sp-scout-yearly", stripe_price_id: "price_scout_yearly", plan_name: "scout", billing_cycle: "yearly", amount: 96.00 },
    { id: "sp-advocate-monthly", stripe_price_id: "price_advocate_monthly", plan_name: "advocate", billing_cycle: "monthly", amount: 25.00 },
    { id: "sp-advocate-yearly", stripe_price_id: "price_advocate_yearly", plan_name: "advocate", billing_cycle: "yearly", amount: 240.00 },
    { id: "sp-builder-monthly", stripe_price_id: "price_builder_monthly", plan_name: "builder", billing_cycle: "monthly", amount: 100.00 },
    { id: "sp-builder-yearly", stripe_price_id: "price_builder_yearly", plan_name: "builder", billing_cycle: "yearly", amount: 960.00 }
  ];

  const parseCookieJSON = (val) => {
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      try {
        return JSON.parse(decodeURIComponent(val));
      } catch {
        return null;
      }
    }
  };

  const getCookieList = (name, fallback = []) => {
    const val = cookieStore.get(name)?.value;
    if (!val) return fallback;
    const parsed = parseCookieJSON(val);
    return parsed !== null ? parsed : fallback;
  };

  const saveCookieList = (name, data) => {
    try {
      cookieStore.set(name, JSON.stringify(data), { path: "/", sameSite: "lax" });
    } catch (err) {
      console.warn(`Could not set mock cookie ${name}:`, err.message);
    }
  };

  return {
    auth: {
      getSession: async () => {
        const rawSession = cookieStore.get("fundora-mock-session")?.value;
        if (rawSession) {
          const session = parseCookieJSON(rawSession);
          if (session) {
            return { data: { session }, error: null };
          }
        }
        return { data: { session: null }, error: null };
      },
      getUser: async () => {
        const rawSession = cookieStore.get("fundora-mock-session")?.value;
        if (rawSession) {
          const session = parseCookieJSON(rawSession);
          if (session) {
            return { data: { user: session.user }, error: null };
          }
        }
        return { data: { user: null }, error: null };
      }
    },
    from: (table) => {
      return {
        select: (fields) => {
          const makeChain = (data) => {
            const chain = {
              eq: (field, value) => {
                const filtered = data.filter(item => item[field] === value);
                return makeChain(filtered);
              },
              in: (field, values) => {
                const filtered = data.filter(item => values.includes(item[field]));
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

          let matchedData = [];
          if (table === "profiles") {
            const rawSession = cookieStore.get("fundora-mock-session")?.value;
            const sessionUser = [];
            if (rawSession) {
              const session = parseCookieJSON(rawSession);
              if (session) {
                sessionUser.push({
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || session.user.full_name || "",
                  role: session.role || "user",
                  stripe_customer_id: session.user.stripe_customer_id || null,
                  pref_system_updates: session.user.pref_system_updates !== false,
                  pref_draw_results: session.user.pref_draw_results !== false,
                  pref_winner_alerts: session.user.pref_winner_alerts !== false,
                  created_at: new Date().toISOString()
                });
              }
            }

            const staticMockUsers = [
              { id: "USR-001", email: "marcus.k@email.com", full_name: "Marcus Klein", role: "user" },
              { id: "USR-002", email: "elena.r@email.com", full_name: "Elena Rodriguez", role: "user" },
              { id: "USR-003", email: "yuki.s@email.com", full_name: "Yuki Shimizu", role: "user" },
              { id: "USR-005", email: "hiroshi.t@email.com", full_name: "Hiroshi Tanaka", role: "user" },
              { id: "USR-006", email: "sarah.c@email.com", full_name: "Sarah Chen", role: "user" },
            ];

            matchedData = [
              ...sessionUser,
              ...staticMockUsers.map(u => ({
                ...u,
                pref_system_updates: true,
                pref_draw_results: true,
                pref_winner_alerts: true,
                stripe_customer_id: null,
                created_at: new Date().toISOString()
              }))
            ];

            const seen = new Set();
            matchedData = matchedData.filter(u => {
              if (seen.has(u.id)) return false;
              seen.add(u.id);
              return true;
            });
          } else if (table === "subscriptions") {
            const rawSub = cookieStore.get("fundora-mock-subscription")?.value;
            if (rawSub) {
              const sub = parseCookieJSON(rawSub);
              if (sub) {
                matchedData = [sub];
              }
            }
          } else if (table === "subscription_plans") {
            matchedData = getSubscriptionPlans();
          } else if (table === "payments") {
            matchedData = getCookieList("fundora-mock-payments");
          } else if (table === "draws") {
            matchedData = getCookieList("fundora-mock-draws", seedDraws);
          } else if (table === "draw_entries") {
            matchedData = getCookieList("fundora-mock-draw-entries");
          } else if (table === "winner_claims") {
            matchedData = getCookieList("fundora-mock-winner-claims", seedClaims);
          } else if (table === "scores") {
            matchedData = getCookieList("fundora-mock-scores");
          }

          return makeChain(matchedData);
        },
        insert: (data) => {
          let createdObj = null;
          let insertError = null;

          if (table === "subscriptions") {
            createdObj = {
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
            saveCookieList("fundora-mock-subscription", createdObj);
          } else if (table === "payments") {
            let payments = getCookieList("fundora-mock-payments");

            if (data.stripe_invoice_id && payments.some(p => p.stripe_invoice_id === data.stripe_invoice_id)) {
              insertError = { message: "duplicate key value violates unique constraint" };
            } else {
              createdObj = {
                id: "mock-pay-" + Math.random().toString(36).substring(2, 15),
                user_id: data.user_id,
                amount: parseFloat(data.amount),
                status: data.status,
                stripe_invoice_id: data.stripe_invoice_id || null,
                invoice_pdf_url: data.invoice_pdf_url || null,
                hosted_invoice_url: data.hosted_invoice_url || null,
                created_at: data.created_at || new Date().toISOString()
              };
              payments.push(createdObj);
              saveCookieList("fundora-mock-payments", payments);
            }
          } else if (table === "draws") {
            const draws = getCookieList("fundora-mock-draws", seedDraws);
            createdObj = {
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
            draws.push(createdObj);
            saveCookieList("fundora-mock-draws", draws);
          } else if (table === "draw_entries") {
            const entries = getCookieList("fundora-mock-draw-entries");
            let entryNumbers = data.numbers;
            if (!entryNumbers || entryNumbers.length === 0) {
              const nums = new Set();
              while (nums.size < 5) {
                nums.add(Math.floor(Math.random() * 99) + 1);
              }
              entryNumbers = Array.from(nums).sort((a, b) => a - b);
            }
            createdObj = {
              id: data.id || "mock-entry-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              draw_id: data.draw_id,
              ticket_number: data.ticket_number,
              numbers: entryNumbers,
              created_at: new Date().toISOString()
            };
            entries.push(createdObj);
            saveCookieList("fundora-mock-draw-entries", entries);
          } else if (table === "winner_claims") {
            const claims = getCookieList("fundora-mock-winner-claims", seedClaims);
            createdObj = {
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
            claims.push(createdObj);
            saveCookieList("fundora-mock-winner-claims", claims);
          } else if (table === "scores") {
            const scores = getCookieList("fundora-mock-scores");
            createdObj = {
              id: "mock-score-" + Math.random().toString(36).substring(2, 15),
              user_id: data.user_id,
              score: parseInt(data.score, 10),
              score_date: data.score_date,
              created_at: new Date().toISOString()
            };
            scores.push(createdObj);
            saveCookieList("fundora-mock-scores", scores);
          }

          const chain = {
            select: () => ({
              single: async () => ({ data: createdObj, error: insertError }),
              maybeSingle: async () => ({ data: createdObj, error: insertError }),
              then: async (resolve) => resolve({ data: createdObj ? [createdObj] : [], error: insertError })
            }),
            single: async () => ({ data: createdObj, error: insertError }),
            maybeSingle: async () => ({ data: createdObj, error: insertError }),
            then: async (resolve) => resolve({ data: createdObj ? [createdObj] : [], error: insertError })
          };
          return chain;
        },
        update: (updates) => {
          return {
            eq: (field, value) => {
              let updatedObj = null;
              if (table === "profiles") {
                const rawSession = cookieStore.get("fundora-mock-session")?.value;
                if (rawSession) {
                  const session = parseCookieJSON(rawSession);
                  if (session && session.user.id === value) {
                    session.user = { ...session.user, ...updates };
                    cookieStore.set("fundora-mock-session", JSON.stringify(session), { path: "/", sameSite: "lax" });
                    updatedObj = {
                      id: session.user.id,
                      email: session.user.email,
                      full_name: session.user.user_metadata?.full_name || session.user.full_name || "",
                      role: session.role || "user",
                      stripe_customer_id: session.user.stripe_customer_id || null,
                      pref_system_updates: session.user.pref_system_updates !== false,
                      pref_draw_results: session.user.pref_draw_results !== false,
                      pref_winner_alerts: session.user.pref_winner_alerts !== false,
                      created_at: new Date().toISOString()
                    };
                  }
                }
              } else if (table === "subscriptions") {
                const rawSub = cookieStore.get("fundora-mock-subscription")?.value;
                if (rawSub) {
                  const sub = parseCookieJSON(rawSub);
                  if (sub && sub[field] === value) {
                    updatedObj = { ...sub, ...updates };
                    cookieStore.set("fundora-mock-subscription", JSON.stringify(updatedObj), { path: "/", sameSite: "lax" });
                  }
                }
              } else if (table === "draws") {
                const draws = getCookieList("fundora-mock-draws", seedDraws);
                const idx = draws.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  draws[idx] = { ...draws[idx], ...updates };
                  saveCookieList("fundora-mock-draws", draws);
                  updatedObj = draws[idx];
                }
              } else if (table === "draw_entries") {
                const entries = getCookieList("fundora-mock-draw-entries");
                const idx = entries.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  entries[idx] = { ...entries[idx], ...updates };
                  saveCookieList("fundora-mock-draw-entries", entries);
                  updatedObj = entries[idx];
                }
              } else if (table === "winner_claims") {
                const claims = getCookieList("fundora-mock-winner-claims", seedClaims);
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
                  saveCookieList("fundora-mock-winner-claims", claims);
                  updatedObj = claims[idx];
                }
              } else if (table === "scores") {
                const scores = getCookieList("fundora-mock-scores");
                const idx = scores.findIndex(s => s[field] === value);
                if (idx !== -1) {
                  scores[idx] = { ...scores[idx], ...updates };
                  if (updates.score !== undefined) {
                    scores[idx].score = parseInt(updates.score, 10);
                  }
                  saveCookieList("fundora-mock-scores", scores);
                  updatedObj = scores[idx];
                }
              }

              const chain = {
                select: () => ({
                  single: async () => ({ data: updatedObj, error: updatedObj ? null : { message: "Not found" } }),
                  maybeSingle: async () => ({ data: updatedObj, error: null }),
                  then: async (resolve) => resolve({ data: [updatedObj], error: null })
                }),
                single: async () => ({ data: updatedObj, error: updatedObj ? null : { message: "Not found" } }),
                maybeSingle: async () => ({ data: updatedObj, error: null }),
                then: async (resolve) => resolve({ data: [updatedObj], error: null })
              };
              return chain;
            }
          };
        },
        delete: () => {
          return {
            eq: (field, value) => {
              if (table === "scores") {
                const scores = getCookieList("fundora-mock-scores");
                const updated = scores.filter(s => s[field] !== value);
                saveCookieList("fundora-mock-scores", updated);
              } else if (table === "draws") {
                const draws = getCookieList("fundora-mock-draws", seedDraws);
                const updated = draws.filter(s => s[field] !== value);
                saveCookieList("fundora-mock-draws", updated);
              } else if (table === "draw_entries") {
                const entries = getCookieList("fundora-mock-draw-entries");
                const updated = entries.filter(s => s[field] !== value);
                saveCookieList("fundora-mock-draw-entries", updated);
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
