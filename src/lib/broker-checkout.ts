import type { VehicleResponse } from '../schemas';

/**
 * Builds a mock KeySavvy-style broker checkout URL from server-trusted vehicle
 * and identity data. Replace with the real broker SDK/API in a later phase.
 */
export function generateBrokerCheckoutUrl(
  vehicle: Pick<VehicleResponse, 'vin' | 'price'>,
  buyerEmail: string,
  sellerEmail: string
): string {
  const url = new URL('https://www.keysavvy.com/pay');
  if (vehicle.vin) {
    url.searchParams.set('vin', vehicle.vin);
  }
  url.searchParams.set('price', String(vehicle.price));
  url.searchParams.set('seller', sellerEmail);
  url.searchParams.set('buyer', buyerEmail);
  return url.toString();
}
