// Google Maps (Places API) lead source.
//
// Finds local businesses by a text query like "dentists in Delhi".
// Uses the new Places API (Text Search) when GOOGLE_MAPS_API_KEY is set;
// otherwise returns realistic MOCK data so the whole pipeline still runs today.

import type { RawLead } from "../types";

type PlacesResult = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  primaryType?: string;
};

export async function fetchGoogleMapsLeads(
  query: string,
  limit = 20,
): Promise<RawLead[]> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return mockLeads(query, limit);

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.primaryType",
    },
    body: JSON.stringify({ textQuery: query, pageSize: Math.min(limit, 20) }),
  });

  if (!res.ok) {
    console.error("[leadgen] Google Places error:", res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as { places?: PlacesResult[] };
  return (data.places ?? []).map((p) => ({
    name: p.displayName?.text ?? "Unknown",
    company: p.displayName?.text ?? "Unknown",
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
    website: p.websiteUri,
    address: p.formattedAddress,
    category: p.primaryType,
    source: "google_maps" as const,
    sourceId: p.id,
    raw: p as Record<string, unknown>,
  }));
}

// --- mock fallback (no API key needed) -----------------------------------
function mockLeads(query: string, limit: number): RawLead[] {
  const category = query.split(" in ")[0]?.trim() || "business";
  const city = query.split(" in ")[1]?.trim() || "your city";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const suffixes = ["Hub", "Care", "Point", "Studio", "Solutions", "Zone", "Works", "Central", "Pro", "Express"];
  return Array.from({ length: limit }, (_, i) => {
    const brand = `${cap(category)} ${suffixes[i % suffixes.length]}`;
    const slug = brand.toLowerCase().replace(/[^a-z]+/g, "");
    return {
      name: brand,
      company: brand,
      email: `info@${slug}.com`,
      phone: `+91 ${90000 + i}${String(10000 + i).slice(-5)}`,
      website: `https://${slug}.com`,
      address: `${i + 1} Main Rd, ${city}`,
      category,
      source: "google_maps" as const,
      sourceId: `mock-${slug}-${i}`,
    };
  });
}
