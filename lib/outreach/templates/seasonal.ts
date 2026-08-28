// Phase 33 — Birthday/Seasonal Auto-Campaigns. Pre-written templates —
// extends the existing lib/outreach/lib/messaging senders, not a new engine.

export function birthdayMessage(customerName: string): string {
  const name = customerName.split(" ")[0] || customerName;
  return `Happy Birthday, ${name}! 🎉 We're grateful to have you as a customer — enjoy your special day, from all of us.`;
}

export function festivalGreeting(customerName: string, festival: string): string {
  const name = customerName.split(" ")[0] || customerName;
  return `Wishing you and your loved ones a wonderful ${festival}, ${name}! Thank you for being part of our journey.`;
}

export function winBackMessage(customerName: string): string {
  const name = customerName.split(" ")[0] || customerName;
  return `Hi ${name}, we've missed you! It's been a while — come back and see what's new. Reply here anytime.`;
}
