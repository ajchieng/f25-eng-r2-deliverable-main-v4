/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { TypographyH2 } from "@/components/ui/typography";

export default function Loading() {
  // App Router renders this while server components/data are still resolving.
  return <TypographyH2>Loading...</TypographyH2>;
}
