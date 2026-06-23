"use client";

import { createContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
});

const supabase = createClient();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfileExists = async (currentUser) => {
    if (!currentUser) return null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error checking profile:", error);
      }

      if (data) {
        return data;
      }

      // Profile is missing, attempt to insert
      console.log("Profile missing for user", currentUser.id, ". Auto-creating profile...");
      const newProfile = {
        id: currentUser.id,
        email: currentUser.email,
        full_name: currentUser.user_metadata?.full_name || "",
        role: "user"
      };

      const { data: insertedData, error: insertError } = await supabase
        .from("profiles")
        .insert(newProfile)
        .select()
        .single();

      if (insertError) {
        console.error("Error auto-creating profile in database:", insertError);
        return null;
      }

      console.log("Successfully auto-created profile for user", currentUser.id);
      return insertedData;
    } catch (err) {
      console.error("Exception in ensureProfileExists:", err);
      return null;
    }
  };

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          const userProfile = await ensureProfileExists(session.user);
          setProfile(userProfile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error retrieving initial session:", err);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session) {
        setUser(session.user);
        const userProfile = await ensureProfileExists(session.user);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email, password) => {
    setLoading(true);
    console.log("🔑 [AuthProvider] signIn called for:", email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        console.error("❌ [AuthProvider] signIn failed:", error.message || error);
        let msg = error.message;
        if (msg === "Invalid login credentials" || msg?.toLowerCase().includes("invalid login credentials")) {
          msg = "Incorrect email or password.";
        }
        return { success: false, message: msg };
      }
      console.log("✅ [AuthProvider] signIn succeeded, user:", data.user?.email);
      return { success: true, data };
    } catch (err) {
      console.error("❌ [AuthProvider] signIn catch block:", err);
      let msg = err.message || "Failed to sign in.";
      if (msg === "Invalid login credentials" || msg?.toLowerCase().includes("invalid login credentials")) {
        msg = "Incorrect email or password.";
      }
      return { success: false, message: msg };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name, email, password) => {
    setLoading(true);
    console.log("📝 [AuthProvider] signUp called for:", email);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });
      if (error) {
        console.error("❌ [AuthProvider] signUp failed:", error.message || error);
        return { success: false, message: error.message };
      }
      console.log("✅ [AuthProvider] signUp succeeded, user:", data.user?.email);

      // Trigger Welcome Registration email notification asynchronously
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "registration",
          email,
          userName: name,
        }),
      }).catch((err) => console.error("❌ [AuthProvider] Failed to send registration email:", err));

      return { success: true, data };
    } catch (err) {
      console.error("❌ [AuthProvider] signUp catch block:", err);
      return { success: false, message: err.message || "Failed to create account." };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    console.log("🚪 [AuthProvider] signOut called");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("❌ [AuthProvider] signOut failed:", error.message || error);
        return { success: false, message: error.message };
      }
      console.log("✅ [AuthProvider] signOut succeeded");
      setUser(null);
      setProfile(null);
      window.location.href = "/login";
      return { success: true };
    } catch (err) {
      console.error("❌ [AuthProvider] signOut catch block:", err);
      return { success: false, message: err.message || "Failed to sign out." };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    if (!user) throw new Error("No active session");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();
      
      if (error) throw error;
      setProfile(data);
      
      // Update display name inside auth user metadata
      if (updates.full_name) {
        await supabase.auth.updateUser({
          data: { full_name: updates.full_name }
        });
      }
      
      return data;
    } catch (err) {
      console.error("❌ [AuthProvider] updateProfile failed:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setProfile(data);
      }
    } catch (err) {
      console.error("❌ [AuthProvider] refreshProfile failed:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signOut, updateProfile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
