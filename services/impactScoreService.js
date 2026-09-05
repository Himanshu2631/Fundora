import { createClient } from "@/lib/supabase";

/**
 * Standard Impact Actions and their default point rewards.
 */
export const IMPACT_ACTIONS = {
  DONATE_100: {
    code: "donate_100",
    label: "Donate ₹100",
    points: 10,
    description: "Donated ₹100 to a verified cause",
    isOneTime: false
  },
  START_MEMBERSHIP: {
    code: "start_membership",
    label: "Start a Monthly Membership",
    points: 50,
    description: "Started a monthly membership tier",
    isOneTime: false
  },
  VOLUNTEER_CAMPAIGN: {
    code: "volunteer_campaign",
    label: "Volunteer for a Campaign",
    points: 30,
    description: "Volunteered for an active impact campaign",
    isOneTime: false
  },
  INVITE_FRIEND: {
    code: "invite_friend",
    label: "Invite a Friend",
    points: 20,
    description: "Invited a friend to join the platform",
    isOneTime: false
  },
  COMPLETE_PROFILE: {
    code: "complete_profile",
    label: "Complete Profile",
    points: 5,
    description: "Completed public profile details",
    isOneTime: true
  },
  SHARE_CAMPAIGN: {
    code: "share_campaign",
    label: "Share a Campaign",
    points: 5,
    description: "Shared an impact campaign on social media",
    isOneTime: false
  },
  DONATE_EMERGENCY: {
    code: "donate_emergency",
    label: "Donate to Emergency Fund",
    points: 25,
    description: "Donated to emergency relief initiative",
    isOneTime: false
  }
};

/**
 * Fetch all score events for a user, sorted reverse-chronologically.
 * @param {string} userId - The user's ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of score events.
 */
export async function getUserImpactEvents(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    console.error("getUserImpactEvents error:", error.code, error.message);
    return [];
  }

  // Sort reverse chronological: newest date/created_at first
  return (data || []).sort((a, b) => {
    const timeA = new Date(a.created_at || a.score_date).getTime();
    const timeB = new Date(b.created_at || b.score_date).getTime();
    return timeB - timeA;
  });
}

/**
 * Calculate a user's total Impact Score automatically from all score events.
 * Every registered user starts at 0 if they have no events.
 * @param {string} userId - The user's ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<number>} Total Impact Score.
 */
export async function calculateTotalImpactScore(userId, supabaseClient) {
  const events = await getUserImpactEvents(userId, supabaseClient);
  if (!events || events.length === 0) return 0;
  return events.reduce((sum, evt) => sum + (parseInt(evt.score, 10) || 0), 0);
}

/**
 * Record a new score event for a user.
 * Prevents duplicate rewards for one-time actions such as complete_profile.
 * @param {string} userId - The user's ID.
 * @param {object} eventData
 * @param {string} [eventData.action] - Action code (from IMPACT_ACTIONS or custom).
 * @param {number} [eventData.points] - Points awarded (defaults to action points or 10).
 * @param {string} [eventData.description] - Action description.
 * @param {string} [eventData.scoreDate] - Date string (YYYY-MM-DD).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} Inserted event record (or status object if deduplicated).
 */
export async function recordImpactEvent(userId, eventData = {}, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const { data: authData } = await supabase.auth.getUser();
  const sessionUserId = authData?.user?.id;
  let targetUserId = sessionUserId || userId;

  if (!targetUserId) {
    throw new Error("User ID is required to record an impact event.");
  }

  const actionCode = eventData.action || "custom_action";
  const matchedAction = Object.values(IMPACT_ACTIONS).find(a => a.code === actionCode);

  // Check one-time action deduplication
  const isOneTime = eventData.isOneTime || (matchedAction ? matchedAction.isOneTime : false);

  if (isOneTime) {
    const existingEvents = await getUserImpactEvents(targetUserId, supabase);
    const alreadyCompleted = existingEvents.some(e => e.action === actionCode);
    if (alreadyCompleted) {
      return {
        alreadyAwarded: true,
        action: actionCode,
        message: `Points for ${matchedAction ? matchedAction.label : actionCode} have already been claimed.`,
        data: existingEvents.find(e => e.action === actionCode)
      };
    }
  }

  const pointsAwarded = eventData.points !== undefined 
    ? parseInt(eventData.points, 10) 
    : (matchedAction ? matchedAction.points : 10);

  const description = eventData.description || (matchedAction ? matchedAction.description : "Platform impact action");
  const scoreDate = eventData.scoreDate || new Date().toISOString().split("T")[0];

  const payload = {
    user_id: targetUserId,
    score: pointsAwarded,
    action: actionCode,
    description: description,
    score_date: scoreDate,
  };

  const { data, error } = await supabase
    .from("scores")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Error in recordImpactEvent insert:", error.code, error.message, error.details);
    throw new Error(error.message || "Failed to record impact event");
  }

  return {
    alreadyAwarded: false,
    data
  };
}

// Backward-compatibility aliases
export const getUserScores = getUserImpactEvents;
export const addImpactScore = recordImpactEvent;
