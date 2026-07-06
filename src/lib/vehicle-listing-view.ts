import {
  Cog,
  FileText,
  Gauge,
  Palette,
  ShieldCheck,
  Sofa,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { PitchBlock, VehicleResponse } from '../schemas';

export const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export const mileageFormatter = new Intl.NumberFormat('en-US');

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

const pdfUrlPattern = /\.pdf($|\?)/i;

const NON_EMBEDDABLE_PDF_HOSTS = new Set(['www.w3.org', 'w3.org']);

export function isPdfUrl(url: string) {
  return url.startsWith('data:application/pdf') || pdfUrlPattern.test(url);
}

/** Whether a PDF URL can be shown in an iframe without CSP frame-ancestors errors. */
export function canEmbedPdf(url: string): boolean {
  if (url.startsWith('data:application/pdf')) return true;
  if (url.startsWith('/')) return true;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (NON_EMBEDDABLE_PDF_HOSTS.has(host)) return false;

    return (
      host.endsWith('firebasestorage.app') ||
      host.endsWith('googleusercontent.com') ||
      host === 'storage.googleapis.com'
    );
  } catch {
    return false;
  }
}

const documentItems = [
  {
    key: 'windowSticker' as const,
    id: 'build-sheet',
    title: 'Original Window Sticker',
    description: 'Factory installed options and original MSRP.',
    icon: FileText,
  },
  {
    key: 'kbbReport' as const,
    id: 'kbb',
    title: 'Kelley Blue Book Report',
    description: 'Official KBB valuation and condition report.',
    icon: FileText,
  },
  {
    key: 'carfaxReport' as const,
    id: 'carfax',
    title: 'Carfax Report',
    description: 'Detailed vehicle history and condition report.',
    icon: ShieldCheck,
  },
  {
    key: 'smogReport' as const,
    id: 'smog',
    title: 'Smog Report',
    description: 'Official emissions and smog check certification.',
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

function getYoutubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/
  );
  return match?.[1] ?? null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:.*#|.*\/videos\/)?([0-9]+)/);
  return match?.[1] ?? null;
}

function normalizePosterUrl(posterUrl: string): string {
  if (posterUrl.includes('imgur.com') && !posterUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    const imgurMatch = posterUrl.match(/imgur\.com\/([a-zA-Z0-9]+)/);
    if (imgurMatch && imgurMatch[1] !== 'a' && imgurMatch[1] !== 'gallery') {
      return `https://i.imgur.com/${imgurMatch[1]}.jpg`;
    }
  }
  return posterUrl;
}

const documentNavLabels: Record<string, string> = {
  kbb: 'KBB Report',
  carfax: 'Carfax',
  smog: 'Smog Report',
};

export interface VehicleListingView {
  pageTitle: string;
  descriptionExcerpt: string;
  heroImage: string | undefined;
  primaryTag: string | undefined;
  sortedMaintenance: VehicleResponse['maintenance'];
  availableDocuments: DocumentItem[];
  otherDocuments: DocumentItem[];
  windowStickerUrl: string | undefined;
  windowStickerBreakdown: VehicleResponse['windowStickerBreakdown'];
  monroney: VehicleResponse['monroney'];
  showWindowStickerSection: boolean;
  showDocumentsSection: boolean;
  walkaroundVideoUrl: string | undefined;
  walkaroundPosterUrl: string | undefined;
  walkaroundYoutubeId: string | null;
  walkaroundVimeoId: string | null;
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
  const sortedMaintenance = [...vehicle.maintenance].sort((a, b) => b.date.localeCompare(a.date));

  const availableDocuments = documentItems.flatMap((item) => {
    const url = vehicle.documents?.[item.key];
    return url ? [{ ...item, url }] : [];
  });

  const windowStickerUrl = vehicle.documents?.windowSticker;
  const windowStickerBreakdown = vehicle.windowStickerBreakdown;
  const monroney = vehicle.monroney;
  const otherDocuments = availableDocuments.filter((doc) => doc.key !== 'windowSticker');
  const showWindowStickerSection = Boolean(windowStickerUrl || windowStickerBreakdown || monroney);
  const showDocumentsSection = showWindowStickerSection || otherDocuments.length > 0;

  const walkaroundVideoUrl = vehicle.videoUrl;
  const walkaroundPosterUrl = vehicle.videoPosterUrl
    ? normalizePosterUrl(vehicle.videoPosterUrl)
    : undefined;
  const walkaroundYoutubeId = walkaroundVideoUrl ? getYoutubeId(walkaroundVideoUrl) : null;
  const walkaroundVimeoId = walkaroundVideoUrl ? getVimeoId(walkaroundVideoUrl) : null;

  const pageTitle = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const descriptionExcerpt =
    vehicle.description.length > 200
      ? `${vehicle.description.slice(0, 200)}…`
      : vehicle.description;
  const heroImage = vehicle.images[0];
  const primaryTag = vehicle.tags[0];

  const sellersNote = vehicle.sellersNote;
  const pitchSubtitle = sellersNote?.subtitle ?? pageTitle;
  const pitchIntro = sellersNote?.intro ?? vehicle.description;
  const originalMsrp =
    sellersNote?.originalMsrp ?? monroney?.totalMsrp ?? windowStickerBreakdown?.totalMsrp;
  const heroImagePending = vehicle.aiGeneration?.status === 'text_complete' && !vehicle.images[0];
  const pitchBlocks = sellersNote?.blocks ?? [];
  const ctaButtonLabel =
    sellersNote?.ctaButtonLabel ?? 'Contact Seller to Schedule a Showing';

  const navSections: { id: string; label: string }[] = [{ id: 'overview', label: 'Overview' }];
  if (vehicle.videoUrl) {
    navSections.push({ id: 'walkaround', label: 'Walkaround' });
  }
  navSections.push({ id: 'pitch', label: "Seller's Note" });
  if (vehicle.galleryPhotos?.length) {
    navSections.push({ id: 'gallery', label: 'Gallery' });
  }
  navSections.push({ id: 'maintenance', label: 'Maintenance' });
  if (vehicle.marketValuation) {
    navSections.push({ id: 'market', label: 'Market Value' });
  }
  navSections.push({ id: 'features', label: 'Utility' });
  navSections.push({ id: 'specs', label: 'Specifications' });
  navSections.push({ id: 'contact', label: 'Contact' });
  if (showWindowStickerSection) {
    navSections.push({ id: 'build-sheet', label: 'Build Sheet' });
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
    primaryTag,
    sortedMaintenance,
    availableDocuments,
    otherDocuments,
    windowStickerUrl,
    windowStickerBreakdown,
    monroney,
    showWindowStickerSection,
    showDocumentsSection,
    walkaroundVideoUrl,
    walkaroundPosterUrl,
    walkaroundYoutubeId,
    walkaroundVimeoId,
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
