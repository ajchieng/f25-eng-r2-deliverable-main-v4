/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { ModeToggle } from "@/app/_components-navbar/mode-toggle";
import { Toaster } from "@/components/ui/toaster";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import AuthStatus from "./_components-navbar/auth-status";
import Navbar from "./_components-navbar/navbar";
import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "T4SG Biodiversity Hub",
  description: "T4SG Deliverable for Spring 2024 Applications.",
};

// Sans font used for body copy and UI labels.
const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Display serif font used for headings.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "600", "700"],
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Hydration warning suppressed because of next-themes https://github.com/pacocoursey/next-themes */}
      <body className={`${sans.variable} ${display.variable} font-sans antialiased`}>
        {/* Theme and other client-side context providers. */}
        <Providers>
          <div className="flex-col md:flex">
            {/* Top navigation/header row shown across all routes. */}
            <div className="border-b">
              <div className="flex h-16 items-center px-4">
                <Navbar className="mx-6" />
                <div className="ml-auto flex items-center space-x-4">
                  <ModeToggle />
                  <AuthStatus />
                </div>
              </div>
            </div>
            {/* Main page content slot for route-level components. */}
            <div className="space-y-6 p-10 pb-16 md:block">
              <main>{children}</main>
            </div>
          </div>
        </Providers>
        {/* Toast portal lives at root so all pages can trigger notifications. */}
        <Toaster />
      </body>
    </html>
  );
}
