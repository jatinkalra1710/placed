export type CitySlug =
  | "chandigarh"
  | "delhi_ncr"
  | "pune"
  | "bangalore"
  | "hyderabad"
  | "kolkata"
  | "chennai"
  | "mumbai";

export interface CityMeta {
  slug: CitySlug;
  name: string;
  code: string; // airport-style 3-letter board code
  color: string; // per-city accent hex, used across directory/landing/dashboard
}

export const CITIES: CityMeta[] = [
  { slug: "chandigarh", name: "Chandigarh", code: "CHD", color: "#F97316" },
  { slug: "delhi_ncr", name: "Delhi NCR (Noida / Gurgaon)", code: "DEL", color: "#F43F5E" },
  { slug: "pune", name: "Pune", code: "PNQ", color: "#8B5CF6" },
  { slug: "bangalore", name: "Bangalore", code: "BLR", color: "#10B981" },
  { slug: "hyderabad", name: "Hyderabad", code: "HYD", color: "#06B6D4" },
  { slug: "kolkata", name: "Kolkata", code: "CCU", color: "#EAB308" },
  { slug: "chennai", name: "Chennai", code: "MAA", color: "#3B82F6" },
  { slug: "mumbai", name: "Mumbai", code: "BOM", color: "#EC4899" },
];

export function cityBySlug(slug: string): CityMeta | undefined {
  return CITIES.find((c) => c.slug === slug);
}
