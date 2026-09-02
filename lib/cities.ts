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
}

export const CITIES: CityMeta[] = [
  { slug: "chandigarh", name: "Chandigarh", code: "CHD" },
  { slug: "delhi_ncr", name: "Delhi NCR (Noida / Gurgaon)", code: "DEL" },
  { slug: "pune", name: "Pune", code: "PNQ" },
  { slug: "bangalore", name: "Bangalore", code: "BLR" },
  { slug: "hyderabad", name: "Hyderabad", code: "HYD" },
  { slug: "kolkata", name: "Kolkata", code: "CCU" },
  { slug: "chennai", name: "Chennai", code: "MAA" },
  { slug: "mumbai", name: "Mumbai", code: "BOM" },
];

export function cityBySlug(slug: string): CityMeta | undefined {
  return CITIES.find((c) => c.slug === slug);
}
