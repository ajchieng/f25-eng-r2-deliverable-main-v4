"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const supabaseClient = createBrowserSupabaseClient();
  const router = useRouter();

  const handleSignOut = async () => {
    // Clear Supabase auth session and re-render server components.
    await supabaseClient.auth.signOut();
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={() => {
        // Explicitly ignore returned promise in click handler context.
        void handleSignOut();
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </Button>
  );
}
