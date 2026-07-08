import { useEffect } from 'react';
import {
  trackHeroPhotoViewOnce,
  trackPageViewOnce,
  trackSectionViewOnce,
} from '../lib/listing-analytics-client';

interface ListingAnalyticsProps {
  vehicleId: string;
  sectionIds: string[];
}

export default function ListingAnalytics({ vehicleId, sectionIds }: ListingAnalyticsProps) {
  useEffect(() => {
    trackPageViewOnce(vehicleId);
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
