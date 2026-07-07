import type {
  GalleryPhoto,
  MarketValuation,
  PitchBlock,
  VehicleDashboardUpdate,
  VehicleDeductions,
  VehicleFormState,
  VehicleHighlight,
  VehicleResponse,
} from '../schemas';
import { resolveKbbReportUrl } from './kbb-report-url';
import { resolveSmogCertificateUrls } from './smog-certificate-url';
import { resolveOriginalStickerUrl } from './original-sticker-url';
import { resolveHistoryReportUrls } from './history-report-urls';
import {
  resolveCarouselImageUrls,
  resolveHeroImageUrls,
  resolveMarketImageUrls,
} from './resolve-display-media';

const DEFAULT_PITCH_BLOCKS: Pick<PitchBlock, 'title' | 'icon'>[] = [
  { title: 'The Peace of Mind Guarantee', icon: '🛡️' },
  { title: 'Recent Maintenance & Upgrades', icon: '🔧' },
  { title: 'The Ultimate Utility & Towing Rig', icon: '🧰' },
  { title: 'Luxury Options (Original $60k MSRP)', icon: '💎' },
];

const FORM_BLOCK_BODIES: (keyof VehicleFormState)[] = [
  'peaceOfMindText',
  'maintenanceText',
  'utilityTowingText',
  'luxuryOptionsText',
];

const FORM_BLOCK_IMAGE_KEYS: (keyof VehicleFormState)[] = [
  'pitchBlock0ImageUrls',
  'pitchBlock1ImageUrls',
  'pitchBlock2ImageUrls',
  'pitchBlock3ImageUrls',
];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

function formatMileage(value: number): string {
  return value.toLocaleString('en-US');
}

export function parseIntegerString(value: string): number {
  const cleaned = value.replace(/,/g, '').trim();
  const parsed = Number.parseInt(cleaned, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new Error('Invalid mileage');
  }
  return parsed;
}

export function parseCurrencyString(value: string): number {
  const cleaned = value.replace(/[$,\s]/g, '').trim();
  const parsed = Number.parseFloat(cleaned);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error('Invalid currency value');
  }
  return parsed;
}

function optionalString(value: string | undefined): string {
  return value ?? '';
}

function buildGalleryPhotos(state: VehicleFormState): GalleryPhoto[] {
  return (state.galleryPhotos ?? [])
    .filter((photo) => photo.url?.trim())
    .map((photo) => {
      const caption = optionalString(photo.caption).trim() || 'Vehicle photo';
      const alt = optionalString(photo.alt).trim() || caption;
      return {
        url: photo.url.trim(),
        category: optionalString(photo.category).trim() || 'Exterior',
        caption,
        alt,
      };
    });
}

function buildPitchBlocks(
  state: VehicleFormState,
  existing: VehicleResponse
): PitchBlock[] {
  const existingBlocks = existing.sellersNote?.blocks ?? [];

  return FORM_BLOCK_BODIES.map((bodyKey, index) => {
    const existingBlock = existingBlocks[index];
    const defaults = DEFAULT_PITCH_BLOCKS[index]!;
    const body = optionalString(state[bodyKey] as string | undefined);
    const imageUrls =
      (state[FORM_BLOCK_IMAGE_KEYS[index]!] as string[] | undefined) ?? [];

    return {
      title: existingBlock?.title ?? defaults.title,
      icon: existingBlock?.icon ?? defaults.icon,
      body: body || existingBlock?.body || '',
      ...(imageUrls.length > 0 ? { images: imageUrls } : {}),
    };
  });
}

function buildHighlights(state: VehicleFormState): VehicleHighlight[] {
  const highlights: VehicleHighlight[] = [];

  for (let i = 1; i <= 4; i++) {
    const title = optionalString(
      state[`highlight${i}Title` as keyof VehicleFormState] as string | undefined
    ).trim();
    const text = optionalString(
      state[`highlight${i}Text` as keyof VehicleFormState] as string | undefined
    ).trim();

    if (title && text) {
      highlights.push({ title, text });
    }
  }

  return highlights;
}

