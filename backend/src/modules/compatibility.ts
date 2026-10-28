const LEVELS = ['junior', 'mid', 'senior', 'lead'];

export function jaccard(left: string[], right: string[]): number {
  const a = new Set(left.map((value) => value.toLowerCase()));
  const b = new Set(right.map((value) => value.toLowerCase()));
  if (a.size === 0 && b.size === 0) return 0.5;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function cosineBinary(left: string[], right: string[]): number {
  const a = new Set(left.map((value) => value.toLowerCase()));
  const b = new Set(right.map((value) => value.toLowerCase()));
  if (a.size === 0 && b.size === 0) return 0.5;
  let intersection = 0;
  for (const value of a) if (b.has(value)) intersection += 1;
  const denom = Math.sqrt(a.size) * Math.sqrt(b.size);
  return denom === 0 ? 0 : intersection / denom;
}

export function experienceScore(left?: string | null, right?: string | null): number {
  if (!left || !right) return 0.5;
  const ia = LEVELS.indexOf(left);
  const ib = LEVELS.indexOf(right);
  if (ia < 0 || ib < 0) return 0.5;
  const distance = Math.abs(ia - ib);
  if (distance === 0) return 1;
  if (distance === 1) return 0.5;
  return 0;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earth = 6371;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function locationScore(
  aLat: number | null,
  aLon: number | null,
  bLat: number | null,
  bLon: number | null,
): number {
  if (aLat == null || aLon == null || bLat == null || bLon == null) return 0.5;
  return 1 / (1 + haversineKm(aLat, aLon, bLat, bLon) / 100);
}

export interface CompatibilityParts {
  tech: number;
  interests: number;
  experience: number;
  location: number;
  collaborative: number;
}

export function combineScore(parts: CompatibilityParts): number {
  const value =
    0.35 * parts.tech +
    0.2 * parts.interests +
    0.1 * parts.experience +
    0.1 * parts.location +
    0.25 * parts.collaborative;
  return Math.round(value * 1000) / 10;
}
