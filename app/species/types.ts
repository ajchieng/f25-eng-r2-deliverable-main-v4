/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import type { Database } from "@/lib/schema";

// Raw species row from Supabase.
export type Species = Database["public"]["Tables"]["species"]["Row"];
// Raw bookmark row from Supabase.
export type SpeciesBookmark = Database["public"]["Tables"]["species_bookmarks"]["Row"];
// Enum aliases keep component props concise and strongly typed.
export type Kingdom = Database["public"]["Enums"]["kingdom"];
export type EndangermentStatus = Database["public"]["Enums"]["endangerment_status"];

// Profile fields surfaced in species/comment UIs.
export type SpeciesAuthorProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "email"
>;
// Raw comment row from Supabase.
export type SpeciesComment = Database["public"]["Tables"]["comments"]["Row"];
// Comment plus optional joined author profile payload.
export type CommentWithAuthorProfile = SpeciesComment & {
  author_profile: SpeciesAuthorProfile | null;
};

// Species row plus related author and comments used by the species page.
export type SpeciesWithAuthorProfile = Species & {
  author_profile: SpeciesAuthorProfile | null;
  comments: CommentWithAuthorProfile[];
  isBookmarked: boolean;
};

// Fixed kingdom option list shared by forms/select controls.
export const KINGDOMS = [
  "Animalia",
  "Plantae",
  "Fungi",
  "Protista",
  "Archaea",
  "Bacteria",
] as const satisfies readonly Kingdom[];

// Fixed endangerment option list shared by forms/select controls.
export const ENDANGERMENT_STATUSES = [
  "Not Evaluated",
  "Data Deficient",
  "Least Concern",
  "Near Threatened",
  "Vulnerable",
  "Endangered",
  "Critically Endangered",
  "Extinct in the Wild",
  "Extinct",
] as const satisfies readonly EndangermentStatus[];

// Numeric severity mapping used for deterministic sort order in species lists.
export const ENDANGERMENT_PRIORITY: Record<EndangermentStatus, number> = {
  "Not Evaluated": -1,
  "Data Deficient": 0,
  "Least Concern": 1,
  "Near Threatened": 2,
  Vulnerable: 3,
  Endangered: 4,
  "Critically Endangered": 5,
  "Extinct in the Wild": 6,
  Extinct: 7,
};
