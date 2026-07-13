// Heuristic revenue estimator. Maps a headcount band to a rough annual
// revenue range. Pure and deterministic — no external calls, never throws.

export function estimateRevenue(
  employeeCount?: number,
  _industry?: string,
): string {
  // Without a headcount we can't infer a band with any confidence.
  if (employeeCount == null || !Number.isFinite(employeeCount) || employeeCount < 0) {
    return "Unknown";
  }

  if (employeeCount < 10) return "$0-$1M";
  if (employeeCount < 50) return "$1M-$5M";
  if (employeeCount < 200) return "$5M-$25M";
  if (employeeCount < 1000) return "$25M-$100M";
  return "$100M+";
}
