import { z } from 'zod';

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
  date: z.string().min(1),
  service: z.string().min(1),
});

export const VehicleDocumentsSchema = z.object({
  windowSticker: z.string().url().optional(),
  kbbReport: z.string().url().optional(),
  carfaxReport: z.string().url().optional(),
  smogReport: z.string().url().optional(),
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

export const GalleryPhotoSchema = z.object({
  url: z.string().url(),
  category: z.string().min(1),
  caption: z.string().min(1),
  alt: z.string().min(1),
});

export const MarketComparisonPointSchema = z.object({
  name: z.string().min(1),
  value: z.number().positive(),
  highlighted: z.boolean().optional(),
});

export const MarketValuationSchema = z.object({
  intro: z.string().optional(),
  dealerReality: z.string().optional(),
  kbbValue: z.string().optional(),
  thisTruck: z.string().optional(),
  comparisons: z.array(MarketComparisonPointSchema).min(2),
});

export const InquirySchema = z.object({
  vehicleId: z.string().min(1),
  sellerId: z.string().min(1),
  name: z.string().min(1).max(100),
  phone: z.string().min(1).max(30),
  email: z.string().email().max(200),
  message: z.string().max(2000).optional().or(z.literal('')),
});

export const PitchBlockSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  icon: z.string().optional(),
  images: z.array(z.string().url()).max(3).optional(),
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

export const VehicleSchema = z.object({
  year: z.number().int().min(1900),
  make: z.string().min(1),
  model: z.string().min(1),
  price: z.number().positive(),
  mileage: z.number().int().nonnegative(),
  description: z.string().min(1),
  images: z.array(z.string().url()),
  status: VehicleStatusSchema,
  sellerId: z.string().min(1),
  sellerName: z.string().min(1),
  location: VehicleLocationSchema,
  tags: z.array(z.string()),
  vin: z.string().min(1).optional(),
  createdAt: z.string().datetime(),
  specs: VehicleSpecsSchema,
  features: z.array(z.string().min(1)).min(1),
  maintenance: z.array(MaintenanceRecordSchema).min(1),
  documents: VehicleDocumentsSchema.optional(),
  windowStickerBreakdown: WindowStickerBreakdownSchema.optional(),
  videoUrl: z.string().url().optional(),
  videoPosterUrl: z.string().url().optional(),
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
export type GalleryPhoto = z.infer<typeof GalleryPhotoSchema>;
export type MarketComparisonPoint = z.infer<typeof MarketComparisonPointSchema>;
export type MarketValuation = z.infer<typeof MarketValuationSchema>;
export type Inquiry = z.infer<typeof InquirySchema>;
export type PitchBlock = z.infer<typeof PitchBlockSchema>;
export type SellersNote = z.infer<typeof SellersNoteSchema>;
export type MechanicalItem = z.infer<typeof MechanicalItemSchema>;
export type MechanicalIntegrity = z.infer<typeof MechanicalIntegritySchema>;
export type DocumentsBanner = z.infer<typeof DocumentsBannerSchema>;
export type UserResponse = z.infer<typeof UserResponseSchema>;
export type VehicleResponse = z.infer<typeof VehicleResponseSchema>;
