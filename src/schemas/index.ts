import { z } from 'zod';
import { ACCENT_COLOR_VALUES } from '../lib/accent-colors';

export const AccentColorSchema = z.enum(ACCENT_COLOR_VALUES);

export const httpHttpsUrl = z.string().refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'URL must use http or https' });

const documentUrl = z.string().refine((value) => {
  if (value.startsWith('data:application/pdf')) return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'Document URL must use http, https, or data:application/pdf' });

export const UserStatsSchema = z.object({
  averageRating: z.number().min(0).max(5),
  itemsSold: z.number().int().nonnegative(),
});

export const VerificationTierSchema = z.enum([
  'anonymous',
  'phone_verified',
  'identity_verified',
]);

export const KycStatusSchema = z.object({
  provider: z.enum(['stripe_identity', 'persona', 'keysavvy', 'caramel']),
  status: z.enum(['pending', 'verified', 'failed']),
  verifiedAt: z.iso.datetime().optional(),
  externalId: z.string().optional(),
});

export const StorefrontSlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .min(3)
  .max(48);

export const UserSchema = z.object({
  displayName: z.string().min(1).max(100),
  stats: UserStatsSchema,
  verificationTier: VerificationTierSchema.default('anonymous'),
  phone: z.string().optional(),
  phoneVerifiedAt: z.iso.datetime().optional(),
  kyc: KycStatusSchema.optional(),
  storefrontSlug: StorefrontSlugSchema.optional(),
  // Copilot suggestion ignored: already uses z.iso.datetime() consistent with phoneVerifiedAt.
  storefrontSlugUpdatedAt: z.iso.datetime().optional(),
  previousStorefrontSlugs: z.array(z.string()).optional(),
  storefrontName: z.string().trim().min(1).max(50).optional(),
  storefrontTagline: z.string().trim().min(1).max(150).optional(),
  storefrontHeroUrl: httpHttpsUrl.optional(),
});

export const PublicUserResponseSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1).max(100),
  stats: UserStatsSchema,
  verificationTier: VerificationTierSchema.default('anonymous'),
  storefrontSlug: StorefrontSlugSchema.optional(),
  storefrontName: z.string().trim().min(1).max(50).optional(),
  storefrontTagline: z.string().trim().min(1).max(150).optional(),
  storefrontHeroUrl: httpHttpsUrl.optional(),
});

export const UserProfileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  storefrontSlug: StorefrontSlugSchema.optional(),
  storefrontName: z.union([z.string().trim().min(1).max(50), z.literal('')]).optional(),
  storefrontTagline: z.union([z.string().trim().min(1).max(150), z.literal('')]).optional(),
  storefrontHeroUrl: z.union([httpHttpsUrl, z.literal('')]).optional(),
});

export const PhoneVerifyRequestSchema = z.object({
  idToken: z.string().min(1),
});

export const VehicleLocationSchema = z.object({
  geohash: z.string().min(1),
  city: z.string().min(1),
});

export const VehicleStatusSchema = z.enum(['draft', 'active', 'pending', 'sold']);

export const VehicleSpecsSchema = z.object({
  exteriorColor: z.string().min(1),
  interiorColor: z.string().min(1),
  transmission: z.string().min(1),
  engine: z.string().min(1),
  drivetrain: z.string().min(1),
});

export const ServiceRecordSchema = z.object({
  id: z.string(),
  date: z.string(),
  description: z.string(),
  isHighlighted: z.boolean().default(false),
  isHidden: z.boolean().default(false),
  source: z.enum(['carfax', 'seller']).optional().default('carfax'),
  isEdited: z.boolean().optional().default(false),
});

export const ServiceRecordFormSchema = ServiceRecordSchema;

export const ExtractServiceHistoryRequestSchema = z.object({
  vehicleId: z.string().trim().min(1),
});

export const ExtractServiceHistoryRecordSchema = z.object({
  date: z.string().min(1),
  description: z.string().min(1),
});

export const ExtractServiceHistoryResponseSchema = z.object({
  records: z.array(ExtractServiceHistoryRecordSchema).max(30),
});

export const VehicleDocumentsSchema = z.object({
  windowSticker: documentUrl.optional(),
  kbbReport: documentUrl.optional(),
  carfaxReport: documentUrl.optional(),
  smogReport: documentUrl.optional(),
});

export const WindowStickerLineItemSchema = z.object({
  label: z.string().min(1),
  price: z.number().nonnegative(),
  emphasized: z.boolean().optional(),
});

export const WindowStickerBreakdownSchema = z.object({
  totalMsrp: z.number().positive(),
  lineItems: z.array(WindowStickerLineItemSchema).min(1),
});

export const vinString = z
  .string()
  .length(17)
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/i, { message: 'Invalid VIN format' });

