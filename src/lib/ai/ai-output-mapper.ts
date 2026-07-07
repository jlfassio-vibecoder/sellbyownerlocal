import type {
  AiGeneration,
  DealerProspect,
  Monroney,
  Vehicle,
} from '../../schemas';
import { GenerateListingFormFieldsSchema } from '../../schemas';
import type { AiListingContent, PartialAiListingContent } from './ai-listing-content-schema';
import { isFullAiListingContent } from './parse-partial-listing-content';
import type { VinDecodeResult } from '../vin-decoder';
import type { z } from 'zod';

type GenerateListingFormFields = z.infer<typeof GenerateListingFormFieldsSchema>;

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

function formatMileage(value: number): string {
  return value.toLocaleString('en-US');
}

export function aiContentToFormFields(content: PartialAiListingContent): GenerateListingFormFields {
  const fields: GenerateListingFormFields = {};
  const [h1, h2, h3, h4] = content.highlights ?? [];
  const [m1, m2, m3] = content.mechanicalItems ?? [];

  if (content.suggestedMileage != null) {
    fields.mileage = formatMileage(content.suggestedMileage);
  }
  if (content.suggestedPrice != null) {
    fields.price = formatCurrency(content.suggestedPrice);
  }
  if (content.subtitle) fields.subtitle = content.subtitle;
  if (content.monroney?.totalMsrp != null) {
    fields.msrp = formatCurrency(content.monroney.totalMsrp);
  }
  if (content.description) fields.sellersNoteIntro = content.description;
  if (content.peaceOfMindText) fields.peaceOfMindText = content.peaceOfMindText;
  if (content.maintenanceText) fields.maintenanceText = content.maintenanceText;
  if (content.utilityTowingText) fields.utilityTowingText = content.utilityTowingText;
  if (content.luxuryOptionsText) fields.luxuryOptionsText = content.luxuryOptionsText;
  if (content.ctaText) fields.ctaText = content.ctaText;
  if (content.mechanicalIntro) fields.mechanicalIntegrityIntro = content.mechanicalIntro;
  if (m1?.title) fields.mechanicalItem1Title = m1.title;
  if (m1?.text) fields.mechanicalItem1Text = m1.text;
  if (m2?.title) fields.mechanicalItem2Title = m2.title;
  if (m2?.text) fields.mechanicalItem2Text = m2.text;
  if (m3?.title) fields.mechanicalItem3Title = m3.title;
  if (m3?.text) fields.mechanicalItem3Text = m3.text;

  const marketValuation = content.marketValuation;
  if (
    marketValuation?.contextText ||
    marketValuation?.dealerRealityText ||
    marketValuation?.kbbText ||
    marketValuation?.justificationText
  ) {
    fields.marketValuation = {
      contextText: marketValuation.contextText,
      dealerRealityText: marketValuation.dealerRealityText,
      kbbText: marketValuation.kbbText,
      justificationText: marketValuation.justificationText,
      comparables: [],
    };
  }

  if (h1?.title) fields.highlight1Title = h1.title;
  if (h1?.text) fields.highlight1Text = h1.text;
  if (h2?.title) fields.highlight2Title = h2.title;
  if (h2?.text) fields.highlight2Text = h2.text;
  if (h3?.title) fields.highlight3Title = h3.title;
  if (h3?.text) fields.highlight3Text = h3.text;
  if (h4?.title) fields.highlight4Title = h4.title;
  if (h4?.text) fields.highlight4Text = h4.text;

  return fields;
}

const DEFAULT_PITCH_ICONS = ['🛡️', '🔧', '🧰', '💎'] as const;
const DEFAULT_PITCH_TITLES = [
  'The Peace of Mind Guarantee',
  'Recent Maintenance & Upgrades',
  'The Ultimate Utility & Towing Rig',
  'Luxury Options',
] as const;

function buildPitchBlocks(content: PartialAiListingContent) {
  const blocks = [];
  if (content.peaceOfMindText) {
    blocks.push({
      title: DEFAULT_PITCH_TITLES[0]!,
      icon: DEFAULT_PITCH_ICONS[0],
      body: content.peaceOfMindText,
    });
  }
  if (content.maintenanceText) {
    blocks.push({
      title: DEFAULT_PITCH_TITLES[1]!,
      icon: DEFAULT_PITCH_ICONS[1],
      body: content.maintenanceText,
    });
  }
  if (content.utilityTowingText) {
    blocks.push({
      title: DEFAULT_PITCH_TITLES[2]!,
      icon: DEFAULT_PITCH_ICONS[2],
      body: content.utilityTowingText,
    });
  }
  if (content.luxuryOptionsText) {
    blocks.push({
      title: DEFAULT_PITCH_TITLES[3]!,
      icon: DEFAULT_PITCH_ICONS[3],
      body: content.luxuryOptionsText,
    });
  }
  return blocks;
}

