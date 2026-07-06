import type { Monroney, VehicleResponse } from '../schemas';
import { MonroneySchema } from '../schemas';
import { fetchFederalMonroneyData } from './federal-data';
import { enrichMonroneyFromVinDecode } from './monroney-style-line';
import { decodeVin } from './vin-decoder';

/** Build core Monroney pricing from legacy windowStickerBreakdown line items. */
export function buildMonroneyFromBreakdown(vehicle: VehicleResponse): Monroney | undefined {
  const breakdown = vehicle.windowStickerBreakdown;
  if (!breakdown?.lineItems?.length) return undefined;

  const baseItem = breakdown.lineItems.find((item) => /base\s*price/i.test(item.label));
  const destItem = breakdown.lineItems.find((item) => /destination/i.test(item.label));
  const destinationCharge = destItem?.price ?? 0;

  let baseMsrp = baseItem?.price;
  if (baseMsrp == null) {
    const optionTotal = breakdown.lineItems
      .filter((item) => item !== destItem && !/base\s*price/i.test(item.label))
      .reduce((sum, item) => sum + item.price, 0);
    baseMsrp = breakdown.totalMsrp - optionTotal - destinationCharge;
  }

  if (baseMsrp <= 0) {
    return undefined;
  }

  const options = breakdown.lineItems
    .filter((item) => item !== baseItem && item !== destItem)
    .map((item) => ({
      label: item.label,
      price: item.price,
      category: (/package|group/i.test(item.label) ? 'package' : 'option') as 'package' | 'option',
    }));

  const powertrainItems = [
    vehicle.specs.engine,
    vehicle.specs.transmission,
    vehicle.specs.drivetrain,
  ].filter((value) => value?.trim());

  const standardEquipment =
    vehicle.features?.length && vehicle.features.length > 0
      ? [{ category: 'Installed Features', items: vehicle.features }]
      : powertrainItems.length > 0
        ? [{ category: 'Powertrain', items: powertrainItems }]
        : [{ category: 'Standard Equipment', items: ['See listing for details'] }];

  const monroney = {
    baseMsrp,
    destinationCharge,
    totalMsrp: breakdown.totalMsrp,
    options,
    standardEquipment,
  };

  const parsed = MonroneySchema.safeParse(monroney);
  return parsed.success ? parsed.data : undefined;
}

function buildMonroneyFromSellersNote(vehicle: VehicleResponse): Monroney | undefined {
  const msrp = vehicle.sellersNote?.originalMsrp;
  if (msrp == null || msrp <= 0) return undefined;

  const powertrainItems = [
    vehicle.specs.engine,
    vehicle.specs.transmission,
    vehicle.specs.drivetrain,
  ].filter((value) => value?.trim());

  const monroney = {
    baseMsrp: msrp,
    destinationCharge: 0,
    totalMsrp: msrp,
    options: [],
    standardEquipment:
      powertrainItems.length > 0
        ? [{ category: 'Powertrain', items: powertrainItems }]
        : [{ category: 'Standard Equipment', items: ['See listing for details'] }],
  };

  const parsed = MonroneySchema.safeParse(monroney);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Resolve Monroney data for listing display: stored monroney, breakdown, or sellers note MSRP.
 * When a VIN is available, enriches with vPIC factory specs and federal EPA/safety data.
 */
export async function resolveVehicleDisplayMonroney(
  vehicle: VehicleResponse
): Promise<Monroney | undefined> {
  if (vehicle.monroney) {
    return vehicle.monroney;
  }

  const baseline =
    buildMonroneyFromBreakdown(vehicle) ?? buildMonroneyFromSellersNote(vehicle);
  if (!baseline) {
    return undefined;
  }

  if (!vehicle.vin) {
    return baseline;
  }

  try {
    const decoded = await decodeVin(vehicle.vin);
    const federal = await fetchFederalMonroneyData(decoded);
    const enriched = enrichMonroneyFromVinDecode(decoded, baseline, federal);
    const parsed = MonroneySchema.safeParse(enriched);
    return parsed.success ? parsed.data : baseline;
  } catch {
    return baseline;
  }
}