function buildMechanicalItems(state: VehicleFormState) {
  const items = [
    {
      title: optionalString(state.mechanicalItem1Title).trim(),
      text: optionalString(state.mechanicalItem1Text).trim(),
    },
    {
      title: optionalString(state.mechanicalItem2Title).trim(),
      text: optionalString(state.mechanicalItem2Text).trim(),
    },
    {
      title: optionalString(state.mechanicalItem3Title).trim(),
      text: optionalString(state.mechanicalItem3Text).trim(),
    },
  ].filter((item) => item.title && item.text);

  return items;
}

function sanitizeOptionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '' || Number.isNaN(value)) {
    return undefined;
  }
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
}

function sanitizeComparable(
  comparable: VehicleFormState['marketValuation']['comparables'][number]
) {
  const sourceUrl = optionalString(comparable.sourceUrl as string | undefined).trim();
  return {
    ...comparable,
    year: sanitizeOptionalNumber(comparable.year),
    mileage: sanitizeOptionalNumber(comparable.mileage),
    price: sanitizeOptionalNumber(comparable.price) ?? 0,
    sourceUrl: sourceUrl || undefined,
  };
}

function emptyMarketValuation(): VehicleFormState['marketValuation'] {
  return {
    contextText: '',
    dealerRealityText: '',
    kbbText: '',
    justificationText: '',
    comparables: [],
    retailReadyPrice: '',
    vehicleDeductions: {},
  };
}


function buildVehicleDeductions(
  deductions?: VehicleFormState['marketValuation']['vehicleDeductions']
): VehicleDeductions | undefined {
  if (!deductions) return undefined;

  const result: VehicleDeductions = {};
  const tires = sanitizeOptionalNumber(deductions.tires);
  const paint = sanitizeOptionalNumber(deductions.paint);
  const mechanical = sanitizeOptionalNumber(deductions.mechanical);
  const interior = sanitizeOptionalNumber(deductions.interior);
  const other = sanitizeOptionalNumber(deductions.other);
  const notes = optionalString(deductions.notes).trim();

  if (tires != null && tires > 0) result.tires = tires;
  if (paint != null && paint > 0) result.paint = paint;
  if (mechanical != null && mechanical > 0) result.mechanical = mechanical;
  if (interior != null && interior > 0) result.interior = interior;
  if (other != null && other > 0) result.other = other;
  if (notes) result.notes = notes;

  return Object.keys(result).length > 0 ? result : undefined;
}

function buildMarketValuation(state: VehicleFormState): MarketValuation | undefined {
  const mv = state.marketValuation ?? emptyMarketValuation();
  const contextText = optionalString(mv.contextText).trim();
  const dealerRealityText = optionalString(mv.dealerRealityText).trim();
  const kbbText = optionalString(mv.kbbText).trim();
  const justificationText = optionalString(mv.justificationText).trim();
  const retailReadyRaw = optionalString(mv.retailReadyPrice).trim();
  let retailReadyPrice: number | undefined;
  if (retailReadyRaw) {
    retailReadyPrice = parseCurrencyString(retailReadyRaw);
  }
  const vehicleDeductions = buildVehicleDeductions(mv.vehicleDeductions);
  const comparables = (mv.comparables ?? [])
    .map(sanitizeComparable)
    .filter((c) => c.label.trim() && c.price > 0)
    .map((c) => ({
      label: c.label.trim(),
      price: c.price,
      ...(c.mileage != null && c.mileage >= 0 ? { mileage: c.mileage } : {}),
      ...(c.highlighted ? { highlighted: true } : {}),
      ...(c.year != null && c.year > 0 ? { year: c.year } : {}),
      ...(c.make?.trim() ? { make: c.make.trim() } : {}),
      ...(c.model?.trim() ? { model: c.model.trim() } : {}),
      ...(c.trim?.trim() ? { trim: c.trim.trim() } : {}),
      ...(c.drivetrain?.trim() ? { drivetrain: c.drivetrain.trim() } : {}),
      ...(c.color?.trim() ? { color: c.color.trim() } : {}),
      ...(c.sourceUrl?.trim() ? { sourceUrl: c.sourceUrl.trim() } : {}),
    }));

  if (
    !contextText &&
    !dealerRealityText &&
    !kbbText &&
    !justificationText &&
    comparables.length === 0 &&
    retailReadyPrice == null &&
    !vehicleDeductions
  ) {
    return undefined;
  }

  return {
    ...(contextText ? { contextText } : {}),
    ...(dealerRealityText ? { dealerRealityText } : {}),
    ...(kbbText ? { kbbText } : {}),
    ...(justificationText ? { justificationText } : {}),
    ...(retailReadyPrice != null ? { retailReadyPrice } : {}),
    ...(vehicleDeductions ? { vehicleDeductions } : {}),
    comparables,
  };
}

