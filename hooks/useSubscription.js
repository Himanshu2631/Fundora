"use client";

import { useContext } from "react";
import { SubscriptionContext } from "@/components/subscription-provider";

// Centralized Membership Constants
export const PLAN_LABELS = {
  scout: "Eco Scout",
  advocate: "Global Advocate",
  builder: "Legacy Builder",
};

export const PLAN_DETAILS = {
  scout: { 
    name: "Eco Scout", 
    price: 10, 
    description: "Automate contributions targeting forest preservation.",
    perks: ["1× draw entry", "+10 score/mo", "Audit receipts"]
  },
  advocate: { 
    name: "Global Advocate", 
    price: 25, 
    description: "Allocation to verified clean water & basic healthcare.",
    perks: ["3× draw multiplier", "+30 score/mo", "Priority draws", "Cause rotation"]
  },
  builder: { 
    name: "Legacy Builder", 
    price: 100, 
    description: "Sponsor advanced STEM fellowships and emergency grids.",
    perks: ["10× draw multiplier", "+150 score/mo", "On-chain receipts", "NGO access"]
  }
};

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
