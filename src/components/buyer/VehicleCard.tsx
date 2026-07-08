import { useEffect, useRef } from 'react';
import type { InventoryVehicle } from '../../types/inventory-vehicle';
import { trackImpressionOnce } from '../../lib/listing-analytics-client';
import { mileageFormatter, priceFormatter } from '../../utils/formatters';
import { getVehicleListingPath } from '../../utils/url-helpers';

interface VehicleCardProps {
  vehicle: InventoryVehicle;
  rank?: number;
  position?: number;
}

export default function VehicleCard({ vehicle, rank, position }: VehicleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const highlights = vehicle.highlights.slice(0, 3);

  useEffect(() => {
    const element = cardRef.current;
    if (!element) return;

    let visibilityTimer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (visibilityTimer) return;
            visibilityTimer = setTimeout(() => {
              trackImpressionOnce(vehicle.id, { rank, position });
            }, 1000);
          } else if (visibilityTimer) {
            clearTimeout(visibilityTimer);
            visibilityTimer = null;
          }
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (visibilityTimer) clearTimeout(visibilityTimer);
    };
  }, [vehicle.id, rank, position]);

  return (
    <div ref={cardRef}>
      <a
        href={getVehicleListingPath(vehicle)}
        className="block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg"
      >
        {vehicle.heroImage ? (
          <img
            src={vehicle.heroImage}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="aspect-video w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
            No photo
          </div>
        )}

        <div className="space-y-3 p-4">
          <h2 className="text-xl font-bold text-slate-900">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h2>

          <p className="text-xl font-bold text-slate-900">{priceFormatter.format(vehicle.price)}</p>

          <p className="text-sm text-slate-500">
            {mileageFormatter.format(vehicle.mileage)} mi · {vehicle.engine} · {vehicle.drivetrain}
          </p>

          {highlights.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {highlights.map((highlight, index) => (
                <li
                  key={`${highlight}-${index}`}
                  className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          )}
        </div>
      </a>
    </div>
  );
}
