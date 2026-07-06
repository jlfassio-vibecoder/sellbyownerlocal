import type {
  Monroney,
  MonroneyEpa,
  MonroneyFactorySpecs,
  MonroneyManufacturerInfo,
  MonroneySafetyRatings,
  VehicleSpecs,
} from '../schemas';
import type { VinDecodeResult } from './vin-decoder';

const US_REQUIREMENTS_DISCLAIMER =
  'THIS VEHICLE IS MANUFACTURED TO MEET SPECIFIC UNITED STATES REQUIREMENTS. THIS VEHICLE IS NOT MANUFACTURED FOR SALE OR REGISTRATION OUTSIDE OF THE UNITED STATES.';

const BODY_STYLE_PATTERNS = [
  'CREW CAB',
  'SUPER CREW',
  'SUPERCREW',
  'SUPER CAB',
  'QUAD CAB',
  'REGULAR CAB',
  'EXTENDED CAB',
  'DOUBLE CAB',
] as const;

/** Factory trim packages that define the Monroney header style (not base VIN trim). */
const NAMED_TRIM_PACKAGE_PATTERN =
  /\b(xlt|lariat|limited|bighorn|big horn|tradesman|platinum|laramie|rebel|trx|tremor|raptor|king ranch|denali|high country|z71|trail boss|lonestar|lone star|slt|st\b|ss\b|rs\b|gt\b)\b/i;

function normalizeDrivetrainShorthand(value: string): string {
  const upper = value.toUpperCase();
  if (upper.includes('4WD') || upper.includes('4X4')) return '4X4';
  if (upper.includes('AWD')) return 'AWD';
  if (upper.includes('2WD')) return '2WD';
  if (upper.includes('RWD')) return 'RWD';
  if (upper.includes('FWD')) return 'FWD';
  return '';
}

function normalizeBodyStyle(value: string): string {
  if (value === 'SUPER CREW' || value === 'SUPERCREW') return 'SUPERCREW';
  return value;
}

function normalizeBodyClass(bodyClass: string): string {
  const upper = bodyClass.toUpperCase();
  for (const pattern of [...BODY_STYLE_PATTERNS].sort((a, b) => b.length - a.length)) {
    if (upper.includes(pattern)) {
      return normalizeBodyStyle(pattern);
    }
  }
  if (upper.includes('CREW') && upper.includes('CAB')) return 'CREW CAB';
  if (upper.includes('SUPER') && upper.includes('CREW')) return 'SUPERCREW';
  return '';
}

/** NHTSA BodyCabType e.g. "Crew/Super Crew/Crew Max" → "CREW CAB". */
function normalizeBodyCabType(bodyCabType: string): string {
  const upper = bodyCabType.toUpperCase();
  // vPIC groups cab variants; Monroney uses the specific cab (CREW CAB for this RAM).
  if (/^CREW[\s/]/.test(upper) || upper.startsWith('CREW/SUPER')) {
    return 'CREW CAB';
  }
  if (upper.includes('SUPER') && upper.includes('CREW')) return 'SUPERCREW';
  if (upper.includes('SUPER CAB')) return 'SUPER CAB';
  if (upper.includes('QUAD')) return 'QUAD CAB';
  if (upper.includes('REGULAR')) return 'REGULAR CAB';
  if (upper.includes('EXTENDED')) return 'EXTENDED CAB';
  if (upper.includes('DOUBLE')) return 'DOUBLE CAB';
  return normalizeBodyClass(bodyCabType);
}

function cleanPackageLabel(label: string): string {
  return label
    .replace(/\s+package\s+[A-Z0-9]+$/i, '')
    .replace(/\s+package$/i, '')
    .replace(/\s+group$/i, '')
    .trim()
    .toUpperCase();
}

/**
 * Style name from Monroney optional equipment. Edition packages (Night Edition, etc.)
 * override the base VIN trim (Sport, Big Horn) shown on the physical sticker header.
 */
function extractMonroneyStyleName(options: Monroney['options']): string | undefined {
  const packages = options.filter((option) => option.category === 'package');

  const editionPackage = packages.find((option) => /\bedition\b/i.test(option.label));
  if (editionPackage) {
    return cleanPackageLabel(editionPackage.label);
  }

  const namedTrimPackage = packages.find((option) => NAMED_TRIM_PACKAGE_PATTERN.test(option.label));
  if (namedTrimPackage) {
    return cleanPackageLabel(namedTrimPackage.label);
  }

  return undefined;
}

function buildVinTrimLabel(factorySpecs?: MonroneyFactorySpecs): string | undefined {
  if (!factorySpecs) return undefined;

  const parts = [factorySpecs.trim, factorySpecs.trim2].filter(
    (value) => value && !/^base$/i.test(value)
  );
  if (parts.length === 0) return undefined;
  return parts.join(' ').toUpperCase();
}

