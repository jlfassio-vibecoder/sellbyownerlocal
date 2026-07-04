import type {
  PitchBlock,
  VehicleDashboardUpdate,
  VehicleFormState,
  VehicleHighlight,
  VehicleResponse,
} from '../schemas';

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

function buildPitchBlocks(
  state: VehicleFormState,
  existing: VehicleResponse
): PitchBlock[] {
  const existingBlocks = existing.sellersNote?.blocks ?? [];

  return FORM_BLOCK_BODIES.map((bodyKey, index) => {
    const existingBlock = existingBlocks[index];
    const defaults = DEFAULT_PITCH_BLOCKS[index]!;
    const body = optionalString(state[bodyKey] as string | undefined);

    return {
      title: existingBlock?.title ?? defaults.title,
      icon: existingBlock?.icon ?? defaults.icon,
      body: body || existingBlock?.body || '',
      ...(existingBlock?.images ? { images: existingBlock.images } : {}),
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

function buildDocuments(state: VehicleFormState) {
  const documents: NonNullable<VehicleDashboardUpdate['documents']> = {};

  if (state.windowStickerUrl?.trim()) {
    documents.windowSticker = state.windowStickerUrl.trim();
  }
  if (state.carfaxReportUrl?.trim()) {
    documents.carfaxReport = state.carfaxReportUrl.trim();
  }
  if (state.kbbReportUrl?.trim()) {
    documents.kbbReport = state.kbbReportUrl.trim();
  }
  if (state.smogReportUrl?.trim()) {
    documents.smogReport = state.smogReportUrl.trim();
  }

  return Object.keys(documents).length > 0 ? documents : undefined;
}

export function vehicleToFormState(vehicle: VehicleResponse): VehicleFormState {
  const blocks = vehicle.sellersNote?.blocks ?? [];
  const mechanicalItems = vehicle.mechanicalIntegrity?.items ?? [];
  const highlights = vehicle.highlights ?? [];

  return {
    mileage: formatMileage(vehicle.mileage),
    price: formatCurrency(vehicle.price),
    windowStickerUrl: vehicle.documents?.windowSticker ?? '',
    carfaxReportUrl: vehicle.documents?.carfaxReport ?? '',
    kbbReportUrl: vehicle.documents?.kbbReport ?? '',
    smogReportUrl: vehicle.documents?.smogReport ?? '',
    subtitle: vehicle.sellersNote?.subtitle ?? '',
    msrp: vehicle.sellersNote?.originalMsrp
      ? formatCurrency(vehicle.sellersNote.originalMsrp)
      : '',
    sellersNoteIntro: vehicle.sellersNote?.intro ?? '',
    peaceOfMindText: blocks[0]?.body ?? '',
    maintenanceText: blocks[1]?.body ?? '',
    utilityTowingText: blocks[2]?.body ?? '',
    luxuryOptionsText: blocks[3]?.body ?? '',
    ctaText: vehicle.sellersNote?.ctaText ?? '',
    mechanicalIntegrityIntro: vehicle.mechanicalIntegrity?.intro ?? '',
    mechanicalItem1Title: mechanicalItems[0]?.title ?? '',
    mechanicalItem1Text: mechanicalItems[0]?.text ?? '',
    mechanicalItem2Title: mechanicalItems[1]?.title ?? '',
    mechanicalItem2Text: mechanicalItems[1]?.text ?? '',
    mechanicalItem3Title: mechanicalItems[2]?.title ?? '',
    mechanicalItem3Text: mechanicalItems[2]?.text ?? '',
    marketValuationIntro: vehicle.marketValuation?.intro ?? '',
    marketDealerReality: vehicle.marketValuation?.dealerReality ?? '',
    marketKbbValue: vehicle.marketValuation?.kbbValue ?? '',
    marketThisTruck: vehicle.marketValuation?.thisTruck ?? '',
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

  const marketIntro = optionalString(state.marketValuationIntro).trim();
  const marketDealerReality = optionalString(state.marketDealerReality).trim();
  const marketKbbValue = optionalString(state.marketKbbValue).trim();
  const marketThisTruck = optionalString(state.marketThisTruck).trim();

  if (
    existing.marketValuation &&
    (marketIntro || marketDealerReality || marketKbbValue || marketThisTruck)
  ) {
    patch.marketValuation = {
      ...existing.marketValuation,
      ...(marketIntro ? { intro: marketIntro } : {}),
      ...(marketDealerReality ? { dealerReality: marketDealerReality } : {}),
      ...(marketKbbValue ? { kbbValue: marketKbbValue } : {}),
      ...(marketThisTruck ? { thisTruck: marketThisTruck } : {}),
    };
  }

  const highlights = buildHighlights(state);
  if (highlights.length > 0) {
    patch.highlights = highlights;
  }

  const documents = buildDocuments(state);
  if (documents) {
    patch.documents = documents;
  }

  const videoUrl = optionalString(state.videoUrl).trim();
  if (videoUrl) patch.videoUrl = videoUrl;

  const videoPosterUrl = optionalString(state.videoPosterUrl).trim();
  if (videoPosterUrl) patch.videoPosterUrl = videoPosterUrl;

  return patch;
}
