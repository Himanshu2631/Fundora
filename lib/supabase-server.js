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
  const getSubscriptionPlans = () => [
    { id: "sp-scout-monthly", stripe_price_id: "price_scout_monthly", plan_name: "scout", billing_cycle: "monthly", amount: 10.00 },
    { id: "sp-scout-yearly", stripe_price_id: "price_scout_yearly", plan_name: "scout", billing_cycle: "yearly", amount: 96.00 },
    { id: "sp-advocate-monthly", stripe_price_id: "price_advocate_monthly", plan_name: "advocate", billing_cycle: "monthly", amount: 25.00 },
    { id: "sp-advocate-yearly", stripe_price_id: "price_advocate_yearly", plan_name: "advocate", billing_cycle: "yearly", amount: 240.00 },
    { id: "sp-builder-monthly", stripe_price_id: "price_builder_monthly", plan_name: "builder", billing_cycle: "monthly", amount: 100.00 },
    { id: "sp-builder-yearly", stripe_price_id: "price_builder_yearly", plan_name: "builder", billing_cycle: "yearly", amount: 960.00 }
  ];

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

          let matchedData = [];
          if (table === "profiles") {
            const rawSession = cookieStore.get("fundora-mock-session")?.value;
            if (rawSession) {
              try {
                const session = JSON.parse(rawSession);
                matchedData = [{
                  id: session.user.id,
                  email: session.user.email,
                  full_name: session.user.user_metadata?.full_name || "",
                  role: session.role || "user",
                  stripe_customer_id: session.user.stripe_customer_id || null,
                  created_at: new Date().toISOString()
                }];
              } catch {}
            }
          } else if (table === "subscriptions") {
            const rawSub = cookieStore.get("fundora-mock-subscription")?.value;
            if (rawSub) {
              try {
                const sub = JSON.parse(rawSub);
                matchedData = [sub];
              } catch {}
            }
          } else if (table === "subscription_plans") {
            matchedData = getSubscriptionPlans();
          } else if (table === "payments") {
            const rawPayments = cookieStore.get("fundora-mock-payments")?.value;
            if (rawPayments) {
              try {
                matchedData = JSON.parse(rawPayments);
              } catch {}
            }
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
              status: data.status,
              renewal_date: data.renewal_date,
              stripe_subscription_id: data.stripe_subscription_id || null,
              stripe_price_id: data.stripe_price_id || null,
              card_brand: data.card_brand || null,
              card_last4: data.card_last4 || null,
              created_at: new Date().toISOString()
            };
            try {
              cookieStore.set("fundora-mock-subscription", JSON.stringify(createdObj), { path: "/", sameSite: "lax" });
            } catch (err) {
              console.warn("Could not set mock subscription cookie:", err.message);
            }
          } else if (table === "payments") {
            let payments = [];
            const rawPayments = cookieStore.get("fundora-mock-payments")?.value;
            if (rawPayments) {
              try {
                payments = JSON.parse(rawPayments);
              } catch {}
            }

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
              try {
                cookieStore.set("fundora-mock-payments", JSON.stringify(payments), { path: "/", sameSite: "lax" });
              } catch (err) {
                console.warn("Could not set mock payments cookie:", err.message);
              }
            }
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
                  try {
                    const session = JSON.parse(rawSession);
                    if (session.user.id === value) {
                      session.user.stripe_customer_id = updates.stripe_customer_id;
                      try {
                        cookieStore.set("fundora-mock-session", JSON.stringify(session), { path: "/", sameSite: "lax" });
                      } catch (err) {
                        console.warn("Could not set mock session cookie:", err.message);
                      }
                      updatedObj = {
                        id: session.user.id,
                        email: session.user.email,
                        full_name: session.user.user_metadata?.full_name || "",
                        role: session.role || "user",
                        stripe_customer_id: updates.stripe_customer_id,
                        created_at: new Date().toISOString()
                      };
                    }
                  } catch {}
                }
              } else if (table === "subscriptions") {
                const rawSub = cookieStore.get("fundora-mock-subscription")?.value;
                if (rawSub) {
                  try {
                    const sub = JSON.parse(rawSub);
                    if (sub[field] === value) {
                      updatedObj = { ...sub, ...updates };
                      try {
                        cookieStore.set("fundora-mock-subscription", JSON.stringify(updatedObj), { path: "/", sameSite: "lax" });
                      } catch (err) {
                        console.warn("Could not set mock subscription cookie:", err.message);
                      }
                    }
                  } catch {}
                }
              }

              const chain = {
                select: () => ({
                  single: async () => ({ data: updatedObj, error: null }),
                  maybeSingle: async () => ({ data: updatedObj, error: null }),
                  then: async (resolve) => resolve({ data: [updatedObj], error: null })
                }),
                single: async () => ({ data: updatedObj, error: null }),
                maybeSingle: async () => ({ data: updatedObj, error: null }),
                then: async (resolve) => resolve({ data: [updatedObj], error: null })
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
