import type {
  MonroneyEpa,
  MonroneyManufacturerInfo,
  MonroneySafetyRatings,
} from '../schemas';
import type { VinDecodeResult } from './vin-decoder';

const EPA_BASE = 'https://www.fueleconomy.gov/ws/rest';
const SAFETY_BASE = 'https://api.nhtsa.gov/SafetyRatings';

const MANUFACTURER_CONTACT: Record<string, { website?: string; phone?: string }> = {
  RAM: { website: 'www.ramtrucks.com', phone: '1-866-RAMINFO' },
  DODGE: { website: 'www.dodge.com', phone: '1-800-4ADODGE' },
  JEEP: { website: 'www.jeep.com', phone: '1-877-IAM-JEEP' },
  CHRYSLER: { website: 'www.chrysler.com', phone: '1-800-247-9753' },
  FORD: { website: 'www.ford.com', phone: '1-800-392-3673' },
  CHEVROLET: { website: 'www.chevrolet.com', phone: '1-800-222-1020' },
  GMC: { website: 'www.gmc.com', phone: '1-800-462-8782' },
  TOYOTA: { website: 'www.toyota.com', phone: '1-800-331-4331' },
};

function normalizeEpaMake(make: string): string {
  const upper = make.toUpperCase();
  if (upper === 'RAM') return 'Ram';
  return make.charAt(0).toUpperCase() + make.slice(1).toLowerCase();
}

function isFourWheelDrive(drivetrain: string): boolean {
  const upper = drivetrain.toUpperCase();
  return upper.includes('4WD') || upper.includes('4X4') || upper.includes('AWD');
}

function buildEpaModelCandidates(model: string, drivetrain: string): string[] {
  const driveSuffix = isFourWheelDrive(drivetrain) ? '4WD' : '2WD';
  return [`${model} ${driveSuffix}`, model];
}

function scoreEpaOption(optionText: string, decoded: VinDecodeResult): number {
  const text = optionText.toLowerCase();
  let score = 0;

  if (decoded.displacementL && text.includes(`${decoded.displacementL} l`)) {
    score += 5;
  }
  if (decoded.engineCylinders && text.includes(`${decoded.engineCylinders} cyl`)) {
    score += 3;
  }
  if (/diesel/i.test(text) && /diesel/i.test(decoded.fuelType)) {
    score += 4;
  }
  if (/auto/i.test(text) && /automatic/i.test(decoded.transmission)) {
    score += 1;
  }

  return score;
}

function parseRating(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 1 || parsed > 5) return undefined;
  return parsed;
}

function normalizeFuelTypeLabel(fuelType: string | undefined): string | undefined {
  if (!fuelType) return undefined;
  if (/electric/i.test(fuelType)) return 'Electric Vehicle';
  if (/diesel/i.test(fuelType)) return 'Diesel Vehicle';
  if (/hybrid/i.test(fuelType)) return 'Hybrid Vehicle';
  return 'Gasoline Vehicle';
}

async function fetchJson<T>(url: string): Promise<T | undefined> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return undefined;
    return (await response.json()) as T;
  } catch {
    return undefined;
  }
}

