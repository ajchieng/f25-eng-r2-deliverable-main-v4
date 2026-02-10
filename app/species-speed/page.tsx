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
        <p className="text-muted-foreground">
          This page compares the speed of animals based on their diet, endangerment status, and weight. The diet chart compares average speed and spread across herbivores, omnivores, and carnivores. The weight chart maps speed against body mass on a log scale so very
          small and very large species can be compared in the same frame. The endangerment chart summarizes average speed
          by conservation status. 
        </p>
      </section>

      {/* Client component that loads CSV files and renders all three D3 charts. */}
      <AnimalSpeedGraph />
    </>
  );
}
