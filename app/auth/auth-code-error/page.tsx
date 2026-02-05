import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TypographyH3, TypographyMuted } from "@/components/ui/typography";

export default function AuthCodeErrorPage({
  searchParams,
}: {
  searchParams?: { reason?: string };
}) {
  const reason = searchParams?.reason;
  const message =
    reason === "missing_code"
      ? "We did not receive an auth code from Supabase."
      : "We could not complete sign-in.";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-10">
      <TypographyH3>Sign-in failed</TypographyH3>
      <TypographyMuted>{message}</TypographyMuted>
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
