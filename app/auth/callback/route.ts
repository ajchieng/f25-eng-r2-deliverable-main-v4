import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// TODO Type errors in this file should ideally be fixed, although this is code adapted straight from Supabase docs
// https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr#create-api-endpoint-for-handling-the-code-exchange

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error") ?? searchParams.get("error_description");

  if (code) {
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
      return NextResponse.redirect(`${origin}/species`);
    }

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