function estimateMileageFromYear(year: number): number {
  const age = Math.max(0, new Date().getFullYear() - year);
  return Math.min(180_000, age * 12_000);
}

export function buildAiContentVehiclePatch(options: {
  decoded: VinDecodeResult;
  content: PartialAiListingContent;
  aiGeneration: AiGeneration;
  monroney?: Monroney;
}): Record<string, unknown> {
  const { decoded, content, aiGeneration, monroney } = options;
  const patch: Record<string, unknown> = {
    vin: decoded.vin,
    aiGeneration,
  };

  if (content.suggestedPrice != null) patch.price = content.suggestedPrice;
  if (content.suggestedMileage != null) patch.mileage = content.suggestedMileage;
  if (content.description) patch.description = content.description;
  if (content.tags?.length) patch.tags = content.tags;
  if (content.features?.length) patch.features = content.features;
  if (monroney) patch.monroney = monroney;

  if (content.exteriorColor || content.interiorColor) {
    patch.specs = {
      exteriorColor: content.exteriorColor ?? '',
      interiorColor: content.interiorColor ?? '',
      transmission: decoded.transmission,
      engine: decoded.engine,
      drivetrain: decoded.drivetrain,
    };
  }

  if (content.highlights?.length) patch.highlights = content.highlights;

  if (content.mechanicalIntro || content.mechanicalItems?.length) {
    patch.mechanicalIntegrity = {
      ...(content.mechanicalIntro ? { intro: content.mechanicalIntro } : {}),
      ...(content.mechanicalItems?.length ? { items: content.mechanicalItems.slice(0, 3) } : {}),
    };
  }

  if (content.marketValuation) {
    patch.marketValuation = {
      ...content.marketValuation,
      comparables: [],
    };
  }

  const pitchBlocks = buildPitchBlocks(content);
  if (
    content.subtitle ||
    content.description ||
    pitchBlocks.length ||
    content.ctaText ||
    monroney?.totalMsrp != null
  ) {
    patch.sellersNote = {
      ...(content.subtitle ? { subtitle: content.subtitle } : {}),
      ...(content.description ? { intro: content.description } : {}),
      ...(monroney?.totalMsrp != null ? { originalMsrp: monroney.totalMsrp } : {}),
      ...(pitchBlocks.length ? { blocks: pitchBlocks } : {}),
      ...(content.ctaText ? { ctaText: content.ctaText } : {}),
      ...(content.ctaText || pitchBlocks.length
        ? { ctaButtonLabel: 'Contact Seller to Schedule a Showing' }
        : {}),
    };
  }

  return patch;
}

