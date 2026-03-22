// =============================================================================
// app/layout.tsx
//
// The ROOT LAYOUT. Every single page in the entire application is wrapped
// inside this component. Next.js calls it automatically; you never import it.
//
// WHAT THIS FILE DOES:
//   Sets the <html> and <body> tags for the entire site.
//   Imports global CSS (which loads Tailwind and Google Fonts).
//   Sets default metadata (page title, description) used for SEO.
//   Wraps all pages in the SessionProvider so NextAuth session data is
//   available to any client component via useSession().
//
// WHO IMPORTS THIS FILE:
//   Next.js itself (automatically wraps all pages with this layout)
//
// THIS FILE IMPORTS:
//   ./globals.css                  -- Tailwind + Google Fonts
//   next/font/google               -- Inter font (optional, alternative to CSS import)
//   next-auth/react                -- SessionProvider
// =============================================================================

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // Update the business name below once Marc decides on a name.
  title: {
    default:  "Marc's Pro Services | Pressure Washing & Painting",
    template: "%s | Marc's Pro Services",
  },
  description:
    "Professional pressure washing, roof washing, and painting services in Palm Beach County. Book online or get a free quote.",
  openGraph: {
    type:   "website",
    locale: "en_US",
    title:  "Marc's Pro Services | Pressure Washing & Painting",
    description: "Pressure washing, roof washing, and painting in Palm Beach County. Book online.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // children is whatever page is currently being rendered.
  // Wrapping it in a fragment here keeps the markup clean.
  return (
    <html lang="en">
      <body>
        {/* min-h-screen ensures the footer always stays at the bottom */}
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
