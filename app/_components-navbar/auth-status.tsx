/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Button } from "@/components/ui/button";
import { createServerSupabaseClient } from "@/lib/server-utils";
import Link from "next/link";
import LogoutButton from "./logout-button";
import UserNav from "./user-nav";

export default async function AuthStatus() {
  // Create supabase server component client and obtain authenticated user
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Guest state: offer login call-to-action.
    return (
      <Button asChild>
        <Link href="/login">Log in</Link>
      </Button>
    );
  }

  // Signed-in state: fetch profile used for avatar/name dropdown.
  const { data, error } = await supabase.from("profiles").select().eq("id", user.id);

  const profileData = data?.[0];

  if (error != null || data == null || data.length !== 1 || profileData == null) {
    // If profile lookup fails, keep a safe minimal auth control.
    return <LogoutButton />;
  }

  return (
    // Full signed-in controls: quick logout + account dropdown.
    <div className="flex items-center space-x-2">
      <LogoutButton />
      <UserNav profile={profileData} />
    </div>
  );
}
