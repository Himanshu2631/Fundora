"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserScores, addScore as apiAddScore, deleteScore as apiDeleteScore, updateScore as apiUpdateScore } from "@/services/scoreService";

export function useScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScores = useCallback(async () => {
    if (!user) {
      setScores([]);
      setLoading(false);
      return;
    }
    // Defer state updates to prevent synchronous execution inside effects
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await getUserScores(user.id);
      setScores(data);
    } catch (err) {
      console.error("useScores: Failed to fetch scores:", err);
      setError(err.message || "Failed to load scores");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) {
        await fetchScores();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [fetchScores]);

  /**
   * Add a golf score for the authenticated user.
   * @param {number|string} scoreVal - Golf score value.
   * @param {string} scoreDate - Score date (YYYY-MM-DD).
   */
  const add = async (scoreVal, scoreDate) => {
    if (!user) throw new Error("Must be logged in to add scores");
    setLoading(true);
    setError(null);
    try {
      const data = await apiAddScore(user.id, scoreVal, scoreDate);
      // Re-fetch scores to ensure database state is perfectly synced (including eviction results)
      const updated = await getUserScores(user.id);
      setScores(updated);
      return data;
    } catch (err) {
      setError(err.message || "Failed to add score");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a golf score by ID.
   * @param {string} scoreId - The score ID to update.
   * @param {object} updates - Updates to apply (score, score_date).
   */
  const update = async (scoreId, updates) => {
    if (!user) throw new Error("Must be logged in to update scores");
    setLoading(true);
    setError(null);
    try {
      const data = await apiUpdateScore(scoreId, user.id, updates);
      // Re-fetch scores to ensure database state is perfectly synced
      const updated = await getUserScores(user.id);
      setScores(updated);
      return data;
    } catch (err) {
      setError(err.message || "Failed to update score");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Remove a golf score by ID.
   * @param {string} scoreId - The score ID to delete.
   */
  const remove = async (scoreId) => {
    if (!user) throw new Error("Must be logged in to delete scores");
    setLoading(true);
    setError(null);
    try {
      await apiDeleteScore(scoreId);
      setScores((prev) => prev.filter((s) => s.id !== scoreId));
    } catch (err) {
      setError(err.message || "Failed to delete score");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    scores,
    loading,
    error,
    addScore: add,
    updateScore: update,
    deleteScore: remove,
    refreshScores: fetchScores,
  };
}
