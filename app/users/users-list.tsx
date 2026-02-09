"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { type Database } from "@/lib/schema";
import { useRouter } from "next/navigation";
import { useState } from "react";

const BIOGRAPHY_MAX_LENGTH = 160;

type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "biography" | "display_name" | "email" | "id">;

export default function UsersList({ profiles, currentUserId }: { profiles: Profile[]; currentUserId: string }) {
  // Local list lets us reflect edits immediately without waiting for a full refetch.
  const [allProfiles, setAllProfiles] = useState<Profile[]>(profiles);
  // Only one profile can be edited at a time (the current user card).
  const [isEditingOwnBiography, setIsEditingOwnBiography] = useState(false);
  const [isSavingBiography, setIsSavingBiography] = useState(false);
  // Draft state for textarea while editing.
  const [biographyDraft, setBiographyDraft] = useState(
    profiles.find((profile) => profile.id === currentUserId)?.biography ?? "",
  );

  const router = useRouter();

  const currentUserProfile = allProfiles.find((profile) => profile.id === currentUserId) ?? null;

  const handleStartEditing = () => {
    // Initialize textarea with latest saved biography before entering edit mode.
    setBiographyDraft(currentUserProfile?.biography ?? "");
    setIsEditingOwnBiography(true);
  };

  const handleCancelEditing = () => {
    // Revert draft back to saved value and exit edit mode.
    setBiographyDraft(currentUserProfile?.biography ?? "");
    setIsEditingOwnBiography(false);
  };

  const handleSaveBiography = async () => {
    // Trim whitespace so empty-looking biographies are treated consistently.
    const trimmedBiography = biographyDraft.trim();

    if (trimmedBiography.length > BIOGRAPHY_MAX_LENGTH) {
      return toast({
        title: "Biography is too long.",
        description: `Biography cannot be longer than ${BIOGRAPHY_MAX_LENGTH} characters.`,
        variant: "destructive",
      });
    }

    const biographyForUpdate = trimmedBiography === "" ? null : trimmedBiography;

    setIsSavingBiography(true);
    const supabase = createBrowserSupabaseClient();
    // Update only the current user's biography field.
    const { error } = await supabase.from("profiles").update({ biography: biographyForUpdate }).eq("id", currentUserId);
    setIsSavingBiography(false);

    if (error) {
      return toast({
        title: "Something went wrong.",
        description: error.message,
        variant: "destructive",
      });
    }

    setAllProfiles((previousProfiles) =>
      previousProfiles.map((profile) =>
        profile.id === currentUserId ? { ...profile, biography: biographyForUpdate } : profile,
      ),
    );

    // Exit editing mode and refresh server-rendered surfaces that show profile data.
    setIsEditingOwnBiography(false);
    router.refresh();

    return toast({
      title: "Biography updated!",
    });
  };

  if (!allProfiles.length) {
    return <p className="text-sm text-muted-foreground">No users found.</p>;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allProfiles.map((profile) => {
        // Compute per-card UI states.
        const isCurrentUser = profile.id === currentUserId;
        const isEditingCard = isCurrentUser && isEditingOwnBiography;
        const originalBiography = currentUserProfile?.biography ?? "";
        const isUnchanged = biographyDraft.trim() === originalBiography.trim();

        return (
          <article key={profile.id} className="rounded border p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl font-semibold tracking-tight">{profile.display_name}</h3>
              {isCurrentUser ? <span className="rounded bg-muted px-2 py-1 text-xs font-medium">You</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>

            {isEditingCard ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={biographyDraft}
                  onChange={(event) => setBiographyDraft(event.target.value)}
                  maxLength={BIOGRAPHY_MAX_LENGTH}
                  placeholder="Tell others about yourself..."
                  className="min-h-24 resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {biographyDraft.length}/{BIOGRAPHY_MAX_LENGTH}
                </p>
                <div className="flex gap-2">
                  <Button onClick={() => void handleSaveBiography()} disabled={isSavingBiography || isUnchanged}>
                    {isSavingBiography ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="secondary" onClick={handleCancelEditing} disabled={isSavingBiography}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6">{profile.biography ?? "No biography provided."}</p>
            )}

            {isCurrentUser && !isEditingCard ? (
              <Button variant="secondary" className="mt-3" onClick={handleStartEditing}>
                Edit My Biography
              </Button>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