export const MonroneyOptionSchema = z.object({
  label: z.string().min(1),
  price: z.number().nonnegative(),
  category: z.enum(['package', 'option', 'fee']),
  contents: z.array(z.string().min(1)).optional(),
});

export const MonroneyStandardEquipmentSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string().min(1)).min(1),
});

export const MonroneyFuelEconomySchema = z.object({
  city: z.number().positive(),
  highway: z.number().positive(),
  combined: z.number().positive(),
});

export const MonroneyEpaSchema = z.object({
  city: z.number().positive(),
  highway: z.number().positive(),
  combined: z.number().positive(),
  gallonsPer100Mi: z.number().positive().optional(),
  annualFuelCost: z.number().positive().optional(),
  /** Negative = buyer spends more vs average new vehicle over 5 years. */
  fiveYearSavings: z.number().optional(),
  ghgRating: z.number().int().min(1).max(10).optional(),
  smogRating: z.number().int().min(1).max(10).optional(),
  co2GramsPerMile: z.number().positive().optional(),
  fuelType: z.string().min(1).optional(),
});

export const MonroneySafetyRatingsSchema = z.object({
  overall: z.number().int().min(1).max(5).optional(),
  frontalDriver: z.number().int().min(1).max(5).optional(),
  frontalPassenger: z.number().int().min(1).max(5).optional(),
  sideFrontSeat: z.number().int().min(1).max(5).optional(),
  sideRearSeat: z.number().int().min(1).max(5).optional(),
  rollover: z.number().int().min(1).max(5).optional(),
});

export const MonroneyPartsContentSchema = z.object({
  usCanadianPercent: z.number().min(0).max(100).optional(),
  majorForeignSources: z
    .array(
      z.object({
        country: z.string().min(1),
        percent: z.number().min(0).max(100),
      })
    )
    .optional(),
  engineOrigin: z.string().min(1).optional(),
  transmissionOrigin: z.string().min(1).optional(),
});

export const MonroneyWarrantySchema = z.object({
  items: z.array(z.string().min(1)).min(1),
  badge: z.string().min(1).optional(),
});

export const MonroneyManufacturerInfoSchema = z.object({
  name: z.string().min(1),
  website: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});

export const MonroneyAssemblySchema = z.object({
  plant: z.string().min(1),
  country: z.string().min(1),
});

/** Authoritative factory data from NHTSA vPIC at VIN decode time. */
export const MonroneyFactorySpecsSchema = z.object({
  trim: z.string().min(1),
  trim2: z.string().min(1).optional(),
  series: z.string().min(1).optional(),
  bodyClass: z.string().min(1),
  bodyCabType: z.string().min(1).optional(),
  drivetrain: z.string().min(1),
  plant: z.string().min(1),
  plantCountry: z.string().min(1),
});

export const MonroneySchema = z.object({
  /** Computed from factorySpecs + Monroney options; cached for display. */
  styleLine: z.string().min(1).optional(),
  /** NHTSA vPIC decode — basic specs used for Monroney header and assembly. */
  factorySpecs: MonroneyFactorySpecsSchema.optional(),
  baseMsrp: z.number().positive(),
  destinationCharge: z.number().nonnegative(),
  totalMsrp: z.number().positive(),
  options: z.array(MonroneyOptionSchema),
  standardEquipment: z.array(MonroneyStandardEquipmentSchema),
  fuelEconomy: MonroneyFuelEconomySchema.optional(),
  epa: MonroneyEpaSchema.optional(),
  safetyRatings: MonroneySafetyRatingsSchema.optional(),
  partsContent: MonroneyPartsContentSchema.optional(),
  warranty: MonroneyWarrantySchema.optional(),
  manufacturerInfo: MonroneyManufacturerInfoSchema.optional(),
  assembly: MonroneyAssemblySchema.optional(),
});

export const AiGenerationSchema = z.object({
  status: z.enum(['text_complete', 'complete', 'failed', 'partial']),
  source: z.enum(['vin', 'sticker']),
  model: z.string().min(1),
  generatedAt: z.iso.datetime(),
});

export const DealerProspectSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

// Copilot suggestion ignored: server schema and client sticker-file.ts intentionally mirror the same rules; no shared module yet.
const STICKER_MIME = /^data:(image\/(?:jpeg|png)|application\/pdf);base64,/;
const MAX_STICKER_BYTES = 5 * 1024 * 1024;

export const stickerDataUri = z
  .string()
  .refine((v) => STICKER_MIME.test(v), { message: 'Invalid sticker file format' })
  .refine((v) => {
    const b64 = v.split(',')[1] ?? '';
    return Math.ceil((b64.length * 3) / 4) <= MAX_STICKER_BYTES;
  }, { message: 'Sticker file must be under 5MB' })
  .optional();

