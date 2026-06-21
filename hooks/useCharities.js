"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  getCharities, 
  getUserAllocations, 
  allocateCharity, 
  removeAllocation as apiRemoveAllocation 
} from "@/services/charityService";

export function useCharities() {
  const { user } = useAuth();
  const [charities, setCharities] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all vetted charities & user selections
  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const charData = await getCharities();
      setCharities(charData);

      if (user) {
        const allocData = await getUserAllocations(user.id);
        setAllocations(allocData);
      } else {
        setAllocations([]);
      }
    } catch (err) {
      console.error("useCharities: Failed to fetch charity data:", err);
      setError(err.message || "Failed to load charity directory.");
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
   * Allocate subscription contribution percentage to a charity.
   * @param {string} charityId - Target charity ID.
   * @param {number|string} percentage - Percentage split.
   */
  const allocate = async (charityId, percentage) => {
    if (!user) throw new Error("Must be logged in to select charities");
    setLoading(true);
    setError(null);
    try {
      await allocateCharity(user.id, charityId, percentage);
      // Refresh allocations list to sync state
      const updated = await getUserAllocations(user.id);
      setAllocations(updated);
    } catch (err) {
      setError(err.message || "Failed to save charity allocation.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a charity from allocations list.
   * @param {string} charityId - Target charity ID.
   */
  const remove = async (charityId) => {
    if (!user) throw new Error("Must be logged in to modify allocations");
    setLoading(true);
    setError(null);
    try {
      await apiRemoveAllocation(user.id, charityId);
      setAllocations((prev) => prev.filter((a) => a.charity_id !== charityId));
    } catch (err) {
      setError(err.message || "Failed to remove charity allocation.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    charities,
    allocations,
    loading,
    error,
    allocate,
    removeAllocation: remove,
    refresh: fetchData,
  };
}
