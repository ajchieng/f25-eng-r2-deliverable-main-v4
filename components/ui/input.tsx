/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import * as React from "react";

import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      // Keep native `type` behavior (text, email, number, etc.) configurable by caller.
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      // forwardRef enables form libraries/focus management to target the input directly.
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