export function vehicleToFormState(vehicle: VehicleResponse): VehicleFormState {
  const blocks = vehicle.sellersNote?.blocks ?? [];
  const mechanicalItems = vehicle.mechanicalIntegrity?.items ?? [];
  const highlights = vehicle.highlights ?? [];

  return {
    listingTitle: vehicle.listingTitle ?? '',
    description: vehicle.description,
    drivetrain: vehicle.specs.drivetrain,
    locationCity: vehicle.location.city,
    mileage: formatMileage(vehicle.mileage),
    price: formatCurrency(vehicle.price),
    originalStickerUrl: resolveOriginalStickerUrl(vehicle) ?? '',
    historyReportUrls: resolveHistoryReportUrls(vehicle),
    kbbReportUrl: resolveKbbReportUrl(vehicle) ?? '',
    smogCertificateUrls: resolveSmogCertificateUrls(vehicle),
    subtitle: vehicle.sellersNote?.subtitle ?? '',
    msrp: vehicle.sellersNote?.originalMsrp
      ? formatCurrency(vehicle.sellersNote.originalMsrp)
      : '',
    sellersNoteIntro: vehicle.sellersNote?.intro ?? '',
    peaceOfMindText: blocks[0]?.body ?? '',
    maintenanceText: blocks[1]?.body ?? '',
    utilityTowingText: blocks[2]?.body ?? '',
    luxuryOptionsText: blocks[3]?.body ?? '',
    pitchBlock0ImageUrls: blocks[0]?.images ?? [],
    pitchBlock1ImageUrls: blocks[1]?.images ?? [],
    pitchBlock2ImageUrls: blocks[2]?.images ?? [],
    pitchBlock3ImageUrls: blocks[3]?.images ?? [],
    ctaText: vehicle.sellersNote?.ctaText ?? '',
    mechanicalIntegrityIntro: vehicle.mechanicalIntegrity?.intro ?? '',
    mechanicalItem1Title: mechanicalItems[0]?.title ?? '',
    mechanicalItem1Text: mechanicalItems[0]?.text ?? '',
    mechanicalItem2Title: mechanicalItems[1]?.title ?? '',
    mechanicalItem2Text: mechanicalItems[1]?.text ?? '',
    mechanicalItem3Title: mechanicalItems[2]?.title ?? '',
    mechanicalItem3Text: mechanicalItems[2]?.text ?? '',
    marketValuation: vehicle.marketValuation
      ? {
          contextText: vehicle.marketValuation.contextText ?? '',
          dealerRealityText: vehicle.marketValuation.dealerRealityText ?? '',
          kbbText: vehicle.marketValuation.kbbText ?? '',
          justificationText: vehicle.marketValuation.justificationText ?? '',
          comparables: vehicle.marketValuation.comparables ?? [],
          retailReadyPrice: vehicle.marketValuation.retailReadyPrice
            ? formatCurrency(vehicle.marketValuation.retailReadyPrice)
            : '',
          vehicleDeductions: vehicle.marketValuation.vehicleDeductions ?? {},
        }
      : emptyMarketValuation(),
    highlight1Title: highlights[0]?.title ?? '',
    highlight1Text: highlights[0]?.text ?? '',
    highlight2Title: highlights[1]?.title ?? '',
    highlight2Text: highlights[1]?.text ?? '',
    highlight3Title: highlights[2]?.title ?? '',
    highlight3Text: highlights[2]?.text ?? '',
    highlight4Title: highlights[3]?.title ?? '',
    highlight4Text: highlights[3]?.text ?? '',
    videoUrl: vehicle.videoUrl ?? '',
    videoPosterUrl: vehicle.videoPosterUrl ?? '',
    images: (vehicle.images ?? []).slice(0, 30),
    heroImageUrls: resolveHeroImageUrls(vehicle),
    carouselImageUrls: resolveCarouselImageUrls(vehicle),
    marketImageUrls: resolveMarketImageUrls(vehicle),
    galleryPhotos: (vehicle.galleryPhotos ?? []).map((photo) => ({
      url: photo.url,
      category: photo.category,
      caption: photo.caption,
      alt: photo.alt,
    })),
  };
}

