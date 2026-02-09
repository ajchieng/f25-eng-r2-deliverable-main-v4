/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  // Show a friendlier default message, but preserve provider details when available.
  const reason = searchParams?.reason;
  const message =
    reason === "missing_code"
      ? "We did not receive an auth code from Supabase."
      : "We could not complete sign-in.";

  return (
    // Minimal recovery screen with clear action back to login.
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-10">
      <TypographyH3>Sign-in failed</TypographyH3>
      <TypographyMuted>{message}</TypographyMuted>
      {/* Display raw reason only for non-default failures to aid debugging. */}
      {reason && reason !== "missing_code" && (
        <TypographyMuted>Reason: {reason}</TypographyMuted>
      )}
      <div>
        <Button asChild>
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </div>
  );
}
