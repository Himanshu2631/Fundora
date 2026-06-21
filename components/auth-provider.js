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

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setUser(session.user);
          const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(data);
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
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        setProfile(data);
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
        throw error;
      }
      console.log("✅ [AuthProvider] signIn succeeded, user:", data.user?.email);
      return data;
    } catch (err) {
      console.error("❌ [AuthProvider] signIn catch block:", err);
      throw err;
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
        throw error;
      }
      console.log("✅ [AuthProvider] signUp succeeded, user:", data.user?.email);
      return data;
    } catch (err) {
      console.error("❌ [AuthProvider] signUp catch block:", err);
      throw err;
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
        throw error;
      }
      console.log("✅ [AuthProvider] signOut succeeded");
      setUser(null);
      setProfile(null);
      window.location.href = "/login";
    } catch (err) {
      console.error("❌ [AuthProvider] signOut catch block:", err);
      throw err;
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
