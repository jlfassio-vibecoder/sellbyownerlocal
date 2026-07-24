import {
  Cog,
  FileText,
  Gauge,
  Palette,
  Sofa,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { GalleryPhoto, PitchBlock, VehicleResponse } from '../schemas';
import { isPlaceholderDocumentUrl, resolveOriginalStickerUrl } from './original-sticker-url';
import { resolveHistoryReportUrls } from './history-report-urls';
import { resolveKbbReportUrl } from './kbb-report-url';
import { resolveSmogCertificateUrls } from './smog-certificate-url';
import {
  resolveCarouselImageUrls,
  resolveGalleryPhotos,
  resolveHeroImageUrls,
  resolveMarketImageUrls,
} from './resolve-display-media';
import { toVideoEmbed, type VideoEmbed } from '../utils/video';
export { canEmbedPdf, isPdfUrl } from './pdf-url';
export { mileageFormatter, priceFormatter } from '../utils/formatters';

export const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export const specItems = [
  { key: 'exteriorColor', label: 'Exterior', icon: Palette },
  { key: 'interiorColor', label: 'Interior', icon: Sofa },
  { key: 'transmission', label: 'Transmission', icon: Cog },
  { key: 'engine', label: 'Engine', icon: Gauge },
  { key: 'drivetrain', label: 'Drivetrain', icon: Truck },
] as const;

const documentItems = [
  {
    key: 'windowSticker' as const,
    id: 'build-sheet',
    title: 'Original Window Sticker',
    description: 'Factory installed options and original MSRP.',
    icon: FileText,
  },
];

export type DocumentItem = {
  key: string;
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  url: string;
};

function normalizePosterUrl(posterUrl: string): string {
  if (posterUrl.includes('imgur.com') && !posterUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    const imgurMatch = posterUrl.match(/imgur\.com\/([a-zA-Z0-9]+)/);
    if (imgurMatch && imgurMatch[1] !== 'a' && imgurMatch[1] !== 'gallery') {
      return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
    }
  }
  return posterUrl;
}

const documentNavLabels: Record<string, string> = {};

export interface VehicleListingView {
  pageTitle: string;
  descriptionExcerpt: string;
  heroImage: string | undefined;
  carouselImageUrls: string[];
  marketImageUrls: string[];
  galleryPhotos: GalleryPhoto[];
  primaryTag: string | undefined;
  availableDocuments: DocumentItem[];
  otherDocuments: DocumentItem[];
  originalStickerUrl: string | undefined;
  kbbReportUrl: string | undefined;
  smogCertificateUrls: string[];
  showGeneratedSticker: boolean;
  windowStickerBreakdown: VehicleResponse['windowStickerBreakdown'];
  monroney: VehicleResponse['monroney'];
  showWindowStickerSection: boolean;
  showDocumentsSection: boolean;
  historyReportUrls: string[];
  walkaroundPosterUrl: string | undefined;
  walkaroundEmbed: VideoEmbed | null;
  sellersNote: VehicleResponse['sellersNote'];
  pitchSubtitle: string;
  pitchIntro: string;
  originalMsrp: number | undefined;
  heroImagePending: boolean;
  pitchBlocks: PitchBlock[];
  ctaButtonLabel: string;
  navSections: { id: string; label: string }[];
}

export function buildVehicleListingView(vehicle: VehicleResponse): VehicleListingView {
  const availableDocuments = documentItems.flatMap((item) => {
    const url = vehicle.documents?.[item.key];
    if (!url || isPlaceholderDocumentUrl(url)) return [];
    return [{ ...item, url }];
  });

  const originalStickerUrl = resolveOriginalStickerUrl(vehicle);
  const kbbReportUrl = resolveKbbReportUrl(vehicle);
  const smogCertificateUrls = resolveSmogCertificateUrls(vehicle);
  const historyReportUrls = resolveHistoryReportUrls(vehicle);
  const windowStickerBreakdown = vehicle.windowStickerBreakdown;
  const monroney = vehicle.monroney;
  const showGeneratedSticker = !originalStickerUrl && Boolean(monroney);
  const otherDocuments = availableDocuments.filter((doc) => doc.key !== 'windowSticker');
  const showWindowStickerSection = Boolean(
    originalStickerUrl || monroney || windowStickerBreakdown
  );
  const showDocumentsSection =
    showWindowStickerSection ||
    historyReportUrls.length > 0 ||
    Boolean(kbbReportUrl) ||
    Boolean(smogCertificateUrls.length > 0) ||
    otherDocuments.length > 0;

  const walkaroundEmbed = vehicle.videoUrl ? toVideoEmbed(vehicle.videoUrl) : null;
  const walkaroundPosterUrl = vehicle.videoPosterUrl
    ? normalizePosterUrl(vehicle.videoPosterUrl)
    : undefined;

  const pageTitle =
    vehicle.listingTitle?.trim() ||
    `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const descriptionExcerpt =
    vehicle.description.length > 200
      ? `${vehicle.description.slice(0, 200)}…`
      : vehicle.description;
  const heroImageUrls = resolveHeroImageUrls(vehicle);
  const heroImage = heroImageUrls[0];
  const carouselImageUrls = resolveCarouselImageUrls(vehicle);
  const marketImageUrls = resolveMarketImageUrls(vehicle);
  const galleryPhotos = resolveGalleryPhotos(vehicle);
  const primaryTag = vehicle.tags[0];

  const sellersNote = vehicle.sellersNote;
  const pitchSubtitle = sellersNote?.subtitle ?? pageTitle;
  const pitchIntro = sellersNote?.intro ?? vehicle.description;
  const originalMsrp =
    sellersNote?.originalMsrp ?? monroney?.totalMsrp ?? windowStickerBreakdown?.totalMsrp;
  const heroImagePending =
    vehicle.aiGeneration?.status === 'text_complete' && !heroImageUrls[0];
  const pitchBlocks = sellersNote?.blocks ?? [];
  const ctaButtonLabel =
    sellersNote?.ctaButtonLabel ?? 'Contact Seller to Schedule a Showing';

  const navSections: { id: string; label: string }[] = [{ id: 'overview', label: 'Overview' }];
  if (walkaroundEmbed) {
    navSections.push({ id: 'walkaround', label: 'Walkaround' });
  }
  navSections.push({ id: 'pitch', label: "Seller's Note" });
  if (galleryPhotos.length > 0) {
    navSections.push({ id: 'gallery', label: 'Gallery' });
  }
  if (
    (vehicle.modifications ?? []).length > 0 ||
    (vehicle.modificationImageUrls ?? []).length > 0
  ) {
    navSections.push({ id: 'upgrades', label: 'Upgrades & Mods' });
  }
  navSections.push({ id: 'maintenance', label: 'Maintenance' });
  if (vehicle.marketValuation) {
    navSections.push({ id: 'market', label: 'Market Value' });
  }
  navSections.push({ id: 'features', label: 'Utility' });
  navSections.push({ id: 'specs', label: 'Specifications' });
  if (vehicle.inventorySource !== 'dealer_comp') {
    navSections.push({ id: 'contact', label: 'Contact' });
  }
  if (showWindowStickerSection) {
    navSections.push({ id: 'build-sheet', label: 'Build Sheet' });
  }
  if (historyReportUrls.length > 0) {
    navSections.push({ id: 'carfax', label: 'Carfax' });
  }
  if (kbbReportUrl) {
    navSections.push({ id: 'kbb', label: 'KBB Report' });
  }
  if (smogCertificateUrls.length > 0) {
    navSections.push({ id: 'smog', label: 'Smog Report' });
  }
  for (const doc of otherDocuments) {
    navSections.push({
      id: doc.id,
      label: documentNavLabels[doc.id] ?? doc.title,
    });
  }

  return {
    pageTitle,
    descriptionExcerpt,
    heroImage,
    carouselImageUrls,
    marketImageUrls,
    galleryPhotos,
    primaryTag,
    availableDocuments,
    otherDocuments,
    originalStickerUrl,
    kbbReportUrl,
    smogCertificateUrls,
    showGeneratedSticker,
    windowStickerBreakdown,
    monroney,
    showWindowStickerSection,
    showDocumentsSection,
    historyReportUrls,
    walkaroundPosterUrl,
    walkaroundEmbed,
    sellersNote,
    pitchSubtitle,
    pitchIntro,
    originalMsrp,
    heroImagePending,
    pitchBlocks,
    ctaButtonLabel,
    navSections,
  };
}
