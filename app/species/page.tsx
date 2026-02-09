/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AddSpeciesDialog from "./add-species-dialog";
import SpeciesList from "./species-list";
import type { SpeciesBookmark, SpeciesWithAuthorProfile } from "./types";

export default async function SpeciesPage() {
  // Species page is rendered on the server so we can do auth and DB reads before HTML is sent.
  // Create supabase server component client and obtain authenticated user
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // this is a protected route - only users who are signed in can view this route
    redirect("/");
  }

  // Obtain the ID of the currently signed-in user
  const sessionId = user.id;

  // Fetch species rows and the current user's bookmark rows in parallel.
  const [{ data: species }, { data: speciesBookmarks }] = await Promise.all([
    supabase
      .from("species")
      .select(
        `*,
        author_profile:profiles!species_author_fkey(id, display_name, email),
        comments(
          id,
          species_id,
          author,
          content,
          created_at,
          author_profile:profiles!comments_author_fkey(id, display_name, email)
        )`,
      )
      .order("id", { ascending: false }),
    supabase.from("species_bookmarks").select("species_id").eq("user_id", sessionId),
  ]);

  const bookmarkIds = new Set<number>(
    (speciesBookmarks ?? []).map((bookmark: Pick<SpeciesBookmark, "species_id">) => bookmark.species_id),
  );
  const speciesRows = (species ?? []) as Omit<SpeciesWithAuthorProfile, "isBookmarked">[];
  const speciesWithAuthor: SpeciesWithAuthorProfile[] = speciesRows.map((entry) => ({
    ...entry,
    isBookmarked: bookmarkIds.has(entry.id),
  }));

  return (
    <>
      {/* Page heading + create-action control row. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species List</TypographyH2>
        {/* Pass current user id so new records can be attributed to the signed-in user. */}
        <AddSpeciesDialog userId={sessionId} />
      </div>
      <Separator className="my-4" />
      {/* Pass both data and auth context so child components can enforce owner-only actions. */}
      <SpeciesList species={speciesWithAuthor} currentUserId={sessionId} />
    </>
  );
}
