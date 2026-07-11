import type { AdFeedSource } from "../types";

/** Returns lineup id from feed source (lineup_id preferred, group_id fallback). */
export function lineupIdFromSource(source?: AdFeedSource | null): string {
  if (!source) {
    return "";
  }
  const lineupId = source.lineup_id?.trim();
  if (lineupId) {
    return lineupId;
  }
  return source.group_id?.trim() ?? "";
}
