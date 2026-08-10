import { useEffect } from 'react';
import {
  trackApparelPdpViewOnce,
  trackApparelStorefrontViewOnce,
} from '../lib/listing-analytics-client';

type ApparelAnalyticsProps =
  | { surface: 'apparel_storefront'; sellerId: string; clothingId?: never }
  | { surface: 'apparel_pdp'; clothingId: string; sellerId?: never };

/** Fires a single apparel page_view for storefront catalog or item PDP. */
export default function ApparelAnalytics(props: ApparelAnalyticsProps) {
  const sellerId = props.surface === 'apparel_storefront' ? props.sellerId : undefined;
  const clothingId = props.surface === 'apparel_pdp' ? props.clothingId : undefined;

  useEffect(() => {
    if (props.surface === 'apparel_storefront' && sellerId) {
      trackApparelStorefrontViewOnce(sellerId);
      return;
    }
    if (props.surface === 'apparel_pdp' && clothingId) {
      trackApparelPdpViewOnce(clothingId);
    }
  }, [props.surface, sellerId, clothingId]);

  return null;
}
