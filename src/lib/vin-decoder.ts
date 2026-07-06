import { vinString } from '../schemas';

export interface VinDecodeResult {
  vin: string;
  year: number;
  make: string;
  model: string;
  manufacturer: string;
  trim: string;
  trim2: string;
  series: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  bodyClass: string;
  bodyCabType: string;
  fuelType: string;
  displacementL: string;
  engineCylinders: string;
  plant: string;
  plantCountry: string;
}

interface NhtsaResult {
  ModelYear?: string;
  Make?: string;
  Model?: string;
  Manufacturer?: string;
  Trim?: string;
  Trim2?: string;
  Series?: string;
  Series2?: string;
  EngineConfiguration?: string;
  DisplacementL?: string;
  EngineCylinders?: string;
  EngineHP?: string;
  TransmissionStyle?: string;
  DriveType?: string;
  BodyClass?: string;
  BodyCabType?: string;
  FuelTypePrimary?: string;
  PlantCity?: string;
  PlantCountry?: string;
  ErrorCode?: string;
  ErrorText?: string;
}

const VPIC_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';

function pickString(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

function buildEngineLabel(result: NhtsaResult): string {
  const displacement = pickString(result.DisplacementL);
  const cylinders = pickString(result.EngineCylinders);
  const config = pickString(result.EngineConfiguration);
  const hp = pickString(result.EngineHP);

  const parts: string[] = [];
  if (displacement) parts.push(`${displacement}L`);
  if (cylinders) parts.push(`${cylinders}-cyl`);
  if (config) parts.push(config);
  if (hp) parts.push(`${hp} HP`);

  return parts.join(' ') || 'Unknown Engine';
}

function buildTrimLabel(result: NhtsaResult): string {
  const trim = pickString(result.Trim, result.Trim2);
  return trim || 'Base';
}

function parseYear(raw: string | undefined): number | null {
  const year = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(year) || year < 1900) return null;
  return year;
}

function isVinDecodeError(result: NhtsaResult): boolean {
  const errorCode = result.ErrorCode ?? '';
  if (!errorCode || errorCode === '0') return false;
  return !/success/i.test(result.ErrorText ?? '');
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const parsedVin = vinString.parse(vin.toUpperCase());
  const url = `${VPIC_BASE}/DecodeVinValues/${encodeURIComponent(parsedVin)}?format=json`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`NHTSA vPIC request failed (${response.status})`);
  }

  const payload = (await response.json()) as { Results?: NhtsaResult[] };
  const result = payload.Results?.[0];

  if (!result || isVinDecodeError(result)) {
    throw new Error('VIN could not be decoded');
  }

  const year = parseYear(result.ModelYear);
  const make = pickString(result.Make);
  const model = pickString(result.Model);

  if (!year || !make || !model) {
    throw new Error('VIN decode returned incomplete vehicle data');
  }

  return {
    vin: parsedVin,
    year,
    make,
    model,
    manufacturer: pickString(result.Manufacturer, make),
    trim: pickString(result.Trim) || 'Base',
    trim2: pickString(result.Trim2),
    series: pickString(result.Series, result.Series2),
    engine: buildEngineLabel(result),
    transmission: pickString(result.TransmissionStyle) || 'Automatic',
    drivetrain: pickString(result.DriveType) || 'Unknown',
    bodyClass: pickString(result.BodyClass) || 'Unknown',
    bodyCabType: pickString(result.BodyCabType),
    fuelType: pickString(result.FuelTypePrimary) || 'Gasoline',
    displacementL: pickString(result.DisplacementL),
    engineCylinders: pickString(result.EngineCylinders),
    plant: pickString(result.PlantCity) || 'Unknown',
    plantCountry: pickString(result.PlantCountry) || 'Unknown',
  };
}

export { buildTrimLabel };
