"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function LoadingState({ message = "Retrieving audited logs...", className }) {
  return (
    <div className={cn(
      "p-12 text-center flex flex-col items-center justify-center gap-6",
      className
    )}>
      {/* Handcrafted rotating geometric rings */}
      <div className="relative w-12 h-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
          className="absolute inset-0 border-2 border-dashed border-accent rounded-full"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
          className="absolute inset-2 border-2 border-border/80 border-t-accent rounded-full"
        />
      </div>
      
      {/* Loading message */}
      <motion.p
        initial={{ opacity: 0.5 }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 1.8 }}
        className="text-xs font-medium text-muted-foreground uppercase tracking-widest"
      >
        {message}
      </motion.p>
    </div>
  );
}
