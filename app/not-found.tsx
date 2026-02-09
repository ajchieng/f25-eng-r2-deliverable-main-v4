/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { TypographyH3 } from "@/components/ui/typography";

// https://nextjs.org/docs/app/api-reference/file-conventions/not-found

export default function NotFound() {
  // Global fallback for unmatched routes.
  return <TypographyH3>404 - Page not found</TypographyH3>;
}
