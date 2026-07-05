import type {
  AiGeneration,
  DealerProspect,
  Vehicle,
  VehicleFormState,
} from '../../schemas';
import { GenerateListingFormFieldsSchema } from '../../schemas';
import type { AiListingContent } from './generate-listing-content';
import type { VinDecodeResult } from '../vin-decoder';
import type { z } from 'zod';

type GenerateListingFormFields = z.infer<typeof GenerateListingFormFieldsSchema>;

function formatCurrency(value: number): string {
  return `$${value.toLocaleString('en-US')}`;
}

function formatMileage(value: number): string {
  return value.toLocaleString('en-US');
}

export function aiContentToFormFields(content: AiListingContent): GenerateListingFormFields {
  const [h1, h2, h3, h4] = content.highlights;
  const [m1, m2, m3] = content.mechanicalItems;

  return {
    mileage: formatMileage(content.suggestedMileage),
    price: formatCurrency(content.suggestedPrice),
    subtitle: content.subtitle,
    msrp: formatCurrency(content.monroney.totalMsrp),
    sellersNoteIntro: content.description,
    peaceOfMindText: content.peaceOfMindText,
    maintenanceText: content.maintenanceText,
    utilityTowingText: content.utilityTowingText,
    luxuryOptionsText: content.luxuryOptionsText,
    ctaText: content.ctaText,
    mechanicalIntegrityIntro: content.mechanicalIntro,
    mechanicalItem1Title: m1?.title ?? '',
    mechanicalItem1Text: m1?.text ?? '',
    mechanicalItem2Title: m2?.title ?? '',
    mechanicalItem2Text: m2?.text ?? '',
    mechanicalItem3Title: m3?.title ?? '',
    mechanicalItem3Text: m3?.text ?? '',
    marketValuation: {
      contextText: content.marketValuation.contextText,
      dealerRealityText: content.marketValuation.dealerRealityText,
      kbbText: content.marketValuation.kbbText,
      justificationText: content.marketValuation.justificationText,
      comparables: [],
    },
    highlight1Title: h1?.title ?? '',
    highlight1Text: h1?.text ?? '',
    highlight2Title: h2?.title ?? '',
    highlight2Text: h2?.text ?? '',
    highlight3Title: h3?.title ?? '',
    highlight3Text: h3?.text ?? '',
    highlight4Title: h4?.title ?? '',
    highlight4Text: h4?.text ?? '',
  };
}

const DEFAULT_PITCH_ICONS = ['🛡️', '🔧', '🧰', '💎'] as const;
const DEFAULT_PITCH_TITLES = [
  'The Peace of Mind Guarantee',
  'Recent Maintenance & Upgrades',
  'The Ultimate Utility & Towing Rig',
  'Luxury Options',
] as const;

export function buildVehicleFromAiContent(options: {
  decoded: VinDecodeResult;
  content: AiListingContent;
  sellerId: string;
  sellerName: string;
  prospect?: DealerProspect;
  aiGeneration: AiGeneration;
}): Vehicle {
  const { decoded, content, sellerId, sellerName, prospect, aiGeneration } = options;
  const createdAt = new Date().toISOString();

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
    monroney: content.monroney,
    aiGeneration,
    ...(prospect ? { dealerProspect: prospect } : {}),
    sellersNote: {
      subtitle: content.subtitle,
      intro: content.description,
      originalMsrp: content.monroney.totalMsrp,
      blocks: [
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

export function mergeAiFormFields(
  current: VehicleFormState,
  generated: GenerateListingFormFields
): VehicleFormState {
  return {
    ...current,
    ...generated,
    marketValuation: {
      ...(current.marketValuation ?? { comparables: [] }),
      ...(generated.marketValuation ?? {}),
      comparables: generated.marketValuation?.comparables ?? current.marketValuation?.comparables ?? [],
    },
    images: generated.images ?? current.images ?? [],
  };
}
