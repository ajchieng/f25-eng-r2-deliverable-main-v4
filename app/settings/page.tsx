/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { redirect } from "next/navigation";

export default function Settings() {
  // Redirect the settings index route to the default subsection.
  // This keeps URL behavior predictable for bookmarks and navbar links.
  redirect("/settings/general");
}