export function buildMonroneyFactorySpecs(decoded: VinDecodeResult): MonroneyFactorySpecs {
  return {
    trim: decoded.trim,
    ...(decoded.trim2 ? { trim2: decoded.trim2 } : {}),
    ...(decoded.series ? { series: decoded.series } : {}),
    bodyClass: decoded.bodyClass,
    ...(decoded.bodyCabType ? { bodyCabType: decoded.bodyCabType } : {}),
    drivetrain: decoded.drivetrain,
    plant: decoded.plant,
    plantCountry: decoded.plantCountry,
  };
}

export interface MonroneyStyleLineInput {
  model: string;
  /** Used when monroney.factorySpecs is missing (legacy listings). */
  drivetrainFallback?: string;
  monroney?: Pick<Monroney, 'options' | 'factorySpecs'>;
}

/**
 * Monroney header style line: "{model} {style} {body} {drive}" e.g. "1500 NIGHT EDITION CREW CAB 4X4".
 * Built from NHTSA vPIC factory specs + Monroney optional equipment only.
 */
export function buildMonroneyStyleLine(input: MonroneyStyleLineInput): string {
  const factorySpecs = input.monroney?.factorySpecs;
  const styleName =
    extractMonroneyStyleName(input.monroney?.options ?? []) ?? buildVinTrimLabel(factorySpecs);

  const bodyStyle = normalizeBodyCabType(factorySpecs?.bodyCabType ?? '') ||
    normalizeBodyClass(factorySpecs?.bodyClass ?? '');

  const drivetrain = normalizeDrivetrainShorthand(
    factorySpecs?.drivetrain ?? input.drivetrainFallback ?? ''
  );

  return [input.model, styleName, bodyStyle, drivetrain].filter(Boolean).join(' ').toUpperCase();
}

export function buildBaseModelLine(input: {
  make: string;
  model: string;
  factorySpecs?: MonroneyFactorySpecs;
}): string {
  const trim =
    input.factorySpecs?.trim && !/^base$/i.test(input.factorySpecs.trim)
      ? input.factorySpecs.trim.trim().toUpperCase()
      : '';
  const bodyStyle =
    normalizeBodyCabType(input.factorySpecs?.bodyCabType ?? '') ||
    normalizeBodyClass(input.factorySpecs?.bodyClass ?? '');
  const drivetrain = normalizeDrivetrainShorthand(input.factorySpecs?.drivetrain ?? '');

  return [input.make, input.model, trim, bodyStyle, drivetrain].filter(Boolean).join(' ').toUpperCase();
}

export interface FederalMonroneyEnrichment {
  epa?: MonroneyEpa;
  safetyRatings?: MonroneySafetyRatings;
  manufacturerInfo?: MonroneyManufacturerInfo;
}

function applyFederalEnrichment(monroney: Monroney, federal?: FederalMonroneyEnrichment): Monroney {
  if (!federal) return monroney;

  let result = { ...monroney };
  if (federal.epa) {
    result = {
      ...result,
      epa: federal.epa,
      fuelEconomy: {
        city: federal.epa.city,
        highway: federal.epa.highway,
        combined: federal.epa.combined,
      },
    };
  }
  if (federal.safetyRatings) {
    result = { ...result, safetyRatings: federal.safetyRatings };
  }
  if (federal.manufacturerInfo) {
    result = { ...result, manufacturerInfo: federal.manufacturerInfo };
  }
  return result;
}

export function enrichMonroneyFromVinDecode(
  decoded: VinDecodeResult,
  monroney: Monroney,
  federal?: FederalMonroneyEnrichment
): Monroney {
  const factorySpecs = buildMonroneyFactorySpecs(decoded);
  const enriched = { ...monroney, factorySpecs };

  const withStyle = {
    ...enriched,
    styleLine: buildMonroneyStyleLine({ model: decoded.model, monroney: enriched }),
    assembly: monroney.assembly ?? {
      plant: decoded.plant,
      country: decoded.plantCountry,
    },
  };

  return applyFederalEnrichment(withStyle, federal);
}

export function buildMonroneyStyleLineFromVinDecode(
  decoded: VinDecodeResult,
  monroney?: Pick<Monroney, 'options' | 'factorySpecs'>
): string {
  return buildMonroneyStyleLine({
    model: decoded.model,
    monroney: monroney ?? { options: [], factorySpecs: buildMonroneyFactorySpecs(decoded) },
  });
}

export function buildMonroneyStyleLineFromVehicle(
  vehicle: Pick<{ model: string; specs: VehicleSpecs }, 'model' | 'specs'>,
  monroney: Pick<Monroney, 'options' | 'factorySpecs'>
): string {
  return buildMonroneyStyleLine({
    model: vehicle.model,
    drivetrainFallback: vehicle.specs.drivetrain,
    monroney,
  });
}

export { US_REQUIREMENTS_DISCLAIMER };
