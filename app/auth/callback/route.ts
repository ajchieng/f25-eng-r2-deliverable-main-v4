/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// TODO Type errors in this file should ideally be fixed, although this is code adapted straight from Supabase docs
// https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr#create-api-endpoint-for-handling-the-code-exchange

export async function GET(request: Request) {
  // Read PKCE callback query params returned by Supabase auth flow.
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error") ?? searchParams.get("error_description");

  if (code) {
    // Rehydrate cookie store so Supabase can persist the exchanged session.
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              cookieStore.set({ name, value, ...options });
            });
          },
        },
      },
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Successful exchange: send user to first protected page.
      return NextResponse.redirect(`${origin}/species`);
    }

    // Bubble provider error reason into error route query string for visibility.
    console.error("Supabase auth code exchange failed:", error);
    return NextResponse.redirect(
      `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error.message)}`,
    );
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/auth/auth-code-error?reason=${encodeURIComponent(error ?? "missing_code")}`,
  );
}
