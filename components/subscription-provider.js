"use client";

import { createContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient, isPlaceholder } from "@/lib/supabase";
import {
  getSubscription,
  updateSubscription as apiUpdateSubscription,
  checkSubscriptionStatus,
} from "@/services/subscriptionService";

export const SubscriptionContext = createContext({
  subscription: null,
  status: "inactive",
  loading: true,
  error: null,
  subscribe: async () => {},
  cancel: async () => {},
  reactivate: async () => {},
  openPortal: async () => {},
  update: async () => {},
  refresh: async () => {},
});

export function SubscriptionProvider({ children }) {
  const { user, profile } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    // Defer state updates to prevent synchronous execution inside effects
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await getSubscription(user.id);
      setSubscription(data);
    } catch (err) {
      console.error("SubscriptionProvider: Failed to fetch subscription:", {
        message: err.message,
        code: err.code,
        details: err.details,
        stack: err.stack
      });
      setError(err.message || "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchSubscription();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchSubscription]);

  // Real-time Postgres changes listener for instant UI updates
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    let channel;

    const timer = setTimeout(() => {
      try {
        channel = supabase
          .channel(`subscriptions-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "subscriptions",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchSubscription();
            }
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
              console.warn("SubscriptionProvider: realtime channel error");
            }
          });
      } catch (err) {
        console.warn("SubscriptionProvider: failed to set up realtime channel:", err.message);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (channel && typeof supabase.removeChannel === "function") {
        supabase.removeChannel(channel);
      }
    };
  }, [user, fetchSubscription]);

  const subscribe = async (priceId) => {
    if (!user) throw new Error("Must be logged in to subscribe");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }
      if (data.url) {
        window.location.href = data.url;
        // Keep loading state since we are redirecting
        return;
      }
      throw new Error("No redirect URL returned");
    } catch (err) {
      setError(err.message || "Failed to create subscription");
      setLoading(false);
      throw err;
    }
  };

  const cancel = async () => {
    if (!user) throw new Error("Must be logged in to cancel subscription");
    setLoading(true);
    setError(null);
    try {
      // In mock mode (placeholder Supabase credentials), the server-side cancel route
      // reads subscriptions from a cookie, but the client mock uses localStorage.
      // To avoid the "No active subscription found" error, cancel directly via the
      // client-side Supabase mock which correctly reads from localStorage.
      const isMockMode = isPlaceholder;

      if (isMockMode) {
        // Directly cancel via the client mock (reads/writes localStorage + cookie)
        const supabase = createClient();
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!sub) {
          throw new Error("No active subscription found");
        }

        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("user_id", user.id);

        // Trigger Cancellation email notification asynchronously
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "cancel",
            email: user.email,
            userName: profile?.full_name || user.email?.split("@")[0] || "Member",
          }),
        }).catch((err) => console.error("❌ [SubscriptionProvider] Failed to send cancellation email:", err));

        await fetchSubscription();
        return { success: true };
      }

      // Real Stripe path: call the server API route
      const res = await fetch("/api/stripe/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }
      await fetchSubscription();
      return data;
    } catch (err) {
      setError(err.message || "Failed to cancel subscription");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reactivate = async () => {
    if (!user) throw new Error("Must be logged in to reactivate subscription");
    setLoading(true);
    setError(null);
    try {
      const isMockMode = isPlaceholder;

      if (isMockMode) {
        const supabase = createClient();
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);

        await supabase
          .from("subscriptions")
          .update({ status: "active", renewal_date: renewalDate.toISOString() })
          .eq("user_id", user.id);

        await fetchSubscription();
        return { success: true };
      }

      const res = await fetch("/api/stripe/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reactivate subscription");
      }
      await fetchSubscription();
      return data;
    } catch (err) {
      setError(err.message || "Failed to reactivate subscription");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    if (!user) throw new Error("Must be logged in to manage subscription");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to open customer portal");
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message || "Failed to open customer portal");
      setLoading(false);
      throw err;
    }
  };

  const update = async (updates) => {
    if (!user) throw new Error("Must be logged in to update subscription");
    setLoading(true);
    setError(null);
    try {
      // If updating plan_type, redirect to Stripe checkout for the new plan
      if (updates.plan_type) {
        const priceId = `price_${updates.plan_type}_monthly`;
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId }),
        });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
      }
      
      const data = await apiUpdateSubscription(user.id, updates);
      setSubscription(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to update subscription");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const status = checkSubscriptionStatus(subscription);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        status,
        loading,
        error,
        subscribe,
        cancel,
        reactivate,
        openPortal,
        update,
        refresh: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}
