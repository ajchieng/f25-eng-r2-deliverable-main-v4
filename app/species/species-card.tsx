"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */
/*
Note: "use client" is a Next.js App Router directive that tells React to render the component as
a client component rather than a server component. This establishes the server-client boundary,
providing access to client-side functionality such as hooks and event handlers to this component and
any of its imported children. Although the SpeciesCard component itself does not use any client-side
functionality, it is beneficial to move it to the client because it is rendered in a list with a unique
key prop in species/page.tsx. When multiple component instances are rendered from a list, React uses the unique key prop
on the client-side to correctly match component state and props should the order of the list ever change.
React server components don't track state between rerenders, so leaving the uniquely identified components (e.g. SpeciesCard)
can cause errors with matching props and state in child components if the list order changes.
*/
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DeleteSpeciesDialog from "./delete-species-dialog";
import EditSpeciesDialog from "./edit-species-dialog";
import SpeciesComments from "./species-comments";
import type { SpeciesWithAuthorProfile } from "./types";

export default function SpeciesCard({
  species,
  currentUserId,
}: {
  species: SpeciesWithAuthorProfile;
  currentUserId: string;
}) {
  const router = useRouter();
  // Only the creator of a species row should see edit/delete controls.
  const isOwner = species.author === currentUserId;
  // Local bookmark state updates immediately while server data catches up after refresh.
  const [isBookmarked, setIsBookmarked] = useState(species.isBookmarked);
  // Guard against duplicate toggle clicks.
  const [isBookmarkSaving, setIsBookmarkSaving] = useState(false);

  useEffect(() => {
    setIsBookmarked(species.isBookmarked);
  }, [species.isBookmarked]);

  const handleToggleBookmark = async () => {
    if (isBookmarkSaving) {
      return;
    }

    setIsBookmarkSaving(true);
    const supabase = createBrowserSupabaseClient();
    const nextIsBookmarked = !isBookmarked;
    const { error } = nextIsBookmarked
      ? await supabase.from("species_bookmarks").insert([{ user_id: currentUserId, species_id: species.id }])
      : await supabase.from("species_bookmarks").delete().eq("user_id", currentUserId).eq("species_id", species.id);
    setIsBookmarkSaving(false);

    // Duplicate key means the row was already bookmarked in another tab/session.
    if (error != null && error.code !== "23505") {
      return toast({
        title: "Could not update bookmark.",
        description: error.message,
        variant: "destructive",
      });
    }

    setIsBookmarked(nextIsBookmarked);
    router.refresh();

    return toast({
      title: nextIsBookmarked ? "Species bookmarked." : "Bookmark removed.",
    });
  };

  return (
    // Compact summary card used in the species list grid.
    <div className="m-4 w-72 min-w-72 flex-none rounded border-2 p-3 shadow">
      {/* Show hero image only when a URL exists in the row. */}
      {species.image && (
        <div className="relative h-40 w-full">
          <Image src={species.image} alt={species.scientific_name} fill style={{ objectFit: "cover" }} />
        </div>
      )}
      <h3 className="mt-3 text-2xl font-semibold">{species.scientific_name}</h3>
      <h4 className="text-lg font-light italic">{species.common_name}</h4>
      {/* Compact preview text in the card; full content appears in the dialog. */}
      <p>{species.description ? species.description.slice(0, 150).trim() + "..." : ""}</p>
      <div className="mt-3 flex flex-col gap-2">
        <Button
          type="button"
          variant={isBookmarked ? "secondary" : "outline"}
          className="w-full"
          onClick={() => void handleToggleBookmark()}
          disabled={isBookmarkSaving}
        >
          {isBookmarkSaving ? (isBookmarked ? "Removing..." : "Saving...") : isBookmarked ? "Bookmarked" : "Bookmark"}
        </Button>
        {/* "Learn More" opens a detail dialog for the current species. */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full">Learn More</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{species.scientific_name}</DialogTitle>
              <DialogDescription>{species.common_name ?? "No common name listed."}</DialogDescription>
            </DialogHeader>
            {/* Use definition-list semantics for readable label/value species metadata. */}
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Scientific name</dt>
                <dd className="font-medium">{species.scientific_name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Common name</dt>
                <dd>{species.common_name ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Total population</dt>
                <dd>{species.total_population ?? "Unknown"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Kingdom</dt>
                <dd>{species.kingdom}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Endangerment status</dt>
                <dd>{species.endangerment_status}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Description</dt>
                <dd>{species.description ?? "No description available."}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Added by</dt>
                <dd>{species.author_profile?.display_name ?? "Unknown author"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-muted-foreground">Author email</dt>
                <dd>{species.author_profile?.email ?? "Unavailable"}</dd>
              </div>
            </dl>
            {/* Comment list + composer for this species. */}
            <SpeciesComments speciesId={species.id} currentUserId={currentUserId} comments={species.comments ?? []} />
          </DialogContent>
        </Dialog>
        {/* Owner-only controls for mutating this species row. */}
        {isOwner ? (
          <div className="grid grid-cols-2 gap-2">
            <EditSpeciesDialog species={species} />
            <DeleteSpeciesDialog
              speciesId={species.id}
              scientificName={species.scientific_name}
              userId={currentUserId}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
