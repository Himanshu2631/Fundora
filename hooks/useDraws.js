"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase";
import { 
  getDraws, 
  getUserEntries, 
  generateEntriesForUser, 
  recordWinningNumbers, 
  createDraw,
  generateDraw,
  submitWinnerClaim,
  reviewWinnerClaim,
  getWinnerClaims,
  getUserClaims,
  updateDrawStatus,
  unregisterFromDraw,
  getDrawParticipations,
  updateDrawParticipation
} from "@/services/drawService";

export function useDraws() {
  const { user } = useAuth();
  const [draws, setDraws] = useState([]);
  const [userEntries, setUserEntries] = useState([]);
  const [claims, setClaims] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all draws & user registered entries
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const drawsData = await getDraws();
      if (drawsData) {
        console.log("=== [useDraws] FETCHED DRAWS ===");
        drawsData.forEach(d => {
          console.log(`Draw ID: ${d.id} | Title: ${d.title} | Status: ${d.status}`);
        });
        console.log("=================================");
      }
      setDraws(drawsData);

      if (user) {
        const entriesData = await getUserEntries(user.id);
        setUserEntries(entriesData);

        const claimsData = await getUserClaims(user.id);
        setClaims(claimsData);

        const participationsData = await getDrawParticipations(user.id);
        setParticipations(participationsData);
      } else {
        setUserEntries([]);
        setClaims([]);
        setParticipations([]);
      }
    } catch (err) {
      // Silently handle missing-table errors — dashboard degrades gracefully
      if (err.code !== "PGRST205" && err.code !== "42P01") {
        console.error("useDraws fetch error:", err.code || "", err.message);
      }
      setError(err.message || "Failed to retrieve monthly prize draws.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        setLoading(true);
        await fetchData();
      }
    };
    run();

    // Set up Realtime database listener
    const supabase = createClient();
    const channel = supabase
      .channel("draws-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draws" },
        () => {
          if (active) fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draw_entries" },
        () => {
          if (active) fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "winner_submissions" },
        () => {
          if (active) fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "draw_participation" },
        () => {
          if (active) fetchData();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  /**
   * Register the user for a specific active draw.
   * Automatically allocates tickets based on subscription tier.
   */
  const registerForDraw = async (drawId, givingScore, subscriptionTier, subscriptionStatus) => {
    if (!user) throw new Error("Must be logged in to participate in draws.");
    setLoading(true);
    setError(null);
    try {
      const generated = await generateEntriesForUser(
        user.id,
        drawId,
        givingScore,
        subscriptionTier,
        subscriptionStatus
      );
      // Refresh user entries state list
      const updatedEntries = await getUserEntries(user.id);
      setUserEntries(updatedEntries);
      return generated;
    } catch (err) {
      setError(err.message || "Failed to register draw entries.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unregister the user from a specific active draw.
   */
  const unregisterForDraw = async (drawId) => {
    if (!user) throw new Error("Must be logged in to participate in draws.");
    setLoading(true);
    setError(null);
    try {
      await unregisterFromDraw(user.id, drawId);
      // Refresh user entries state list
      const updatedEntries = await getUserEntries(user.id);
      setUserEntries(updatedEntries);
      return true;
    } catch (err) {
      setError(err.message || "Failed to leave draw.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Set user's participation status ('participating' or 'not_interested')
   */
  const setParticipationStatus = async (drawId, status, givingScore, subscriptionTier, subscriptionStatus) => {
    if (!user) throw new Error("Must be logged in to update participation status.");
    setLoading(true);
    setError(null);
    try {
      const result = await updateDrawParticipation(user.id, drawId, status);
      const updated = await getDrawParticipations(user.id);
      setParticipations(updated);

      if (status === "participating") {
        if (subscriptionStatus === "active" || subscriptionStatus === "trialing") {
          await generateEntriesForUser(
            user.id,
            drawId,
            givingScore,
            subscriptionTier,
            subscriptionStatus
          );
          const updatedEntries = await getUserEntries(user.id);
          setUserEntries(updatedEntries);
        }
      } else if (status === "not_interested") {
        await unregisterFromDraw(user.id, drawId);
        const updatedEntries = await getUserEntries(user.id);
        setUserEntries(updatedEntries);
      }
      return result;
    } catch (err) {
      setError(err.message || "Failed to update participation.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Auto-generate entries check if user is participating and eligible but doesn't have entries
   */
  const autoGenerateEntriesIfEligible = useCallback(async (
    givingScore,
    subscriptionTier,
    subscriptionStatus
  ) => {
    if (!user || draws.length === 0 || participations.length === 0) return;
    if (subscriptionStatus !== "active" && subscriptionStatus !== "trialing") return;

    for (const draw of draws) {
      const participation = participations.find(p => p.draw_id === draw.id);
      if (participation && participation.status === "participating") {
        const hasEntries = userEntries.some(e => e.draw_id === draw.id);
        if (!hasEntries) {
          try {
            await generateEntriesForUser(
              user.id,
              draw.id,
              givingScore,
              subscriptionTier,
              subscriptionStatus
            );
            const updatedEntries = await getUserEntries(user.id);
            setUserEntries(updatedEntries);
          } catch (e) {
            console.error("Auto generate entries failed:", e.message);
          }
        }
      }
    }
  }, [user, draws, participations, userEntries]);

  /**
   * Record winning numbers for a draw (Admin operation).
   */
  const enterWinningNumbers = async (drawId, winningNumbers) => {
    setLoading(true);
    setError(null);
    try {
      const updatedDraw = await recordWinningNumbers(drawId, winningNumbers);
      setDraws(prev => prev.map(d => d.id === drawId ? updatedDraw : d));
      return updatedDraw;
    } catch (err) {
      setError(err.message || "Failed to submit winning numbers.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new monthly prize draw (Admin/Sponsor operation).
   */
  const addNewDraw = async (drawData) => {
    setLoading(true);
    setError(null);
    try {
      const newDraw = await createDraw(drawData);
      setDraws(prev => [...prev, newDraw]);
      return newDraw;
    } catch (err) {
      setError(err.message || "Failed to create new draw.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transition draw status (Admin operation).
   */
  const changeDrawStatus = async (drawId, status) => {
    setLoading(true);
    setError(null);
    try {
      const updatedDraw = await updateDrawStatus(drawId, status);
      setDraws(prev => prev.map(d => d.id === drawId ? updatedDraw : d));
      return updatedDraw;
    } catch (err) {
      setError(err.message || "Failed to update draw status.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Run the draw completion logic to generate winning numbers (Admin operation).
   */
  const completeDraw = async (drawId) => {
    setLoading(true);
    setError(null);
    try {
      const updatedDraw = await generateDraw(drawId);
      setDraws(prev => prev.map(d => d.id === drawId ? updatedDraw : d));
      return updatedDraw;
    } catch (err) {
      setError(err.message || "Failed to complete draw.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Submit a winner claim for a completed draw entry.
   */
  const submitClaim = async (drawId, entryId, screenshotUrl) => {
    if (!user) throw new Error("Must be logged in to submit a claim.");
    setLoading(true);
    setError(null);
    try {
      const newClaim = await submitWinnerClaim(user.id, drawId, entryId, screenshotUrl);
      const claimsData = await getUserClaims(user.id);
      setClaims(claimsData);
      return newClaim;
    } catch (err) {
      setError(err.message || "Failed to submit winner claim.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Review winner claim status (Admin operation).
   */
  const reviewClaim = async (claimId, status, notes = "") => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/claims/review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ claimId, status, notes }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to review claim.");
      }
      const updatedClaim = result.claim;
      setClaims(prev => prev.map(c => c.id === claimId ? updatedClaim : c));
      return updatedClaim;
    } catch (err) {
      setError(err.message || "Failed to review claim.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all winner claims (Admin operation).
   */
  const fetchAllClaims = useCallback(async (status = null) => {
    setLoading(true);
    setError(null);
    try {
      const claimsData = await getWinnerClaims(status);
      setClaims(claimsData);
      return claimsData;
    } catch (err) {
      setError(err.message || "Failed to fetch all winner claims.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    draws,
    userEntries,
    claims,
    participations,
    loading,
    error,
    refresh: fetchData,
    registerForDraw,
    unregisterForDraw,
    setParticipationStatus,
    autoGenerateEntriesIfEligible,
    enterWinningNumbers,
    addNewDraw,
    completeDraw,
    submitClaim,
    reviewClaim,
    fetchAllClaims,
    changeDrawStatus
  };
}
