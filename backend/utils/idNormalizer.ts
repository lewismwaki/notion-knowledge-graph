// Helper function to normalize Notion UUIDs for consistent usage in the graph
export function normalizeId(id: string): string {
  // Remove any hyphens and ensure consistent format
  return id.replace(/-/g, '');
}