export const stickerDataUriRequired = z
  .string()
  .refine((v) => STICKER_MIME.test(v), { message: 'Invalid sticker file format' })
  .refine((v) => {
    const b64 = v.split(',')[1] ?? '';
    return Math.ceil((b64.length * 3) / 4) <= MAX_STICKER_BYTES;
  }, { message: 'Sticker file must be under 5MB' });

export const GenerateListingRequestSchema = z.object({
  vin: vinString,
  vehicleId: z.string().min(1).optional(),
  prospect: DealerProspectSchema.optional(),
  stickerFile: stickerDataUri,
});

export const GenerateHeroImageRequestSchema = z.object({
  vehicleId: z.string().min(1),
});

export const GalleryPhotoSchema = z.object({
  url: httpHttpsUrl,
  category: z.string().min(1),
  caption: z.string().min(1),
  alt: z.string().min(1),
});

export const GALLERY_PHOTO_CATEGORIES = [
  'Exterior',
  'Interior',
  'Mechanical',
  'Modifications',
  'Documents',
  'Other',
] as const;

const optionalComparableNumber = z.preprocess(
  (val) =>
    val === '' || val === null || val === undefined || Number.isNaN(val)
      ? undefined
      : Number(val),
  z.number().optional()
);

const comparablePrice = z.preprocess(
  (val) =>
    val === '' || val === null || val === undefined || Number.isNaN(val) ? 0 : Number(val),
  z.number()
);

const optionalComparableSourceUrl = z.preprocess(
  (val) => (val === '' || val === null || val === undefined ? undefined : val),
  httpHttpsUrl.optional()
);

export const MarketComparableSchema = z.object({
  label: z.string(),
  mileage: optionalComparableNumber,
  price: comparablePrice,
  highlighted: z.boolean().optional(),
  year: optionalComparableNumber,
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),
  drivetrain: z.string().optional(),
  color: z.string().optional(),
  sourceUrl: optionalComparableSourceUrl,
  matchLevel: z.enum(['exact', 'similar', 'base']).default('exact'),
  differences: z.array(z.string()).default([]),
});

export const VehicleDeductionsSchema = z.object({
  tires: z.number().nonnegative().optional(),
  paint: z.number().nonnegative().optional(),
  mechanical: z.number().nonnegative().optional(),
  interior: z.number().nonnegative().optional(),
  other: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export const MarketValuationSchema = z.object({
  contextText: z.string().optional(),
  dealerRealityText: z.string().optional(),
  kbbText: z.string().optional(),
  justificationText: z.string().optional(),
  comparables: z.array(MarketComparableSchema).max(5).default([]),
  retailReadyPrice: z.number().positive().optional(),
  vehicleDeductions: VehicleDeductionsSchema.optional(),
});

export const GenerateMarketResearchRequestSchema = z.object({
  vehicleId: z.string().trim().min(1),
});

export const GenerateMarketResearchResponseSchema = z.object({
  marketValuation: MarketValuationSchema.pick({
    contextText: true,
    dealerRealityText: true,
    kbbText: true,
    justificationText: true,
    retailReadyPrice: true,
    vehicleDeductions: true,
  }),
});

export const InquirySchema = z.object({
  vehicleId: z.string().min(1),
  sellerId: z.string().min(1),
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(30),
  email: z.email().max(200),
  message: z.string().max(2000).optional().or(z.literal('')),
  buyerUid: z.string().min(1).optional(),
  verificationTier: VerificationTierSchema.optional(),
});

export const InquiryRecordSchema = InquirySchema.extend({
  id: z.string(),
  timestamp: z.iso.datetime(),
});

export const PitchBlockSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().optional(),
  images: z.array(httpHttpsUrl).max(3).optional(),
});

export const SellersNoteSchema = z.object({
  subtitle: z.string().optional(),
  intro: z.string().optional(),
  originalMsrp: z.number().positive().optional(),
  blocks: z.array(PitchBlockSchema).min(1).max(4).optional(),
  ctaText: z.string().optional(),
  ctaButtonLabel: z.string().optional(),
});

export const MechanicalItemSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
});

export const MechanicalIntegritySchema = z.object({
  intro: z.string().optional(),
  items: z.array(MechanicalItemSchema).min(1).max(3),
});

export const DocumentsBannerSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  badges: z.array(z.string().min(1)).optional(),
});

export const VehicleHighlightSchema = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
});

export const VehicleModificationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

export const GenerateHighlightsRequestSchema = z.object({
  vehicleId: z.string().trim().min(1),
});

export const GenerateHighlightsResponseSchema = z.object({
  highlights: z.array(VehicleHighlightSchema).length(4),
});

const optionalString = z.string().optional().or(z.literal(''));

export const ModificationFormSchema = z.object({
  title: optionalString,
  description: optionalString,
});

export const GalleryPhotoFormSchema = z.object({
  url: httpHttpsUrl,
  category: z.string().min(1).default('Exterior'),
  caption: optionalString,
  alt: optionalString,
});

