import { z } from 'zod';

const parseableDateString = z
  .string()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Invalid date' });

const httpHttpsUrl = z.string().refine((value) => {
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

export const UserSchema = z.object({
  displayName: z.string().min(1).max(100),
  stats: UserStatsSchema,
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

export const MaintenanceRecordSchema = z.object({
  date: parseableDateString,
  service: z.string().min(1),
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
  generatedAt: z.string().datetime(),
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
  vehicleId: z.string().min(1),
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
  email: z.string().email().max(200),
  message: z.string().max(2000).optional().or(z.literal('')),
});

export const InquiryRecordSchema = InquirySchema.extend({
  id: z.string(),
  timestamp: z.string().datetime(),
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

const optionalString = z.string().optional().or(z.literal(''));

export const FormMarketValuationSchema = MarketValuationSchema.extend({
  retailReadyPrice: optionalString,
});

export const VehicleFormStateSchema = z.object({
  listingTitle: optionalString,
  description: optionalString,
  drivetrain: optionalString,
  locationCity: optionalString,
  mileage: z.string().min(1).max(20),
  price: z.string().min(1).max(20),
  windowStickerUrl: optionalString,
  carfaxReportUrl: optionalString,
  kbbReportUrl: optionalString,
  smogReportUrl: optionalString,
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
    highlights: z.array(VehicleHighlightSchema).optional(),
    images: z.array(httpHttpsUrl).max(30).optional(),
    specs: VehicleSpecsSchema.partial().optional(),
    location: VehicleLocationSchema.partial().optional(),
  })
  .strict();

export const UploadResponseSchema = z.object({
  url: documentUrl,
});

export const MessageSchema = z.object({
  id: z.string(),
  sessionId: z.string().min(1).max(100),
  vehicleId: z.string().min(1),
  sender: z.enum(['buyer', 'seller']),
  content: z.string().min(1).max(2000),
  timestamp: z.string().datetime(),
  isRead: z.number().int().min(0).max(1).optional(),
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

export const VehicleSchema = z.object({
  year: z.number().int().min(1900),
  make: z.string().min(1),
  model: z.string().min(1),
  price: z.number().positive(),
  mileage: z.number().int().nonnegative(),
  description: z.string().min(1),
  listingTitle: z.string().min(1).optional(),
  images: z.array(httpHttpsUrl),
  status: VehicleStatusSchema,
  sellerId: z.string().min(1),
  sellerName: z.string().min(1),
  location: VehicleLocationSchema,
  tags: z.array(z.string()),
  vin: vinString.optional(),
  createdAt: z.string().datetime(),
  specs: VehicleSpecsSchema,
  features: z.array(z.string().min(1)).min(1),
  highlights: z.array(VehicleHighlightSchema).optional(),
  maintenance: z.array(MaintenanceRecordSchema).min(1),
  documents: VehicleDocumentsSchema.optional(),
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
export type Vehicle = z.infer<typeof VehicleSchema>;
export type VehicleSpecs = z.infer<typeof VehicleSpecsSchema>;
export type MaintenanceRecord = z.infer<typeof MaintenanceRecordSchema>;
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
export type GalleryPhoto = z.infer<typeof GalleryPhotoSchema>;
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
export type VehicleFormState = z.infer<typeof VehicleFormStateSchema>;
export type VehicleDashboardUpdate = z.infer<typeof VehicleDashboardUpdateSchema>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type MessageCreate = z.infer<typeof MessageCreateSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type VehicleResponse = z.infer<typeof VehicleResponseSchema>;
