"use client";

import { Button } from "@/components/ui/button";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const supabaseClient = createBrowserSupabaseClient();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabaseClient.auth.signOut();
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      onClick={() => {
        void handleSignOut();
      }}
    >
      <LogOut className="mr-2 h-4 w-4" />
      Log out
    </Button>
  );
}
