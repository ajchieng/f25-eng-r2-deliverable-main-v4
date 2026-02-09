/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Separator } from "@/components/ui/separator";
import { TypographyH2, TypographyMuted } from "@/components/ui/typography";
import { type Database } from "@/lib/schema";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import UsersList from "./users-list";

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "biography" | "display_name" | "email" | "id">;

function UsersError({ message }: { message: string }) {
  return (
    <>
      {/* Keep heading visible even when fetch fails so page context is clear. */}
      <TypographyH2>Users</TypographyH2>
      <p className="text-sm text-red-500">Error loading users: {message}</p>
    </>
  );
}

export default async function UsersPage() {
  // This route is protected: only signed-in users can browse profiles.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  // Fetch only the profile fields we want to display on the Users page.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, biography")
    .order("display_name", { ascending: true });

  if (error) {
    return <UsersError message={error.message} />;
  }

  const profiles = (data ?? []) as Profile[];

  return (
    <>
      {/* Page title and helper copy. */}
      <TypographyH2>Users</TypographyH2>
      <TypographyMuted>Browse all user profiles in the Biodiversity Hub.</TypographyMuted>
      <Separator className="my-4" />
      {/* Client component handles inline biography editing for current user card. */}
      <UsersList profiles={profiles} currentUserId={user.id} />
    </>
  );
}
