import { useEffect, useRef } from 'react';
import {
  sendApparelPageLeaveBeacon,
  trackApparelPdpViewOnce,
  trackApparelStorefrontViewOnce,
} from '../lib/listing-analytics-client';

type ApparelAnalyticsProps =
  | { surface: 'apparel_storefront'; sellerId: string; clothingId?: never }
  | { surface: 'apparel_pdp'; clothingId: string; sellerId?: never };

/** Fires apparel page_view (and PDP page_leave dwell) for storefront or item PDP. */
export default function ApparelAnalytics(props: ApparelAnalyticsProps) {
  const sellerId = props.surface === 'apparel_storefront' ? props.sellerId : undefined;
  const clothingId = props.surface === 'apparel_pdp' ? props.clothingId : undefined;
  const leaveSentRef = useRef(false);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    if (props.surface === 'apparel_storefront' && sellerId) {
      trackApparelStorefrontViewOnce(sellerId);
      return;
    }
    if (props.surface === 'apparel_pdp' && clothingId) {
      trackApparelPdpViewOnce(clothingId);
      mountedAtRef.current = Date.now();
      leaveSentRef.current = false;
    }
  }, [props.surface, sellerId, clothingId]);

  useEffect(() => {
    if (props.surface !== 'apparel_pdp' || !clothingId) return;

    const sendLeave = () => {
      if (leaveSentRef.current) return;

      const durationSeconds = Math.round((Date.now() - mountedAtRef.current) / 1000);
      if (durationSeconds < 1) return;

      leaveSentRef.current = true;
      sendApparelPageLeaveBeacon(clothingId, durationSeconds);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        sendLeave();
      }
    };

    window.addEventListener('pagehide', sendLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', sendLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      sendLeave();
    };
  }, [props.surface, clothingId]);

  return null;
}
