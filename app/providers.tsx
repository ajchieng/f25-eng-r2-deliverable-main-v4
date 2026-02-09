"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { ThemeProvider } from "next-themes";

// Suppress React 19 ref deprecation warning from Radix UI v2
// This is a known compatibility issue: https://github.com/radix-ui/primitives/issues/1835
if (typeof window !== "undefined") {
  // Preserve original logger so non-targeted errors still surface.
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      message.includes("Accessing element.ref was removed in React 19")
    ) {
      // Drop only this known noisy warning.
      return;
    }
    originalError.call(console, ...args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  // next-themes controls `class` on <html> and syncs persisted preference.
  return <ThemeProvider>{children}</ThemeProvider>;
}
