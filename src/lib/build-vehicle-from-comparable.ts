import type { MarketComparable, Vehicle, VehicleResponse } from '../schemas';

const UNSPECIFIED = 'Not specified';

export function promoteComparableBlockReason(comparable: MarketComparable): string | null {
  if (!(comparable.sourceUrl ?? '').trim()) {
    return 'Source URL is required to promote';
  }
  if (
    comparable.year == null ||
    Number.isNaN(comparable.year) ||
    comparable.year < 1900
  ) {
    return 'Year is required to promote';
  }
  if (!(comparable.make ?? '').trim()) {
    return 'Make is required to promote';
  }
  if (!(comparable.model ?? '').trim()) {
    return 'Model is required to promote';
  }
  if (!(comparable.price > 0) || Number.isNaN(comparable.price)) {
    return 'Price must be greater than 0 to promote';
  }
  if (
    comparable.mileage == null ||
    Number.isNaN(comparable.mileage) ||
    comparable.mileage < 0
  ) {
    return 'Mileage is required to promote';
  }
  return null;
}

/** Fields to sync onto an existing promoted dealer_comp vehicle when the parent comparable changes. */
export function buildPromotedComparablePatch(
  comparable: MarketComparable
): Record<string, unknown> | null {
  const blockReason = promoteComparableBlockReason(comparable);
  if (blockReason) {
    return null;
  }

  const year = comparable.year!;
  const make = comparable.make!.trim();
  const model = comparable.model!.trim();
  const trim = comparable.trim?.trim();
  const label = comparable.label.trim() || 'Dealer comparable';
  const exteriorColor = comparable.color?.trim() || UNSPECIFIED;
  const drivetrain = comparable.drivetrain?.trim() || UNSPECIFIED;
  const imageUrl = comparable.imageUrl?.trim();
  const images = imageUrl ? [imageUrl] : [];
  const differences = (comparable.differences ?? [])
    .map((d) => d.trim())
    .filter(Boolean);
  const features =
    differences.length > 0 ? differences.slice(0, 12) : ['Dealer comparable listing'];
  const listingTitle = [year, make, model, trim].filter(Boolean).join(' ');
  const description = [
    `${listingTitle} — dealer comparable promoted from ${label}.`,
    'This is an external dealer listing shown for market context. Contact and checkout are disabled on Sell By Owner Local.',
  ].join(' ');

  return {
    year,
    make,
    model,
    price: comparable.price,
    mileage: Math.trunc(comparable.mileage!),
    description,
    listingTitle,
    images,
    heroImageUrls: images,
    externalSourceUrl: comparable.sourceUrl!.trim(),
    specs: {
      exteriorColor,
      interiorColor: UNSPECIFIED,
      transmission: UNSPECIFIED,
      engine: UNSPECIFIED,
      drivetrain,
    },
    features,
  };
}

export function buildVehicleFromComparable(options: {
  parent: VehicleResponse;
  comparable: MarketComparable;
}): Vehicle {
  const { parent, comparable } = options;
  const blockReason = promoteComparableBlockReason(comparable);
  if (blockReason) {
    throw new Error(blockReason);
  }

  const year = comparable.year!;
  const make = comparable.make!.trim();
  const model = comparable.model!.trim();
  const trim = comparable.trim?.trim();
  const label = comparable.label.trim() || 'Dealer comparable';
  const exteriorColor = comparable.color?.trim() || UNSPECIFIED;
  const drivetrain = comparable.drivetrain?.trim() || UNSPECIFIED;
  const imageUrl = comparable.imageUrl?.trim();
  const images = imageUrl ? [imageUrl] : [];
  const differences = (comparable.differences ?? [])
    .map((d) => d.trim())
    .filter(Boolean);
  const features =
    differences.length > 0 ? differences.slice(0, 12) : ['Dealer comparable listing'];

  const listingTitle = [year, make, model, trim].filter(Boolean).join(' ');
  const description = [
    `${listingTitle} — dealer comparable promoted from ${label}.`,
    'This is an external dealer listing shown for market context. Contact and checkout are disabled on Sell By Owner Local.',
  ].join(' ');

  return {
    year,
    make,
    model,
    price: comparable.price,
    mileage: Math.trunc(comparable.mileage!),
    description,
    listingTitle,
    accentColor: parent.accentColor ?? 'red',
    images,
    heroImageUrls: images,
    carouselImageUrls: [],
    marketImageUrls: [],
    status: 'active',
    inventorySource: 'dealer_comp',
    externalSourceUrl: comparable.sourceUrl!.trim(),
    parentVehicleId: parent.id,
    sellerId: parent.sellerId,
    sellerName: parent.sellerName,
    location: parent.location,
    tags: ['dealer-comp'],
    createdAt: new Date().toISOString(),
    specs: {
      exteriorColor,
      interiorColor: UNSPECIFIED,
      transmission: UNSPECIFIED,
      engine: UNSPECIFIED,
      drivetrain,
    },
    features,
    modifications: [],
    modificationImageUrls: [],
    serviceRecords: [],
    smogCertificateUrls: [],
    historyReportUrls: [],
  };
}