export const FormMarketValuationSchema = MarketValuationSchema.extend({
  retailReadyPrice: optionalString,
});

export const VehicleFormStateSchema = z.object({
  listingTitle: optionalString,
  description: optionalString,
  drivetrain: optionalString,
  locationCity: optionalString,
  accentColor: AccentColorSchema.default('red'),
  mileage: z.string().min(1).max(20),
  price: z.string().min(1).max(20),
  originalStickerUrl: optionalString,
  historyReportUrls: z.array(httpHttpsUrl).default([]),
  kbbReportUrl: optionalString,
  smogCertificateUrls: z.array(httpHttpsUrl).default([]),
  subtitle: optionalString,
  msrp: optionalString,
  sellersNoteIntro: optionalString,
  peaceOfMindText: optionalString,
  maintenanceText: optionalString,
  utilityTowingText: optionalString,
  luxuryOptionsText: optionalString,
  ctaText: optionalString,
  mechanicalIntegrityIntro: optionalString,
  mechanicalItem1Title: optionalString,
  mechanicalItem1Text: optionalString,
  mechanicalItem2Title: optionalString,
  mechanicalItem2Text: optionalString,
  mechanicalItem3Title: optionalString,
  mechanicalItem3Text: optionalString,
  marketValuation: FormMarketValuationSchema.default({ comparables: [] }),
  highlight1Title: optionalString,
  highlight1Text: optionalString,
  highlight2Title: optionalString,
  highlight2Text: optionalString,
  highlight3Title: optionalString,
  highlight3Text: optionalString,
  highlight4Title: optionalString,
  highlight4Text: optionalString,
  videoUrl: optionalString,
  videoPosterUrl: optionalString,
  images: z.array(httpHttpsUrl).max(30).default([]),
  heroImageUrls: z.array(httpHttpsUrl).default([]),
  carouselImageUrls: z.array(httpHttpsUrl).default([]),
  marketImageUrls: z.array(httpHttpsUrl).max(6).default([]),
  pitchBlock0ImageUrls: z.array(httpHttpsUrl).max(3).default([]),
  pitchBlock1ImageUrls: z.array(httpHttpsUrl).max(3).default([]),
  pitchBlock2ImageUrls: z.array(httpHttpsUrl).max(3).default([]),
  pitchBlock3ImageUrls: z.array(httpHttpsUrl).max(3).default([]),
  galleryPhotos: z.array(GalleryPhotoFormSchema).default([]),
  serviceRecords: z.array(ServiceRecordFormSchema).default([]),
  modifications: z.array(ModificationFormSchema).max(12).default([]),
  modificationImageUrls: z.array(httpHttpsUrl).max(3).default([]),
});

export const GenerateListingFormFieldsSchema = VehicleFormStateSchema.partial();

export const GenerateListingResponseSchema = z.object({
  vehicleId: z.string().min(1),
  formFields: GenerateListingFormFieldsSchema,
  monroney: MonroneySchema.optional(),
  partial: z.boolean().optional(),
  fieldErrors: z.array(z.string()).optional(),
  message: z.string().optional(),
});

export const PopulateMonroneyFromVinRequestSchema = z.object({
  vin: vinString,
});

export const MonroneyFactoryPreviewSchema = z.object({
  styleLine: z.string().min(1),
  factorySpecs: MonroneyFactorySpecsSchema,
  assembly: MonroneyAssemblySchema,
});

export const PopulateMonroneyFromVinResponseSchema = z.object({
  vehicleId: z.string().min(1),
  vin: vinString,
  enriched: z.boolean(),
  needsFullPopulate: z.boolean().optional(),
  styleLine: z.string().min(1).optional(),
  monroney: MonroneySchema.optional(),
  factoryPreview: MonroneyFactoryPreviewSchema.optional(),
  message: z.string().optional(),
});

export const PopulateMonroneyFromStickerRequestSchema = z.object({
  stickerFile: stickerDataUriRequired,
  vin: vinString.optional(),
});

export const PopulateMonroneyFromStickerResponseSchema = z.object({
  vehicleId: z.string().min(1),
  enriched: z.boolean(),
  styleLine: z.string().min(1).optional(),
  monroney: MonroneySchema.optional(),
  partial: z.boolean().optional(),
  message: z.string().optional(),
});

