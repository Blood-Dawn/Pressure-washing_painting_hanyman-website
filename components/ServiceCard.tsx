// =============================================================================
// components/ServiceCard.tsx
//
// Displays a single service on the landing page and services page.
// This is a SERVER component (no "use client") because it receives its data
// as a prop and does not need any interactivity or browser APIs.
//
// WHO IMPORTS THIS FILE:
//   app/page.tsx                  -- renders a row of service cards
//
// THIS FILE IMPORTS:
//   next/link                     -- Link (client-side navigation)
//   types/index.ts                -- Service
// =============================================================================

import Link from "next/link";
import type { Service } from "@/types";


interface ServiceCardProps {
  service: Service;
}

export default function ServiceCard({ service }: ServiceCardProps) {
  // Build the price display string from the available data.
  // If price_label is set, use it directly (e.g. "Call for quote").
  // If price_min and price_max are set, show the range.
  // If neither, show nothing.
  const priceDisplay = service.price_label
    ? service.price_label
    : service.price_min && service.price_max
    ? `$${service.price_min} to $${service.price_max}`
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      {/* Service image (if available) */}
      {service.image_url && (
        <div className="h-48 overflow-hidden">
          {/* Using a plain img tag here instead of next/image because the
              image URL may come from various sources during development.
              In production, switch to <Image> with remotePatterns configured. */}
          <img
            src={service.image_url}
            alt={service.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-display font-semibold text-brand-dark mb-2">
          {service.name}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed flex-1">
          {service.description}
        </p>

        {/* Price and duration */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          {priceDisplay && (
            <span className="text-brand-green font-semibold">{priceDisplay}</span>
          )}
          {service.estimated_duration && (
            <span className="text-gray-400">{service.estimated_duration}</span>
          )}
        </div>

        {/* CTA */}
        <Link
          href={`/booking?service=${service.slug}`}
          className="mt-4 block text-center bg-brand-green hover:bg-brand-dark text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
        >
          Book This Service
        </Link>
      </div>
    </div>
  );
}
