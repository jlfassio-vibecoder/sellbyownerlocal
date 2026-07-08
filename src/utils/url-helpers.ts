const FIRESTORE_AUTO_ID_PATTERN = /^[a-zA-Z0-9]{20}$/;
const HYBRID_SLUG_YEAR_PREFIX = /^\d{4}-/;
const MAX_FIRESTORE_ID_CANDIDATES = 8;

export interface VehicleSlugInput {
  year: number;
  make: string;
  model: string;
  id: string;
}

export function slugifyVehiclePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateVehicleSlug(vehicle: VehicleSlugInput): string {
  const { year, make, model, id } = vehicle;
  return `${year}-${slugifyVehiclePart(make)}-${slugifyVehiclePart(model)}-${id}`;
}

export function parseFirestoreIdFromSlug(slug: string): string {
  if (!HYBRID_SLUG_YEAR_PREFIX.test(slug)) {
    return slug;
  }

  const lastSegment = slug.split('-').pop();
  if (lastSegment && FIRESTORE_AUTO_ID_PATTERN.test(lastSegment)) {
    return lastSegment;
  }

  return slug;
}

export function resolveFirestoreIdCandidates(slug: string): string[] {
  const candidates = new Set<string>([parseFirestoreIdFromSlug(slug), slug]);

  const yearMatch = slug.match(/^\d{4}-(.+)$/);
  if (yearMatch) {
    const parts = yearMatch[1]!.split('-');
    for (let i = 1; i < parts.length; i++) {
      candidates.add(parts.slice(i).join('-'));
    }
  }

  return [...candidates].slice(0, MAX_FIRESTORE_ID_CANDIDATES);
}

export function getVehicleListingPath(vehicle: VehicleSlugInput): string {
  return `/vehicles/${generateVehicleSlug(vehicle)}`;
}
