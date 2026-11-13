// Customer Health Drop rule (pure, no imports — shared by the engine, the customers action and tests).
// Fires when a customer's health score falls from >= 60 to below 60 — the same cut-off the
// Customers page uses for its "Low Health Score" risk factor.
export const HEALTH_DROP_THRESHOLD = 60;

export function crossedHealthThreshold(prev: number | null | undefined, next: number | null | undefined): boolean {
  return typeof prev === "number" && typeof next === "number" && prev >= HEALTH_DROP_THRESHOLD && next < HEALTH_DROP_THRESHOLD;
}
