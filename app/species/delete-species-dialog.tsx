"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DeleteSpeciesDialogProps {
  speciesId: number;
  scientificName: string;
  userId: string;
}

export default function DeleteSpeciesDialog({ speciesId, scientificName, userId }: DeleteSpeciesDialogProps) {
  const router = useRouter();
  // Controlled dialog state enables programmatic close on successful delete.
  const [open, setOpen] = useState(false);
  // Loading flag prevents duplicate delete requests.
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const supabase = createBrowserSupabaseClient();
    // Owner check is duplicated server-side via RLS; this is defense-in-depth on query.
    const { error } = await supabase.from("species").delete().eq("id", speciesId).eq("author", userId);

    if (error != null) {
      setIsDeleting(false);
      return toast({
        title: "Could not delete species.",
        description: error.message,
        variant: "destructive",
      });
    }

    // Close dialog and refresh species list after successful deletion.
    setOpen(false);
    setIsDeleting(false);
    router.refresh();

    return toast({
      title: "Species deleted.",
      description: `Removed ${scientificName}.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          {/* Confirmation copy includes species name for clarity. */}
          <DialogTitle>Delete this species?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently remove <span className="font-medium">{scientificName}</span>.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete species"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