export function formStateToVehiclePatch(
  state: VehicleFormState,
  existing: VehicleResponse
): VehicleDashboardUpdate {
  const patch: VehicleDashboardUpdate = {
    mileage: parseIntegerString(state.mileage),
    price: parseCurrencyString(state.price),
  };

  const sellersNote: NonNullable<VehicleDashboardUpdate['sellersNote']> = {
    blocks: buildPitchBlocks(state, existing),
  };

  const subtitle = optionalString(state.subtitle).trim();
  if (subtitle) sellersNote.subtitle = subtitle;

  const intro = optionalString(state.sellersNoteIntro).trim();
  if (intro) sellersNote.intro = intro;

  const msrpRaw = optionalString(state.msrp).trim();
  if (msrpRaw) {
    sellersNote.originalMsrp = parseCurrencyString(msrpRaw);
  }

  const ctaText = optionalString(state.ctaText).trim();
  if (ctaText) sellersNote.ctaText = ctaText;

  if (existing.sellersNote?.ctaButtonLabel) {
    sellersNote.ctaButtonLabel = existing.sellersNote.ctaButtonLabel;
  }

  patch.sellersNote = sellersNote;

  const mechanicalIntro = optionalString(state.mechanicalIntegrityIntro).trim();
  const mechanicalItems = buildMechanicalItems(state);
  if (mechanicalItems.length > 0) {
    patch.mechanicalIntegrity = {
      ...(mechanicalIntro ? { intro: mechanicalIntro } : {}),
      items: mechanicalItems,
    };
  }

  const marketValuation = buildMarketValuation(state);
  if (marketValuation) {
    patch.marketValuation = marketValuation;
  }

  const highlights = buildHighlights(state);
  if (highlights.length > 0) {
    patch.highlights = highlights;
  }

  const originalStickerUrl = optionalString(state.originalStickerUrl).trim();
  if (originalStickerUrl) {
    patch.originalStickerUrl = originalStickerUrl;
  }

  const kbbReportUrl = optionalString(state.kbbReportUrl).trim();
  if (kbbReportUrl) {
    patch.kbbReportUrl = kbbReportUrl;
  }

  patch.smogCertificateUrls = state.smogCertificateUrls;

  patch.historyReportUrls = state.historyReportUrls;

  const videoUrl = optionalString(state.videoUrl).trim();
  if (videoUrl) patch.videoUrl = videoUrl;

  const videoPosterUrl = optionalString(state.videoPosterUrl).trim();
  if (videoPosterUrl) patch.videoPosterUrl = videoPosterUrl;

  const images = state.images
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
    .slice(0, 30);
  patch.images = images;

  patch.heroImageUrls = state.heroImageUrls;
  patch.carouselImageUrls = state.carouselImageUrls;
  patch.marketImageUrls = state.marketImageUrls;

  patch.galleryPhotos = buildGalleryPhotos(state);

  const listingTitleTrimmed = optionalString(state.listingTitle).trim();
  patch.listingTitle = listingTitleTrimmed || null;

  const description = optionalString(state.description).trim();
  if (!description) {
    throw new Error('Listing summary is required');
  }
  patch.description = description;

  const drivetrain = optionalString(state.drivetrain).trim();
  if (!drivetrain) {
    throw new Error('Drivetrain is required');
  }
  patch.specs = {
    ...existing.specs,
    drivetrain,
  };

  const locationCity = optionalString(state.locationCity).trim();
  if (!locationCity) {
    throw new Error('Location is required');
  }
  patch.location = {
    geohash: existing.location.geohash,
    city: locationCity,
  };

  return patch;
}
