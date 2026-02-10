"use client";

/**
 * File overview:
 * Contains UI or data logic for a comment feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { createBrowserSupabaseClient } from "@/lib/client-utils";
import { useEffect, useMemo, useState } from "react";
import type { CommentWithAuthorProfile } from "./types";

const COMMENT_MAX_LENGTH = 500;

function getSortedByRecency(comments: CommentWithAuthorProfile[]) {
  // Newest-first ordering for timeline-like display.
  return [...comments].sort((a, b) => {
    const aTimestamp = new Date(a.created_at).getTime();
    const bTimestamp = new Date(b.created_at).getTime();
    return bTimestamp - aTimestamp;
  });
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }
  // Browser-localized timestamp for readable comment metadata.
  return date.toLocaleString();
}

interface SpeciesCommentsProps {
  speciesId: number;
  currentUserId: string;
  comments: CommentWithAuthorProfile[];
}

export default function SpeciesComments({ speciesId, currentUserId, comments }: SpeciesCommentsProps) {
  // Draft content of the new-comment text area.
  const [commentText, setCommentText] = useState("");
  // Prevent concurrent submit clicks while request is active.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tracks which comment is currently being deleted.
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null);
  // Local optimistic copy of server comments.
  const [localComments, setLocalComments] = useState<CommentWithAuthorProfile[]>(() => getSortedByRecency(comments));

  useEffect(() => {
    // Keep local state aligned with latest server data after parent refreshes.
    setLocalComments(getSortedByRecency(comments));
  }, [comments]);

  // Cache sorted comments so re-renders from typing do not re-sort unnecessarily.
  const sortedComments = useMemo(() => getSortedByRecency(localComments), [localComments]);

  const handleSubmitComment = async () => {
    if (isSubmitting) {
      return;
    }

    // Normalize and validate before any network call.
    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      return toast({
        title: "Comment cannot be empty.",
        variant: "destructive",
      });
    }

    if (trimmedComment.length > COMMENT_MAX_LENGTH) {
      return toast({
        title: "Comment is too long.",
        description: `Comments cannot be longer than ${COMMENT_MAX_LENGTH} characters.`,
        variant: "destructive",
      });
    }

    setIsSubmitting(true);
    const supabase = createBrowserSupabaseClient();
    // Insert comment row and request inserted payload in one roundtrip.
    const { data, error } = await supabase
      .from("comments")
      .insert([{ species_id: speciesId, author: currentUserId, content: trimmedComment }])
      .select("id, species_id, author, content, created_at")
      .single();
    setIsSubmitting(false);

    if (error != null) {
      return toast({
        title: "Could not post comment.",
        description: error.message,
        variant: "destructive",
      });
    }

    if (data == null) {
      return toast({
        title: "Could not post comment.",
        description: "No data returned from database.",
        variant: "destructive",
      });
    }

    // Add the newly-created row to local state so users see it immediately.
    const newComment: CommentWithAuthorProfile = {
      ...data,
      author_profile: null,
    };
    setLocalComments((previousComments) => getSortedByRecency([newComment, ...previousComments]));
    setCommentText("");

    return toast({
      title: "Comment posted.",
    });
  };

  const handleDeleteComment = async (commentId: number) => {
    // Keep deletion state per comment for button-level loading text.
    setDeletingCommentId(commentId);
    const supabase = createBrowserSupabaseClient();
    // Author filter ensures users can only remove their own comments from this client path.
    const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("author", currentUserId);
    setDeletingCommentId(null);

    if (error) {
      return toast({
        title: "Could not delete comment.",
        description: error.message,
        variant: "destructive",
      });
    }

    setLocalComments((previousComments) => previousComments.filter((comment) => comment.id !== commentId));

    return toast({
      title: "Comment deleted.",
    });
  };

  return (
    <section className="mt-6 border-t pt-4">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Comments</h4>

      {/* Comment composer. */}
      <div className="mt-3 space-y-2">
        <Textarea
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Add a comment about this species..."
          className="min-h-20 resize-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {commentText.length}/{COMMENT_MAX_LENGTH}
          </p>
          <Button type="button" onClick={() => void handleSubmitComment()} disabled={isSubmitting}>
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
      </div>

      {!sortedComments.length ? (
        <p className="mt-4 text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        // Existing comments list.
        <ul className="mt-4 space-y-3">
          {sortedComments.map((comment) => {
            const isOwner = comment.author === currentUserId;
            const isDeletingThisComment = deletingCommentId === comment.id;
            // Prefer display_name, then a fallback label for own comments, then email.
            const authorName =
              comment.author_profile?.display_name ??
              (isOwner ? "You" : comment.author_profile?.email) ??
              "Unknown user";

            return (
              <li key={comment.id} className="rounded border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{authorName}</p>
                    <p className="text-xs text-muted-foreground">{formatCreatedAt(comment.created_at)}</p>
                  </div>
                  {isOwner ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => void handleDeleteComment(comment.id)}
                      disabled={isDeletingThisComment}
                    >
                      {isDeletingThisComment ? "Deleting..." : "Delete"}
                    </Button>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.content}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
