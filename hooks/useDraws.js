"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  getDraws, 
  getUserEntries, 
  generateEntriesForUser, 
  recordWinningNumbers, 
  createDraw 
} from "@/services/drawService";

export function useDraws() {
  const { user } = useAuth();
  const [draws, setDraws] = useState([]);
  const [userEntries, setUserEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all draws & user registered entries
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const drawsData = await getDraws();
      setDraws(drawsData);

      if (user) {
        const entriesData = await getUserEntries(user.id);
        setUserEntries(entriesData);
      } else {
        setUserEntries([]);
      }
    } catch (err) {
      console.error("useDraws hook fetch error:", err);
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
    return () => {
      active = false;
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

  return {
    draws,
    userEntries,
    loading,
    error,
    refresh: fetchData,
    registerForDraw,
    enterWinningNumbers,
    addNewDraw
  };
}
