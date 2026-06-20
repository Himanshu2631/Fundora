import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type = "text", label, error, ...props }, ref) => {
  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label className="text-[10px] font-bold uppercase tracking-wider text-foreground/80 block">
          {label}
        </label>
      )}
      <input
        type={type}
        className={cn(
          "w-full h-11 px-3 bg-secondary/35 border border-border text-foreground text-sm rounded-sm focus:outline-none focus:border-accent transition-colors duration-200 placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed",
          error && "border-destructive focus:border-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
      {error && (
        <span className="text-[11px] font-medium text-destructive block">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = "Input";

export { Input };
