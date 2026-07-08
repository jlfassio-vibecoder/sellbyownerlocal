import { useEffect, useRef } from 'react';
import {
  sendPageLeaveBeacon,
  trackHeroPhotoViewOnce,
  trackPageViewOnce,
  trackSectionViewOnce,
} from '../lib/listing-analytics-client';

interface ListingAnalyticsProps {
  vehicleId: string;
  sectionIds: string[];
}

export default function ListingAnalytics({ vehicleId, sectionIds }: ListingAnalyticsProps) {
  const leaveSentRef = useRef(false);
  const mountedAtRef = useRef(0);

  useEffect(() => {
    trackPageViewOnce(vehicleId);
    mountedAtRef.current = Date.now();
  }, [vehicleId]);

  useEffect(() => {
    const sendLeave = () => {
      if (leaveSentRef.current) return;

      const durationSeconds = Math.round((Date.now() - mountedAtRef.current) / 1000);
      if (durationSeconds < 1) return;

      leaveSentRef.current = true;
      sendPageLeaveBeacon(vehicleId, durationSeconds);
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
  }, [vehicleId]);

  useEffect(() => {
    if (sectionIds.length === 0) return;

    const observedSections = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const sectionId = entry.target.id;
          if (!sectionId || observedSections.has(sectionId)) continue;

          observedSections.add(sectionId);
          trackSectionViewOnce(vehicleId, sectionId);

          if (sectionId === 'overview') {
            trackHeroPhotoViewOnce(vehicleId);
          }
        }
      },
      { root: null, rootMargin: '0px 0px -20% 0px', threshold: 0.15 }
    );

    for (const sectionId of sectionIds) {
      const el = document.getElementById(sectionId);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [vehicleId, sectionIds]);

  return null;
}