export const VehicleDashboardUpdateSchema = z
  .object({
    listingTitle: z.union([z.string().min(1), z.literal(''), z.null()]).optional(),
    description: z.string().min(1).optional(),
    mileage: z.number().int().nonnegative().optional(),
    price: z.number().positive().optional(),
    videoUrl: httpHttpsUrl.optional(),
    videoPosterUrl: httpHttpsUrl.optional(),
    documents: VehicleDocumentsSchema.partial().optional(),
    sellersNote: SellersNoteSchema.partial().optional(),
    mechanicalIntegrity: MechanicalIntegritySchema.partial().optional(),
    marketValuation: MarketValuationSchema.partial().optional(),
    highlights: z.array(VehicleHighlightSchema).max(4).optional(),
    modifications: z.array(VehicleModificationSchema).max(12).optional(),
    modificationImageUrls: z.array(httpHttpsUrl).max(3).optional(),
    images: z.array(httpHttpsUrl).max(30).optional(),
    heroImageUrls: z.array(httpHttpsUrl).optional(),
    carouselImageUrls: z.array(httpHttpsUrl).optional(),
    marketImageUrls: z.array(httpHttpsUrl).max(6).optional(),
    specs: VehicleSpecsSchema.partial().optional(),
    location: VehicleLocationSchema.partial().optional(),
    originalStickerUrl: httpHttpsUrl.optional(),
    kbbReportUrl: httpHttpsUrl.optional(),
    smogCertificateUrls: z.array(httpHttpsUrl).optional(),
    historyReportUrls: z.array(httpHttpsUrl).optional(),
    galleryPhotos: z.array(GalleryPhotoSchema).optional(),
    serviceRecords: z.array(ServiceRecordSchema).optional(),
    accentColor: AccentColorSchema.optional(),
  })
  .strict();

export const UploadResponseSchema = z.object({
  url: documentUrl,
});

export const ListingEventTypeSchema = z.enum([
  'page_view',
  'photo_view',
  'carousel_swipe',
  'section_view',
  'impression',
  'page_leave',
  'save_vehicle',
]);

export const ListingEventMetadataSchema = z.object({
  photoIndex: z.number().int().nonnegative().optional(),
  sectionId: z.string().min(1).max(50).optional(),
  surface: z.enum(['hero', 'carousel', 'gallery', 'search_grid']).optional(),
  rank: z.number().int().nonnegative().optional(),
  position: z.number().int().positive().optional(),
  durationSeconds: z.number().nonnegative().optional(),
});

export const ListingEventCreateSchema = z.object({
  vehicleId: z.string().min(1),
  eventType: ListingEventTypeSchema,
  metadata: ListingEventMetadataSchema.optional(),
});

export const ListingEventSchema = ListingEventCreateSchema.extend({
  sessionId: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export const SavedVehicleSchema = z.object({
  vehicleId: z.string().min(1),
  buyerUid: z.string().min(1),
  savedAt: z.iso.datetime(),
});

export const SavedVehicleToggleResponseSchema = z.object({
  saved: z.boolean(),
});

export const SavedVehicleStatusResponseSchema = z.object({
  saved: z.boolean(),
});

export const SavedClothingSchema = z.object({
  clothingId: z.string().min(1),
  buyerUid: z.string().min(1),
  savedAt: z.iso.datetime(),
});

export const SavedClothingToggleResponseSchema = z.object({
  saved: z.boolean(),
});

export const SavedClothingStatusResponseSchema = z.object({
  saved: z.boolean(),
});

export const FavoriteCategorySchema = z.enum(['vehicle', 'clothing']);

export const FavoriteItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  price: z.number().nonnegative(),
  category: FavoriteCategorySchema,
  sellerId: z.string().min(1),
  imageUrl: httpHttpsUrl.optional(),
  year: z.number().int().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  mileage: z.number().nonnegative().optional(),
  engine: z.string().optional(),
  drivetrain: z.string().optional(),
  highlights: z.array(z.string()).optional(),
});

export const FavoritesListResponseSchema = z.object({
  items: z.array(FavoriteItemSchema),
});

export const LeadCreateSchema = z.object({
  sellerId: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  message: z.string().min(1),
  items: z.array(FavoriteItemSchema).optional(),
});

