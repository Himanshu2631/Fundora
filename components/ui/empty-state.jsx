import * as React from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, icon: Icon = HelpCircle, action, className }) {
  return (
    <div className={cn(
      "border border-dashed border-border p-12 text-center rounded-2xl max-w-lg mx-auto flex flex-col items-center justify-center bg-card/10",
      className
    )}>
      <div className="w-12 h-12 rounded-full bg-secondary/50 border border-border flex items-center justify-center text-accent mb-4">
        <Icon className="w-5 h-5" />
      </div>
      <h4 className="font-heading font-bold text-sm text-foreground mb-1.5">
        {title}
      </h4>
      <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <div className="w-full flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}
