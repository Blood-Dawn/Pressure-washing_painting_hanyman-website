"use client";
// =============================================================================
// components/SiteNav.tsx
//
// Public-facing top navigation bar. Rendered on the homepage.
// Includes:
//   - Business name / logo placeholder (left)
//   - Page anchor links: Services, How It Works, Reviews (center/left)
//   - Social media icons: TikTok, Facebook, Instagram (right)
//   - "Book Now" CTA button (right)
//
// SOCIAL LINKS:
//   Replace the "#" placeholders below with Marc's real profile URLs when ready.
//   Search for "SOCIAL_LINKS" to find them quickly.
//
// LOGO:
//   When Marc sends his logo, replace the business name text inside
//   the <a href="/"> block with an <img> tag pointing to the logo file.
// =============================================================================

import Link from "next/link";

// ─── Update these when Marc provides the real profile URLs ───────────────────
const SOCIAL_LINKS = {
  tiktok:    "#",   // e.g. "https://www.tiktok.com/@marcsbusiness"
  facebook:  "#",   // e.g. "https://www.facebook.com/marcsbusiness"
  instagram: "#",   // e.g. "https://www.instagram.com/marcsbusiness"
};


export default function SiteNav() {
  return (
    <header className="sticky top-0 z-50 bg-brand-dark shadow-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

        {/* ── Logo / Brand name ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0">
          {/*
            LOGO PLACEHOLDER:
            When Marc sends the logo file, save it to /public/logo.png and
            replace the div below with:
              <img src="/logo.png" alt="Business logo" className="h-9 w-auto" />
          */}
          <div className="w-9 h-9 bg-brand-green rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <span className="font-display font-bold text-white text-lg leading-tight">
            {/* Replace this text with Marc&apos;s business name once decided */}
            Marc&apos;s Pro Services
          </span>
        </Link>

        {/* ── Page links (hidden on small screens) ── */}
        <nav className="hidden md:flex items-center gap-6">
          <a href="#services" className="text-sm text-gray-300 hover:text-white transition-colors">Services</a>
          <a href="#how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">How It Works</a>
          <a href="#reviews" className="text-sm text-gray-300 hover:text-white transition-colors">Reviews</a>
        </nav>

        {/* ── Right side: social icons + CTA ── */}
        <div className="flex items-center gap-4 shrink-0">

          {/* Social icons */}
          <div className="flex items-center gap-3">

            {/* TikTok */}
            <a
              href={SOCIAL_LINKS.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="text-gray-400 hover:text-white transition-colors"
            >
              {/* TikTok logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
              </svg>
            </a>

            {/* Facebook */}
            <a
              href={SOCIAL_LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>

            {/* Instagram */}
            <a
              href={SOCIAL_LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          </div>

          {/* Quote CTA */}
          <Link
            href="/quote"
            className="hidden sm:inline-flex items-center border border-white/30 text-white/80 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Free Quote
          </Link>

          {/* Book Now CTA */}
          <Link
            href="/booking"
            className="hidden sm:inline-flex items-center bg-brand-green hover:bg-brand-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Book Now
          </Link>
        </div>

      </div>
    </header>
  );
}
