"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useScores } from "@/hooks/useScores";
import { useSubscription } from "@/hooks/useSubscription";
import { createClient } from "@/lib/supabase";

export function useLeaderboard() {
  const { user: authUser, profile } = useAuth();
  const { scores } = useScores();
  const { subscription } = useSubscription();

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Current user's dynamic Giving Score calculation
  const dynamicGivingScore = useMemo(() => {
    const totalScorePoints = scores ? scores.reduce((sum, s) => sum + s.score, 0) : 0;
    const tierBasePoints = subscription?.plan_type === "scout" 
      ? 100 
      : subscription?.plan_type === "advocate" 
        ? 250 
        : subscription?.plan_type === "builder" 
          ? 1000 
          : 0;
    const streakBonus = 25; // 5 * 5 pts
    return tierBasePoints + totalScorePoints + streakBonus;
  }, [scores, subscription]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const supabase = createClient();

      // 1. Fetch profiles and scores
      const { data: profiles, error: pError } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (pError) throw pError;

      const { data: allScores, error: sError } = await supabase
        .from("scores")
        .select("user_id, score");
      if (sError) throw sError;

      // 2. Map static competitors to default values (fallback seed)
      const STATIC_COMPETITORS = [
        { id: "USR-001", name: "Marcus Klein", score: 490 },
        { id: "USR-002", name: "Elena Rodriguez", score: 420 },
        { id: "USR-003", name: "Yuki Shimizu", score: 380 },
      ];

      // 3. For each profile in the system, compute their giving score
      const entries = [];
      const processedUserIds = new Set();

      // Calculate current user's score dynamically
      if (authUser) {
        entries.push({
          id: authUser.id,
          name: profile?.full_name || authUser.email?.split("@")[0] || "Member",
          score: dynamicGivingScore,
          isYou: true
        });
        processedUserIds.add(authUser.id);
      }

      // For other profiles, compute their scores
      if (profiles) {
        profiles.forEach(p => {
          if (processedUserIds.has(p.id)) return;

          // Check if this profile has recorded scores
          const userScores = allScores ? allScores.filter(s => s.user_id === p.id) : [];
          let computedScore = 0;
          
          if (userScores.length > 0) {
            const totalGolfScore = userScores.reduce((sum, s) => sum + s.score, 0);
            computedScore = totalGolfScore + 25;
          } else {
            // Predefined static competitor values
            const staticComp = STATIC_COMPETITORS.find(c => c.id === p.id || c.name === p.full_name);
            if (staticComp) {
              computedScore = staticComp.score;
            } else {
              computedScore = 0;
            }
          }

          entries.push({
            id: p.id,
            name: p.full_name || p.email?.split("@")[0] || "Member",
            score: computedScore,
            isYou: false
          });
          processedUserIds.add(p.id);
        });
      }

      // Also ensure all static competitors are present even if they are not in the profiles table
      STATIC_COMPETITORS.forEach(comp => {
        if (!processedUserIds.has(comp.id)) {
          entries.push({
            id: comp.id,
            name: comp.name,
            score: comp.score,
            isYou: false
          });
          processedUserIds.add(comp.id);
        }
      });

      // 4. Sort entries descending by score
      entries.sort((a, b) => b.score - a.score);

      // Assign ranks (1-indexed)
      entries.forEach((e, idx) => {
        e.rank = idx + 1;
      });

      setLeaderboard(entries);
      setError(null);
    } catch (err) {
      console.error("Failed to load leaderboard data:", err);
      setError(err.message || "Failed to load leaderboard data");
    } finally {
      setLoading(false);
    }
  }, [scores, authUser, profile, dynamicGivingScore]);

  // Initial fetch
  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Real-time Postgres changes listener for dynamic rank changes
  useEffect(() => {
    const supabase = createClient();

    const scoresChannel = supabase
      .channel("scores-leaderboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scores",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel("profiles-leaderboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    const subscriptionsChannel = supabase
      .channel("subscriptions-leaderboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scoresChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(subscriptionsChannel);
    };
  }, [fetchLeaderboard]);

  // Derive rank string
  const rank = useMemo(() => {
    if (loading) return "Loading...";
    if (error) return "Rank unavailable";
    
    const myIndex = leaderboard.findIndex(e => e.isYou);
    return myIndex !== -1 ? `#${myIndex + 1}` : "Rank unavailable";
  }, [leaderboard, loading, error]);

  const rankNumber = useMemo(() => {
    if (loading || error) return null;
    const myIndex = leaderboard.findIndex(e => e.isYou);
    return myIndex !== -1 ? myIndex + 1 : null;
  }, [leaderboard, loading, error]);

  return {
    leaderboard,
    rank,
    rankNumber,
    loading,
    error,
    dynamicGivingScore
  };
}
