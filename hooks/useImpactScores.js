"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  getUserImpactScores,
  addImpactScore as apiAddImpactScore,
  deleteImpactScore as apiDeleteImpactScore,
  updateImpactScore as apiUpdateImpactScore,
  recordImpactEvent as apiRecordImpactEvent,
  IMPACT_ACTIONS
} from "@/services/impactService";
import { createClient } from "@/lib/supabase";

export { IMPACT_ACTIONS };

export function useImpactScores() {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastNotification, setLastNotification] = useState(null);

  const fetchScores = useCallback(async () => {
    if (!user) {
      setScores([]);
      setLoading(false);
      return;
    }
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const data = await getUserImpactScores(user.id);
      setScores(data || []);
    } catch (err) {
      console.error("useImpactScores: Failed to fetch impact scores:", err);
      setError(err.message || "Failed to load impact scores");
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

  // Real-time Postgres changes listener for impact score changes
  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    let channel;

    const timer = setTimeout(() => {
      try {
        channel = supabase
          .channel(`scores-realtime-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "scores",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              fetchScores();
            }
          )
          .subscribe((status) => {
            if (status === "CHANNEL_ERROR") {
              console.warn("useImpactScores: realtime channel error — skipping live updates");
            }
          });
      } catch (err) {
        console.warn("useImpactScores: failed to set up realtime channel:", err.message);
      }
    }, 0);

    return () => {
      clearTimeout(timer);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, fetchScores]);

  /**
   * Total Impact Score calculated automatically from all score events.
   * Every registered user starts at 0 if no events exist.
   */
  const totalImpactScore = useMemo(() => {
    if (!scores || scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + (parseInt(s.score, 10) || 0), 0);
  }, [scores]);

  /**
   * High-level action award dispatcher with duplicate prevention & notification payload.
   * @param {string} actionCode - Action key (e.g. 'donate_100', 'start_membership', 'complete_profile', etc.)
   * @param {object} [customData] - Optional overrides (points, description, scoreDate)
   */
  const awardActionPoints = async (actionCode, customData = {}) => {
    if (!user) throw new Error("Must be logged in to trigger action rewards");
    setLoading(true);
    setError(null);

    const matchedAction = Object.values(IMPACT_ACTIONS).find(a => a.code === actionCode);
    const actionLabel = matchedAction ? matchedAction.label : (customData.label || actionCode);

    try {
      const res = await apiRecordImpactEvent(user.id, {
        action: actionCode,
        points: customData.points,
        description: customData.description,
        scoreDate: customData.scoreDate
      });

      if (res.alreadyAwarded) {
        const notif = {
          awarded: false,
          alreadyAwarded: true,
          actionLabel,
          pointsEarned: 0,
          totalImpactScore,
          message: res.message || `Points for ${actionLabel} have already been claimed.`
        };
        setLastNotification(notif);
        return notif;
      }

      // Re-fetch scores to update state immediately in user's dashboard
      const updated = await getUserImpactScores(user.id);
      setScores(updated || []);
      const newTotal = (updated || []).reduce((sum, s) => sum + (parseInt(s.score, 10) || 0), 0);

      const pointsEarned = res.data?.score || matchedAction?.points || 10;
      const notif = {
        awarded: true,
        alreadyAwarded: false,
        actionLabel,
        pointsEarned,
        totalImpactScore: newTotal,
        message: `Action Completed: ${actionLabel}! Earned +${pointsEarned} pts. Total Impact Score: ${newTotal} pts.`
      };

      setLastNotification(notif);
      return notif;
    } catch (err) {
      setError(err.message || "Failed to trigger action reward");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Record a new score event for the user.
   */
  const recordEvent = async (eventData) => {
    if (!user) throw new Error("Must be logged in to record impact events");
    setLoading(true);
    setError(null);
    try {
      const res = await apiRecordImpactEvent(user.id, eventData);
      const updated = await getUserImpactScores(user.id);
      setScores(updated || []);
      return res.data || res;
    } catch (err) {
      setError(err.message || "Failed to record impact event");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add an impact score for the authenticated user (legacy wrapper).
   */
  const add = async (scoreVal, scoreDate) => {
    if (!user) throw new Error("Must be logged in to add impact scores");
    setLoading(true);
    setError(null);
    try {
      const res = await apiAddImpactScore(user.id, scoreVal, scoreDate);
      const updated = await getUserImpactScores(user.id);
      setScores(updated || []);
      return res.data || res;
    } catch (err) {
      setError(err.message || "Failed to add impact score");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const update = async (scoreId, updates) => {
    if (!user) throw new Error("Must be logged in to update impact scores");
    setLoading(true);
    setError(null);
    try {
      const data = await apiUpdateImpactScore(scoreId, user.id, updates);
      const updated = await getUserImpactScores(user.id);
      setScores(updated || []);
      return data;
    } catch (err) {
      setError(err.message || "Failed to update impact score");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const remove = async (scoreId) => {
    if (!user) throw new Error("Must be logged in to delete impact scores");
    setLoading(true);
    setError(null);
    try {
      await apiDeleteImpactScore(scoreId);
      setScores((prev) => prev.filter((s) => s.id !== scoreId));
    } catch (err) {
      setError(err.message || "Failed to delete impact score");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearNotification = () => setLastNotification(null);

  return {
    scores,
    impactScores: scores,
    impactEvents: scores,
    totalImpactScore,
    loading,
    error,
    lastNotification,
    clearNotification,
    awardActionPoints,
    recordImpactEvent: recordEvent,
    addImpactScore: add,
    updateImpactScore: update,
    deleteImpactScore: remove,
    addScore: add,
    updateScore: update,
    deleteScore: remove,
    refreshScores: fetchScores,
    refreshImpactScores: fetchScores,
  };
}

export const useScores = useImpactScores;