export function buildVehicleFromAiContent(options: {
  decoded: VinDecodeResult;
  content: PartialAiListingContent;
  sellerId: string;
  sellerName: string;
  prospect?: DealerProspect;
  aiGeneration: AiGeneration;
  monroney?: Monroney;
}): Vehicle {
  const { decoded, content, sellerId, sellerName, prospect, aiGeneration, monroney } = options;

  if (isFullAiListingContent(content) && monroney) {
    return buildFullVehicleFromAiContent({
      decoded,
      content,
      sellerId,
      sellerName,
      prospect,
      aiGeneration,
      monroney,
    });
  }

  const createdAt = new Date().toISOString();
  const price =
    content.suggestedPrice ??
    (monroney?.totalMsrp != null
      ? Math.round(monroney.totalMsrp * 0.85)
      : 10_000);
  const mileage = content.suggestedMileage ?? estimateMileageFromYear(decoded.year);
  const description =
    content.description?.trim() ||
    'Draft listing generated from VIN — review and edit before publishing.';
  const pitchBlocks = buildPitchBlocks(content);

  const vehicle: Vehicle = {
    year: decoded.year,
    make: decoded.make,
    model: decoded.model,
    price,
    mileage,
    description,
    images: [],
    status: 'active',
    sellerId,
    sellerName,
    location: { geohash: '9tbq3n', city: 'Phoenix, AZ' },
    tags: content.tags?.length ? content.tags : ['vin-generated'],
    vin: decoded.vin,
    createdAt,
    specs: {
      exteriorColor: content.exteriorColor ?? 'See listing',
      interiorColor: content.interiorColor ?? 'See listing',
      transmission: decoded.transmission,
      engine: decoded.engine,
      drivetrain: decoded.drivetrain,
    },
    features: content.features?.length ? content.features : ['See listing for features'],
    maintenance: [
      {
        date: createdAt.split('T')[0]!,
        service: 'AI-generated listing — verify service history with seller',
      },
    ],
    historyReportUrls: [],
    smogCertificateUrls: [],
    heroImageUrls: [],
    carouselImageUrls: [],
    marketImageUrls: [],
    aiGeneration,
  };

  if (content.highlights?.length) {
    vehicle.highlights = content.highlights;
  }
  if (monroney) {
    vehicle.monroney = monroney;
  }
  if (prospect) {
    vehicle.dealerProspect = prospect;
  }
  if (
    content.subtitle ||
    pitchBlocks.length ||
    content.ctaText ||
    monroney?.totalMsrp != null
  ) {
    vehicle.sellersNote = {
      ...(content.subtitle ? { subtitle: content.subtitle } : {}),
      intro: description,
      ...(monroney?.totalMsrp != null ? { originalMsrp: monroney.totalMsrp } : {}),
      ...(pitchBlocks.length ? { blocks: pitchBlocks } : {}),
      ...(content.ctaText ? { ctaText: content.ctaText } : {}),
      ctaButtonLabel: 'Contact Seller to Schedule a Showing',
    };
  }
  if (content.mechanicalItems?.length) {
    vehicle.mechanicalIntegrity = {
      ...(content.mechanicalIntro ? { intro: content.mechanicalIntro } : {}),
      items: content.mechanicalItems.slice(0, 3),
    };
  }
  if (content.marketValuation) {
    vehicle.marketValuation = {
      ...content.marketValuation,
      comparables: [],
    };
  }

  return vehicle;
}

function buildFullVehicleFromAiContent(options: {
  decoded: VinDecodeResult;
  content: AiListingContent;
  sellerId: string;
  sellerName: string;
  prospect?: DealerProspect;
  aiGeneration: AiGeneration;
  monroney: Monroney;
}): Vehicle {
  const { decoded, content, sellerId, sellerName, prospect, aiGeneration, monroney } = options;
  const createdAt = new Date().toISOString();
  const pitchBlocks = buildPitchBlocks(content);

  return {
    year: decoded.year,
    make: decoded.make,
    model: decoded.model,
    price: content.suggestedPrice,
    mileage: content.suggestedMileage,
    description: content.description,
    images: [],
    status: 'active',
    sellerId,
    sellerName,
    location: { geohash: '9tbq3n', city: 'Phoenix, AZ' },
    tags: content.tags,
    vin: decoded.vin,
    createdAt,
    specs: {
      exteriorColor: content.exteriorColor,
      interiorColor: content.interiorColor,
      transmission: decoded.transmission,
      engine: decoded.engine,
      drivetrain: decoded.drivetrain,
    },
    features: content.features,
    highlights: content.highlights,
    maintenance: [
      {
        date: createdAt.split('T')[0]!,
        service: 'AI-generated listing — verify service history with seller',
      },
    ],
    historyReportUrls: [],
    smogCertificateUrls: [],
    heroImageUrls: [],
    carouselImageUrls: [],
    marketImageUrls: [],
    monroney,
    aiGeneration,
    ...(prospect ? { dealerProspect: prospect } : {}),
    sellersNote: {
      subtitle: content.subtitle,
      intro: content.description,
      originalMsrp: monroney.totalMsrp,
      blocks: pitchBlocks.length
        ? pitchBlocks
        : [
            {
              title: DEFAULT_PITCH_TITLES[0]!,
              icon: DEFAULT_PITCH_ICONS[0],
              body: content.peaceOfMindText,
            },
            {
              title: DEFAULT_PITCH_TITLES[1]!,
              icon: DEFAULT_PITCH_ICONS[1],
              body: content.maintenanceText,
            },
            {
              title: DEFAULT_PITCH_TITLES[2]!,
              icon: DEFAULT_PITCH_ICONS[2],
              body: content.utilityTowingText,
            },
            {
              title: DEFAULT_PITCH_TITLES[3]!,
              icon: DEFAULT_PITCH_ICONS[3],
              body: content.luxuryOptionsText,
            },
          ],
      ctaText: content.ctaText,
      ctaButtonLabel: 'Contact Seller to Schedule a Showing',
    },
    mechanicalIntegrity: {
      intro: content.mechanicalIntro,
      items: content.mechanicalItems,
    },
    marketValuation: {
      ...content.marketValuation,
      comparables: [],
    },
  };
}

