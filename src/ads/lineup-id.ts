import type { AdFeedSource } from "../types";

/** Returns lineup_id from feed source. */
export function lineupIdFromSource(source?: AdFeedSource | null): string {
  return source?.lineup_id?.trim() ?? "";
}
