"use client";

import { ThemeProvider } from "next-themes";

// Suppress React 19 ref deprecation warning from Radix UI v2
// This is a known compatibility issue: https://github.com/radix-ui/primitives/issues/1835
if (typeof window !== "undefined") {
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    const message = args[0];
    if (
      typeof message === "string" &&
      message.includes("Accessing element.ref was removed in React 19")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
