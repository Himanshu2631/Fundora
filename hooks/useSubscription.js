"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getSubscription,
  createSubscription as apiCreateSubscription,
  cancelSubscription as apiCancelSubscription,
  updateSubscription as apiUpdateSubscription,
  checkSubscriptionStatus,
} from "@/services/subscriptionService";

export function useSubscription() {
  const { user } = useAuth();
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
      console.error("useSubscription: Failed to fetch subscription:", err);
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

  return {
    subscription,
    status, // 'active' | 'inactive' | 'cancelled' | 'expired'
    loading,
    error,
    subscribe,
    cancel,
    update,
    refresh: fetchSubscription,
  };
}
