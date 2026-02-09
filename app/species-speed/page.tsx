/**
 * File overview:
 * Server route for the Species Speed page.
 * Responsibilities:
 * - verify authenticated access
 * - render route-level heading + intro copy
 * - mount the client-side D3 chart component
 */

/* eslint-disable */
import { Separator } from "@/components/ui/separator";
import { TypographyH2 } from "@/components/ui/typography";
import { createServerSupabaseClient } from "@/lib/server-utils";
import { redirect } from "next/navigation";
import AnimalSpeedGraph from "./animal-speed-graph";

export default async function SpeciesSpeedPage() {
  // Build a server-side Supabase client scoped to the current request.
  const supabase = await createServerSupabaseClient();

  // Ask Supabase for the currently authenticated user.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // This route is private; anonymous users are redirected home.
  if (!user) {
    redirect("/");
  }

  // Render static route content plus the interactive client chart.
  return (
    <>
      {/* Title row for this feature page. */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <TypographyH2>Species Speed</TypographyH2>
        {/* Reserved space for future page-level controls (filters, export, etc.). */}
      </div>

      {/* Visual divider between heading and body content. */}
      <Separator className="my-4" />

      {/* Introductory narrative that explains what the chart is trying to show. */}
      <section className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">How Fast Are Animals?</h1>
        <p className="text-white-700">
          The animal kingdom is full of speedsters, from the lightning-fast cheetah to the surprisingly swift pronghorn
          antelope. But not all animals are built for speed—herbivores, omnivores, and carnivores have evolved different
          strategies for survival, and their top velocities reflect their lifestyles. Carnivores often rely on bursts of
          speed to catch prey, while herbivores may need to outrun predators, and omnivores fall somewhere in between.
          The graph below compares the velocities of various animals, grouped by their dietary category, to reveal
          fascinating patterns in nature’s race for survival.
        </p>
      </section>

      {/* Client component that loads CSV files and renders all three D3 charts. */}
      <AnimalSpeedGraph />
    </>
  );
}
