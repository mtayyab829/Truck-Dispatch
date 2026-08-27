import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" &&
            "bg-slate-900 text-white hover:bg-slate-800",
          variant === "secondary" &&
            "bg-slate-100 text-slate-900 hover:bg-slate-200",
          variant === "outline" &&
            "border border-slate-300 bg-white hover:bg-slate-50",
          variant === "ghost" && "hover:bg-slate-100",
          size === "default" && "h-10 px-4 py-2",
          size === "sm" && "h-8 px-3 text-xs",
          size === "lg" && "h-11 px-6",
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