async function resolveEpaVehicleId(decoded: VinDecodeResult): Promise<string | undefined> {
  const make = normalizeEpaMake(decoded.make);
  const candidates = buildEpaModelCandidates(decoded.model, decoded.drivetrain);

  for (const model of candidates) {
    const url = `${EPA_BASE}/vehicle/menu/options?year=${decoded.year}&make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}`;
    const payload = await fetchJson<{
      menuItem?: { text: string; value: string } | { text: string; value: string }[];
    }>(url);
    const items = payload?.menuItem;
    if (!items) continue;

    const options = Array.isArray(items) ? items : [items];
    if (options.length === 0) continue;

    const ranked = options
      .map((option) => ({ option, score: scoreEpaOption(option.text, decoded) }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0]?.option ?? options[0];
    if (best?.value) return best.value;
  }

  return undefined;
}

export async function fetchEpaData(decoded: VinDecodeResult): Promise<MonroneyEpa | undefined> {
  const vehicleId = await resolveEpaVehicleId(decoded);
  if (!vehicleId) return undefined;

  const vehicle = await fetchJson<Record<string, string | number>>(`${EPA_BASE}/vehicle/${vehicleId}`);
  if (!vehicle) return undefined;

  const city = Number(vehicle.city08);
  const highway = Number(vehicle.highway08);
  const combined = Number(vehicle.comb08);
  if (!city || !highway || !combined) return undefined;

  const emissions = await fetchJson<{
    emissionsInfo?: { score?: string } | { score?: string }[];
  }>(`${EPA_BASE}/vehicle/emissions/${vehicleId}`);

  const emissionItems = emissions?.emissionsInfo;
  const emissionList = Array.isArray(emissionItems)
    ? emissionItems
    : emissionItems
      ? [emissionItems]
      : [];
  const smogScore = emissionList
    .map((item) => Number.parseFloat(item.score ?? ''))
    .find((score) => !Number.isNaN(score) && score >= 1 && score <= 10);

  const fuelCost = Number(vehicle.fuelCost08);
  const youSaveSpend = Number(vehicle.youSaveSpend);
  const co2 = Number(vehicle.co2TailpipeGpm ?? vehicle.co2);
  const ghg = Number(vehicle.ghgScore);

  return {
    city,
    highway,
    combined,
    gallonsPer100Mi: Math.round((100 / combined) * 10) / 10,
    ...(fuelCost > 0 ? { annualFuelCost: fuelCost } : {}),
    ...(Number.isFinite(youSaveSpend) ? { fiveYearSavings: youSaveSpend } : {}),
    ...(ghg >= 1 && ghg <= 10 ? { ghgRating: ghg } : {}),
    ...(smogScore !== undefined ? { smogRating: Math.round(smogScore) } : {}),
    ...(co2 > 0 ? { co2GramsPerMile: co2 } : {}),
    fuelType: normalizeFuelTypeLabel(String(vehicle.fuelType1 ?? vehicle.fuelType ?? decoded.fuelType)),
  };
}

function scoreSafetyDescription(description: string, decoded: VinDecodeResult): number {
  const text = description.toLowerCase();
  let score = 0;

  if (/crew/i.test(decoded.bodyCabType) && text.includes('crew')) score += 4;
  if (/quad/i.test(decoded.bodyCabType) && text.includes('quad')) score += 4;
  if (/regular/i.test(decoded.bodyCabType) && text.includes('regular')) score += 4;
  if (isFourWheelDrive(decoded.drivetrain) && text.includes('4wd')) score += 3;
  if (!isFourWheelDrive(decoded.drivetrain) && text.includes('2wd')) score += 3;

  return score;
}

export async function fetchSafetyRatings(
  decoded: VinDecodeResult
): Promise<MonroneySafetyRatings | undefined> {
  const url = `${SAFETY_BASE}/modelyear/${decoded.year}/make/${encodeURIComponent(decoded.make)}/model/${encodeURIComponent(decoded.model)}`;
  const payload = await fetchJson<{
    Results?: { VehicleId?: number; VehicleDescription?: string }[];
  }>(url);

  const results = payload?.Results ?? [];
  if (results.length === 0) return undefined;

  const ranked = results
    .filter((item) => item.VehicleId)
    .map((item) => ({
      item,
      score: scoreSafetyDescription(item.VehicleDescription ?? '', decoded),
    }))
    .sort((a, b) => b.score - a.score);

  const vehicleId = ranked[0]?.item.VehicleId;
  if (!vehicleId) return undefined;

  const detail = await fetchJson<{ Results?: Record<string, string>[] }>(
    `${SAFETY_BASE}/VehicleId/${vehicleId}`
  );
  const ratings = detail?.Results?.[0];
  if (!ratings) return undefined;

  const overallFront = parseRating(ratings.OverallFrontCrashRating);
  const overallSide = parseRating(ratings.OverallSideCrashRating);

  return {
    overall: parseRating(ratings.OverallRating),
    frontalDriver:
      parseRating(ratings.FrontCrashDriversideRating) ?? overallFront,
    frontalPassenger:
      parseRating(ratings.FrontCrashPassengersideRating) ?? overallFront,
    sideFrontSeat: parseRating(ratings.SideCrashDriversideRating) ?? overallSide,
    sideRearSeat: parseRating(ratings.SideCrashPassengersideRating) ?? overallSide,
    rollover: parseRating(ratings.RolloverRating),
  };
}

export function buildManufacturerInfo(decoded: VinDecodeResult): MonroneyManufacturerInfo {
  const makeKey = decoded.make.toUpperCase();
  const contact = MANUFACTURER_CONTACT[makeKey];

  return {
    name: decoded.manufacturer,
    ...(contact?.website ? { website: contact.website } : {}),
    ...(contact?.phone ? { phone: contact.phone } : {}),
  };
}

export async function fetchFederalMonroneyData(decoded: VinDecodeResult): Promise<{
  epa?: MonroneyEpa;
  safetyRatings?: MonroneySafetyRatings;
  manufacturerInfo: MonroneyManufacturerInfo;
}> {
  const [epa, safetyRatings] = await Promise.all([
    fetchEpaData(decoded),
    fetchSafetyRatings(decoded),
  ]);

  return {
    ...(epa ? { epa } : {}),
    ...(safetyRatings ? { safetyRatings } : {}),
    manufacturerInfo: buildManufacturerInfo(decoded),
  };
}