export const LeadRecordSchema = LeadCreateSchema.extend({
  id: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const LeadCreateResponseSchema = z.object({
  ok: z.literal(true),
  id: z.string().min(1),
});

export const ListingAnalyticsRangeSchema = z.enum(['7d', '30d', 'all']);

export const ListingAnalyticsSummarySchema = z.object({
  searchImpressions: z.number().int().nonnegative(),
  clickThroughRate: z.number().nonnegative(),
  totalPageViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
  avgDwellTimeSeconds: z.number().nonnegative(),
  totalPhotoEngagements: z.number().int().nonnegative(),
  totalSectionViews: z.number().int().nonnegative(),
  activeSaves: z.number().int().nonnegative(),
  inquiryCount: z.number().int().nonnegative(),
});

export const ListingAnalyticsSectionSchema = z.object({
  sectionId: z.string(),
  label: z.string(),
  viewCount: z.number().int().nonnegative(),
  uniqueSessions: z.number().int().nonnegative(),
});

export const ListingAnalyticsDailySchema = z.object({
  date: z.string(),
  impressions: z.number().int().nonnegative(),
  pageViews: z.number().int().nonnegative(),
  uniqueVisitors: z.number().int().nonnegative(),
});

export const ListingAnalyticsPhotosSchema = z.object({
  carouselSwipes: z.number().int().nonnegative(),
  photoViews: z.number().int().nonnegative(),
  bySurface: z.object({
    hero: z.number().int().nonnegative(),
    carousel: z.number().int().nonnegative(),
    gallery: z.number().int().nonnegative(),
  }),
});

export const ListingAnalyticsResponseSchema = z.object({
  vehicleId: z.string().min(1),
  range: ListingAnalyticsRangeSchema,
  since: z.iso.datetime(),
  until: z.iso.datetime(),
  summary: ListingAnalyticsSummarySchema,
  sections: z.array(ListingAnalyticsSectionSchema),
  daily: z.array(ListingAnalyticsDailySchema),
  photos: ListingAnalyticsPhotosSchema,
});

export const MessageSchema = z.object({
  id: z.string(),
  sessionId: z.string().min(1).max(100),
  vehicleId: z.string().min(1),
  sender: z.enum(['buyer', 'seller']),
  content: z.string().min(1).max(2000),
  timestamp: z.iso.datetime(),
  isRead: z.number().int().min(0).max(1).optional(),
  buyerUid: z.string().min(1).optional(),
  buyerPhoneLast4: z.string().length(4).optional(),
});

export const ConversationSchema = MessageSchema.extend({
  unreadCount: z.number().int().nonnegative(),
});

export const MessageCreateSchema = z.object({
  sessionId: z.string().min(1).max(100),
  vehicleId: z.string().min(1),
  sender: z.enum(['buyer', 'seller']),
  content: z.string().min(1).max(2000),
});

export const BuyerConversationSchema = z.object({
  sessionId: z.string().min(1),
  vehicleId: z.string().min(1),
  vehicleTitle: z.string().min(1),
  vehicleImageUrl: z.union([httpHttpsUrl, z.literal('')]).optional(),
  latestMessage: MessageSchema,
  unreadCount: z.number().int().nonnegative(),
});

export const BuyerConversationsResponseSchema = z.object({
  conversations: z.array(BuyerConversationSchema),
});

export const VehicleSchema = z.object({
  year: z.number().int().min(1900),
  make: z.string().min(1),
  model: z.string().min(1),
  price: z.number().positive(),
  mileage: z.number().int().nonnegative(),
  description: z.string().min(1),
  listingTitle: z.string().min(1).optional(),
  accentColor: AccentColorSchema.default('red'),
  images: z.array(httpHttpsUrl),
  heroImageUrls: z.array(httpHttpsUrl).optional().default([]),
  carouselImageUrls: z.array(httpHttpsUrl).optional().default([]),
  marketImageUrls: z.array(httpHttpsUrl).optional().default([]),
  status: VehicleStatusSchema,
  sellerId: z.string().min(1),
  sellerName: z.string().min(1),
  location: VehicleLocationSchema,
  tags: z.array(z.string()),
  vin: vinString.optional(),
  createdAt: z.iso.datetime(),
  specs: VehicleSpecsSchema,
  features: z.array(z.string().min(1)).min(1),
  highlights: z.array(VehicleHighlightSchema).max(4).optional(),
  modifications: z.array(VehicleModificationSchema).max(12).optional().default([]),
  modificationImageUrls: z.array(httpHttpsUrl).max(3).optional().default([]),
  serviceRecords: z.array(ServiceRecordSchema).default([]),
  documents: VehicleDocumentsSchema.optional(),
  originalStickerUrl: httpHttpsUrl.optional(),
  kbbReportUrl: httpHttpsUrl.optional(),
  smogCertificateUrls: z.array(httpHttpsUrl).optional().default([]),
  smogCertificateUrl: httpHttpsUrl.optional(),
  historyReportUrls: z.array(httpHttpsUrl).optional().default([]),
  windowStickerBreakdown: WindowStickerBreakdownSchema.optional(),
  monroney: MonroneySchema.optional(),
  aiGeneration: AiGenerationSchema.optional(),
  dealerProspect: DealerProspectSchema.optional(),
  videoUrl: httpHttpsUrl.optional(),
  videoPosterUrl: httpHttpsUrl.optional(),
  galleryPhotos: z.array(GalleryPhotoSchema).min(1).optional(),
  marketValuation: MarketValuationSchema.optional(),
  sellersNote: SellersNoteSchema.optional(),
  mechanicalIntegrity: MechanicalIntegritySchema.optional(),
  documentsBanner: DocumentsBannerSchema.optional(),
});

export const UserResponseSchema = UserSchema.extend({ id: z.string() });
export const VehicleResponseSchema = VehicleSchema.extend({ id: z.string() });

export type User = z.infer<typeof UserSchema>;
export type VerificationTier = z.infer<typeof VerificationTierSchema>;
export type KycStatus = z.infer<typeof KycStatusSchema>;
export type PublicUserResponse = z.infer<typeof PublicUserResponseSchema>;
export type UserProfileUpdate = z.infer<typeof UserProfileUpdateSchema>;
export type PhoneVerifyRequest = z.infer<typeof PhoneVerifyRequestSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;
export type VehicleSpecs = z.infer<typeof VehicleSpecsSchema>;
export type ServiceRecord = z.infer<typeof ServiceRecordSchema>;
export type ServiceRecordForm = z.infer<typeof ServiceRecordFormSchema>;
export type ExtractServiceHistoryRequest = z.infer<typeof ExtractServiceHistoryRequestSchema>;
export type ExtractServiceHistoryRecord = z.infer<typeof ExtractServiceHistoryRecordSchema>;
export type ExtractServiceHistoryResponse = z.infer<typeof ExtractServiceHistoryResponseSchema>;
export type VehicleDocuments = z.infer<typeof VehicleDocumentsSchema>;
export type WindowStickerLineItem = z.infer<typeof WindowStickerLineItemSchema>;
export type WindowStickerBreakdown = z.infer<typeof WindowStickerBreakdownSchema>;
export type VinString = z.infer<typeof vinString>;
export type MonroneyOption = z.infer<typeof MonroneyOptionSchema>;
export type MonroneyStandardEquipment = z.infer<typeof MonroneyStandardEquipmentSchema>;
export type MonroneyFuelEconomy = z.infer<typeof MonroneyFuelEconomySchema>;
export type MonroneyEpa = z.infer<typeof MonroneyEpaSchema>;
export type MonroneySafetyRatings = z.infer<typeof MonroneySafetyRatingsSchema>;
export type MonroneyPartsContent = z.infer<typeof MonroneyPartsContentSchema>;
export type MonroneyWarranty = z.infer<typeof MonroneyWarrantySchema>;
export type MonroneyManufacturerInfo = z.infer<typeof MonroneyManufacturerInfoSchema>;
export type MonroneyAssembly = z.infer<typeof MonroneyAssemblySchema>;
export type MonroneyFactorySpecs = z.infer<typeof MonroneyFactorySpecsSchema>;
export type Monroney = z.infer<typeof MonroneySchema>;
export type AiGeneration = z.infer<typeof AiGenerationSchema>;
export type DealerProspect = z.infer<typeof DealerProspectSchema>;
export type GenerateListingRequest = z.infer<typeof GenerateListingRequestSchema>;
export type GenerateListingResponse = z.infer<typeof GenerateListingResponseSchema>;
export type PopulateMonroneyFromVinRequest = z.infer<typeof PopulateMonroneyFromVinRequestSchema>;
export type MonroneyFactoryPreview = z.infer<typeof MonroneyFactoryPreviewSchema>;
export type PopulateMonroneyFromVinResponse = z.infer<typeof PopulateMonroneyFromVinResponseSchema>;
export type PopulateMonroneyFromStickerRequest = z.infer<typeof PopulateMonroneyFromStickerRequestSchema>;
export type PopulateMonroneyFromStickerResponse = z.infer<typeof PopulateMonroneyFromStickerResponseSchema>;
export type GenerateHeroImageRequest = z.infer<typeof GenerateHeroImageRequestSchema>;
export type GenerateMarketResearchRequest = z.infer<typeof GenerateMarketResearchRequestSchema>;
export type GenerateMarketResearchResponse = z.infer<typeof GenerateMarketResearchResponseSchema>;
export type GenerateHighlightsRequest = z.infer<typeof GenerateHighlightsRequestSchema>;
export type GenerateHighlightsResponse = z.infer<typeof GenerateHighlightsResponseSchema>;
export type GalleryPhoto = z.infer<typeof GalleryPhotoSchema>;
export type GalleryPhotoForm = z.infer<typeof GalleryPhotoFormSchema>;
export type MarketComparable = z.infer<typeof MarketComparableSchema>;
export type VehicleDeductions = z.infer<typeof VehicleDeductionsSchema>;
export type MarketValuation = z.infer<typeof MarketValuationSchema>;
export type FormMarketValuation = z.infer<typeof FormMarketValuationSchema>;
export type Inquiry = z.infer<typeof InquirySchema>;
export type InquiryRecord = z.infer<typeof InquiryRecordSchema>;
export type PitchBlock = z.infer<typeof PitchBlockSchema>;
export type SellersNote = z.infer<typeof SellersNoteSchema>;
export type MechanicalItem = z.infer<typeof MechanicalItemSchema>;
export type MechanicalIntegrity = z.infer<typeof MechanicalIntegritySchema>;
export type DocumentsBanner = z.infer<typeof DocumentsBannerSchema>;
export type VehicleHighlight = z.infer<typeof VehicleHighlightSchema>;
export type VehicleModification = z.infer<typeof VehicleModificationSchema>;
export type ModificationForm = z.infer<typeof ModificationFormSchema>;
export type VehicleFormState = z.infer<typeof VehicleFormStateSchema>;
export type VehicleDashboardUpdate = z.infer<typeof VehicleDashboardUpdateSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type ListingEventType = z.infer<typeof ListingEventTypeSchema>;
export type ListingEventMetadata = z.infer<typeof ListingEventMetadataSchema>;
export type ListingEventCreate = z.infer<typeof ListingEventCreateSchema>;
export type ListingEvent = z.infer<typeof ListingEventSchema>;
export type SavedVehicle = z.infer<typeof SavedVehicleSchema>;
export type SavedVehicleToggleResponse = z.infer<typeof SavedVehicleToggleResponseSchema>;
export type SavedVehicleStatusResponse = z.infer<typeof SavedVehicleStatusResponseSchema>;
export type SavedClothing = z.infer<typeof SavedClothingSchema>;
export type SavedClothingToggleResponse = z.infer<typeof SavedClothingToggleResponseSchema>;
export type SavedClothingStatusResponse = z.infer<typeof SavedClothingStatusResponseSchema>;
export type FavoriteCategory = z.infer<typeof FavoriteCategorySchema>;
export type FavoriteItem = z.infer<typeof FavoriteItemSchema>;
export type FavoritesListResponse = z.infer<typeof FavoritesListResponseSchema>;
export type LeadCreate = z.infer<typeof LeadCreateSchema>;
export type LeadRecord = z.infer<typeof LeadRecordSchema>;
export type LeadCreateResponse = z.infer<typeof LeadCreateResponseSchema>;
export type ListingAnalyticsRange = z.infer<typeof ListingAnalyticsRangeSchema>;
export type ListingAnalyticsSummary = z.infer<typeof ListingAnalyticsSummarySchema>;
export type ListingAnalyticsSection = z.infer<typeof ListingAnalyticsSectionSchema>;
export type ListingAnalyticsDaily = z.infer<typeof ListingAnalyticsDailySchema>;
export type ListingAnalyticsPhotos = z.infer<typeof ListingAnalyticsPhotosSchema>;
export type ListingAnalyticsResponse = z.infer<typeof ListingAnalyticsResponseSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type MessageCreate = z.infer<typeof MessageCreateSchema>;
export type BuyerConversation = z.infer<typeof BuyerConversationSchema>;
export type BuyerConversationsResponse = z.infer<typeof BuyerConversationsResponseSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type VehicleResponse = z.infer<typeof VehicleResponseSchema>;

export const ClothingListingStatusSchema = z.enum(['draft', 'active', 'archived']);

const lineSheetUrl = z.string().refine((value) => {
  if (value.startsWith('gs://')) return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}, { message: 'Line sheet URL must use http, https, or gs://' });

export const ClothingListingSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  brand: z.string().min(1),
  // Gemini catalog extraction often omits wholesale price (0) until the seller edits.
  price: z.number().nonnegative(),
  description: z.string().min(1),
  sizes: z.array(z.string().min(1)),
  // Material may be blank on AI-extracted drafts.
  material: z.string(),
  galleryPhotos: z.array(httpHttpsUrl),
  createdAt: z.coerce.date(),
  status: ClothingListingStatusSchema,
  sellerId: z.string().min(1),
  prePackRatio: z.string().optional(),
  pdfLineSheetUrl: lineSheetUrl.optional(),
  pdfDefaultPage: z.coerce.number().int().positive().nullish(),
  colors: z.array(z.string().min(1)).optional(),
  isFeatured: z.boolean().optional(),
  isSale: z.boolean().optional(),
  salePrice: z.number().nonnegative().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  featuredSortOrder: z.number().int().nonnegative().optional(),
});

export const ClothingListingResponseSchema = ClothingListingSchema;
export type ClothingListing = z.infer<typeof ClothingListingSchema>;

export const ClothingListingCreateSchema = ClothingListingSchema.omit({
  id: true,
  sellerId: true,
  createdAt: true,
  status: true,
}).extend({
  price: z.number().positive(),
  material: z.string().min(1),
});

export const ClothingListingUpdateSchema = ClothingListingSchema.omit({
  id: true,
  sellerId: true,
  createdAt: true,
})
  .partial()
  .extend({
    salePrice: z.number().nonnegative().nullable().optional(),
  });

export type ClothingListingCreate = z.infer<typeof ClothingListingCreateSchema>;
export type ClothingListingUpdate = z.infer<typeof ClothingListingUpdateSchema>;

export const ClothingInquirySchema = z.object({
  clothingListingId: z.string().min(1),
  sellerId: z.string().min(1),
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(30),
  email: z.email().max(200),
  message: z.string().max(2000).optional().or(z.literal('')),
});

export type ClothingInquiry = z.infer<typeof ClothingInquirySchema>;
