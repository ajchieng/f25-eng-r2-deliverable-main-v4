/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { createServerSupabaseClient } from "@/lib/server-utils";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function Navbar({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  // Create supabase server component client and obtain authenticated user
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    // Primary route navigation shown in the top app shell.
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      <Link href="/" className="text-sm font-medium transition-colors hover:text-primary">
        Home
      </Link>
      {/* Protected feature links only appear for signed-in users. */}
      {user && (
        <>
          <Link href="/species" className="text-sm font-medium transition-colors hover:text-primary">
            Species
          </Link>
          <Link href="/species-speed" className="text-sm font-medium transition-colors hover:text-primary">
            Species Speed
          </Link>
          <Link href="/users" className="text-sm font-medium transition-colors hover:text-primary">
            Users
          </Link>
        </>
      )}
      {user && (
        // Chatbot is also protected; hide link for guests.
        <Link href="/species-chatbot" className="text-sm font-medium transition-colors hover:text-primary">
          Species Chatbot
        </Link>
      )}
    </nav>
  );
}
