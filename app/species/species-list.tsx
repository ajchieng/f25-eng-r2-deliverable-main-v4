"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import SpeciesCard from "./species-card";
import { ENDANGERMENT_PRIORITY, type SpeciesWithAuthorProfile } from "./types";

// Keep sort keys centralized so type inference and UI options stay in sync.
// Any new dropdown option should be added here and then handled in the comparator below.
const sortOptions = ["alphabetical", "endangerment", "population", "recently_added", "most_commented"] as const;
type SortOption = (typeof sortOptions)[number];
type EndangermentPriorityKey = keyof typeof ENDANGERMENT_PRIORITY;

// Type guard: dropdown values are strings at runtime, but we only accept known sort options.
function isSortOption(value: string): value is SortOption {
  return sortOptions.includes(value as SortOption);
}

export default function SpeciesList({ species, currentUserId }: { species: SpeciesWithAuthorProfile[]; currentUserId: string }) {
  // Source data arrives from the server page; this component only applies client-side presentation rules.
  // Text filter input state.
  const [searchQuery, setSearchQuery] = useState("");
  // Active ordering mode selected in dropdown.
  const [sortBy, setSortBy] = useState<SortOption>("alphabetical");
  // Toggle to constrain list to species authored by the current user.
  const [showMySpeciesOnly, setShowMySpeciesOnly] = useState(false);
  // Toggle to constrain list to saved species for the current user.
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Recompute visible list only when filter/sort inputs or source data change.
  // Pipeline: filter by ownership/bookmarks/search, then sort the remaining rows.
  const displayedSpecies = useMemo(() => {
    // Normalize user input once so filtering logic is case-insensitive and whitespace-tolerant.
    const normalizedQuery = searchQuery.trim().toLowerCase();

    // Keep entries that match scientific name, common name, or description.
    // Early returns below make each filter condition explicit and easy to adjust independently.
    const filtered = species.filter((entry: SpeciesWithAuthorProfile) => {
      // Optional ownership filter: only show records created by the logged-in user.
      if (showMySpeciesOnly && entry.author !== currentUserId) {
        return false;
      }

      // Optional bookmark filter: only show rows that were marked as bookmarked.
      if (showBookmarkedOnly && !entry.isBookmarked) {
        return false;
      }

      // If search is blank, keep the entry as long as toggle-based filters passed.
      if (!normalizedQuery) {
        return true;
      }

      // Match against primary display fields users are likely to search.
      const scientificNameMatch = entry.scientific_name.toLowerCase().includes(normalizedQuery);
      const commonNameMatch = entry.common_name?.toLowerCase().includes(normalizedQuery) ?? false;
      const descriptionMatch = entry.description?.toLowerCase().includes(normalizedQuery) ?? false;

      return scientificNameMatch || commonNameMatch || descriptionMatch;
    });

    // Sort a shallow copy so we never mutate the filtered/source arrays.
    return [...filtered].sort((a: SpeciesWithAuthorProfile, b: SpeciesWithAuthorProfile) => {
      // Population sort puts known, larger values first.
      if (sortBy === "population") {
        // Unknown populations are treated as the smallest value so known values rank first.
        const aPopulation = a.total_population ?? Number.NEGATIVE_INFINITY;
        const bPopulation = b.total_population ?? Number.NEGATIVE_INFINITY;

        if (aPopulation !== bPopulation) {
          // Descending order (largest population first).
          return bPopulation - aPopulation;
        }
      // Endangerment sort uses a numeric priority lookup from `types.ts`.
      } else if (sortBy === "endangerment") {
        // Map status labels to numeric severity for consistent sorting.
        const aPriority = ENDANGERMENT_PRIORITY[a.endangerment_status as EndangermentPriorityKey] ?? Number.NEGATIVE_INFINITY;
        const bPriority = ENDANGERMENT_PRIORITY[b.endangerment_status as EndangermentPriorityKey] ?? Number.NEGATIVE_INFINITY;

        if (aPriority !== bPriority) {
          // Descending order (most endangered first).
          return bPriority - aPriority;
        }
      // Recently added uses descending id because ids are monotonic identity values.
      } else if (sortBy === "recently_added") {
        // `id` is an auto-incrementing identity column, so larger ids are newer inserts.
        if (a.id !== b.id) {
          // Descending order (newest first).
          return b.id - a.id;
        }
      // Most commented uses the current in-memory comment array length.
      } else if (sortBy === "most_commented") {
        const aCommentCount = a.comments?.length ?? 0;
        const bCommentCount = b.comments?.length ?? 0;

        if (aCommentCount !== bCommentCount) {
          // Descending order (highest comment count first).
          return bCommentCount - aCommentCount;
        }
      }

      // Stable fallback so output remains deterministic when primary metric ties.
      return a.scientific_name.localeCompare(b.scientific_name);
    });
  }, [searchQuery, sortBy, species, showBookmarkedOnly, showMySpeciesOnly, currentUserId]);

  return (
    <>
      {/* Search + sort controls. */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        {/* Search input updates filter state immediately as user types. */}
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by scientific name, common name, or description..."
          aria-label="Search species by name or description"
          className="sm:flex-1"
        />
        <Select
          // Validate incoming value before updating state.
          onValueChange={(value) => {
            if (isSortOption(value)) {
              setSortBy(value);
            }
          }}
          value={sortBy}
        >
          <SelectTrigger className="sm:w-[300px]">
            <SelectValue placeholder="Sort species" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
              <SelectItem value="endangerment">Endangerment (most endangered first)</SelectItem>
              <SelectItem value="population">Population (largest first)</SelectItem>
              <SelectItem value="recently_added">Most recently added</SelectItem>
              <SelectItem value="most_commented">Most commented</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={showMySpeciesOnly ? "default" : "outline"}
          onClick={() => setShowMySpeciesOnly((currentValue) => !currentValue)}
          className="sm:w-[190px]"
        >
          {showMySpeciesOnly ? "Showing My Species" : "My Species Only"}
        </Button>
        <Button
          type="button"
          variant={showBookmarkedOnly ? "default" : "outline"}
          onClick={() => setShowBookmarkedOnly((currentValue) => !currentValue)}
          className="sm:w-[220px]"
        >
          {showBookmarkedOnly ? "Showing Bookmarked" : "Show Bookmarked Only"}
        </Button>
      </div>
      {/* Render one card per visible species with owner context for edit/delete controls. */}
      <div className="flex flex-wrap justify-center">
        {displayedSpecies.map((entry) => (
          <SpeciesCard key={entry.id} species={entry} currentUserId={currentUserId} />
        ))}
      </div>
      {/* Empty-state feedback when filter removes all results. */}
      {!displayedSpecies.length ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {showMySpeciesOnly && showBookmarkedOnly
            ? "No bookmarked species you added match your search."
            : showMySpeciesOnly
              ? "No species you added match your search."
              : showBookmarkedOnly
                ? "No bookmarked species match your search."
                : "No species match your search."}
        </p>
      ) : null}
    </>
  );
}
