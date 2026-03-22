// =============================================================================
// app/page.tsx  -  Route: /
//
// Public landing page. Server component: fetches data (services, testimonials,
// gallery) directly from the database on the server for fast, SEO-friendly HTML.
// =============================================================================

import Link from "next/link";
import { getServices, getApprovedTestimonials, getGalleryItems } from "@/lib/db";
import SiteNav from "@/components/SiteNav";


export default async function LandingPage() {
  const [services, testimonials, gallery] = await Promise.all([
    getServices(),
    getApprovedTestimonials(),
    getGalleryItems(),
  ]);

  return (
    <>
      {/* Sticky top nav with social icons */}
      <SiteNav />

      <main>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="bg-brand-dark text-white py-24 px-6 text-center">
          <p className="text-brand-green text-sm font-semibold uppercase tracking-widest mb-4">
            Serving Palm Beach County
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Pressure Washing &amp;<br />Painting Professionals
          </h1>
          <p className="text-brand-light text-xl max-w-2xl mx-auto mb-10">
            We make your property look brand new. From driveways and walkways
            to full exterior paint jobs - we handle the job from start to finish.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/booking"
              className="inline-block bg-brand-green hover:bg-brand-dark text-white font-bold px-10 py-4 rounded-2xl text-lg transition-colors"
            >
              Book an Appointment
            </Link>
            <Link
              href="/quote"
              className="inline-block bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-colors"
            >
              Get a Free Quote
            </Link>
          </div>
        </section>


        {/* ── SERVICES ─────────────────────────────────────────────────────── */}
        <section className="py-20 px-6 max-w-6xl mx-auto" id="services">
          <h2 className="font-display text-4xl font-bold text-brand-dark text-center mb-4">
            What We Do
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-lg mx-auto">
            Our core expertise is pressure washing and painting. Every paint job includes
            a full pressure wash first - because prep is everything.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Pressure Washing */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl mb-4">💧</div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-2">Pressure Washing</h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                Driveways, walkways, patios, siding, and more. We blast away years of
                dirt, oil, and stains. Standard 2-car driveway starts at <strong>$150</strong>.
              </p>
              <ul className="text-sm text-gray-500 space-y-1 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Standard driveway (2-car) - $150</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Extended driveway - $200</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Walkways - +$50 add-on</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">→</span> Large / custom - free on-site quote</li>
              </ul>
              <Link href="/booking"
                className="inline-block bg-brand-dark hover:bg-brand-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Book Now
              </Link>
            </div>

            {/* Pressure Wash + Painting */}
            <div className="bg-brand-dark text-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-brand-green text-white text-xs font-bold px-3 py-1 rounded-full">
                Most Popular
              </div>
              <div className="w-12 h-12 bg-brand-green/20 rounded-xl flex items-center justify-center text-2xl mb-4">🎨</div>
              <h3 className="font-display text-xl font-bold text-white mb-2">Pressure Wash + Painting</h3>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                The complete package. We pressure wash first to remove all dirt and
                peeling, then apply a professional paint coat that lasts.
              </p>
              <ul className="text-sm text-gray-400 space-y-1 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Full surface prep included</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Exterior walls, fences, decks</li>
                <li className="flex items-center gap-2"><span className="text-green-400">✓</span> Free on-site quote</li>
              </ul>
              <Link href="/quote"
                className="inline-block bg-brand-green hover:bg-brand-dark text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Get a Free Quote
              </Link>
            </div>

            {/* Roof Washing */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl mb-4">🏠</div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-2">Roof Washing</h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                Soft-wash treatment to safely remove black streaks, algae, and moss
                without damaging shingles or tiles. Pricing based on roof size and pitch.
              </p>
              <ul className="text-sm text-gray-500 space-y-1 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Safe for all roof types</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Extends roof lifespan</li>
                <li className="flex items-center gap-2"><span className="text-blue-500">→</span> Free on-site quote</li>
              </ul>
              <Link href="/quote"
                className="inline-block bg-brand-dark hover:bg-brand-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Get a Free Quote
              </Link>
            </div>

            {/* Handyman */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl mb-4">🔧</div>
              <h3 className="font-display text-xl font-bold text-brand-dark mb-2">Handyman</h3>
              <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                General repairs and odd jobs. If it needs fixing, we can handle it.
                Minimum rate is <strong>$100 / hr</strong> - free quote provided before any work begins.
              </p>
              <ul className="text-sm text-gray-500 space-y-1 mb-6">
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> No job too small</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Free quote before work starts</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✓</span> $100 / hr minimum</li>
              </ul>
              <Link href="/quote"
                className="inline-block bg-brand-dark hover:bg-brand-green text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
                Request a Quote
              </Link>
            </div>
          </div>

          {/* DB-driven ServiceCard fallback (shows if admin adds services via dashboard) */}
          {services.length > 0 && (
            <p className="text-xs text-center text-gray-300 mt-8">
              {/* Dynamic services from database loaded: {services.length} */}
            </p>
          )}
        </section>


        {/* ── FREE QUOTE CALLOUT ────────────────────────────────────────────── */}
        <section className="py-16 px-6 bg-gray-100 border-y border-gray-200">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-brand-dark mb-2">
                Not sure what it will cost?
              </h2>
              <p className="text-gray-600 max-w-md">
                For large driveways, roofs, and painting jobs we come out and give you
                an exact price before any work starts. No pressure, no commitment.
              </p>
            </div>
            <Link
              href="/quote"
              className="shrink-0 bg-brand-green hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-2xl text-lg transition-colors whitespace-nowrap"
            >
              Get a Free Quote
            </Link>
          </div>
        </section>


        {/* ── GALLERY ──────────────────────────────────────────────────────── */}
        {gallery.length > 0 && (
          <section className="py-20 px-6 bg-white" id="gallery">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-display text-4xl font-bold text-brand-dark text-center mb-4">
                Our Work
              </h2>
              <p className="text-center text-gray-500 mb-12">Before &amp; after - the results speak for themselves.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {gallery.slice(0, 6).map((item) => (
                  <div key={item.id} className="space-y-2">
                    {item.label && (
                      <p className="text-sm font-medium text-gray-500 capitalize">
                        {item.service_type?.replace(/-/g, " ")} {item.label && `- ${item.label}`}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-1 rounded-xl overflow-hidden">
                      {item.before_url && (
                        <div className="relative">
                          <img src={item.before_url} alt="Before" className="w-full h-40 object-cover" />
                          <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded">Before</span>
                        </div>
                      )}
                      {item.after_url && (
                        <div className="relative">
                          <img src={item.after_url} alt="After" className="w-full h-40 object-cover" />
                          <span className="absolute bottom-1 left-1 text-xs bg-brand-green/90 text-white px-2 py-0.5 rounded">After</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}


        {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
        <section className="py-20 px-6 max-w-4xl mx-auto text-center" id="how-it-works">
          <h2 className="font-display text-4xl font-bold text-brand-dark mb-4">How It Works</h2>
          <p className="text-gray-500 mb-12">Three easy steps from booking to a spotless property.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step: "1",
                title: "Book or Request a Quote",
                desc: "Fill out our short form. Known pricing jobs book instantly. Large jobs get a free on-site quote first.",
              },
              {
                step: "2",
                title: "We Confirm",
                desc: "You will get a confirmation email within 24 hours with your appointment details and technician info.",
              },
              {
                step: "3",
                title: "Track Us Live",
                desc: "On the day of your job, track our arrival in real time using the link in your email.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-brand-green text-white font-bold text-xl flex items-center justify-center">
                  {step}
                </div>
                <h3 className="text-xl font-semibold text-brand-dark">{title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>


        {/* ── SOCIAL PROOF / REVIEWS ────────────────────────────────────────── */}
        <section className="py-20 px-6 bg-white" id="reviews">
          <div className="max-w-6xl mx-auto">
            <h2 className="font-display text-4xl font-bold text-brand-dark text-center mb-4">
              What Customers Say
            </h2>
            {/* Nextdoor badge placeholder */}
            <div className="flex justify-center mb-10">
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-800 text-sm font-semibold px-4 py-2 rounded-full hover:bg-green-100 transition-colors"
              >
                {/* Nextdoor icon placeholder */}
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
                </svg>
                See our reviews on Nextdoor
              </a>
            </div>

            {testimonials.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {testimonials.map((t) => (
                  <div key={t.id} className="bg-brand-cream rounded-2xl p-6 space-y-3">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <span key={i} className="text-yellow-400 text-lg">&#9733;</span>
                      ))}
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed">&ldquo;{t.review_text}&rdquo;</p>
                    <div>
                      <p className="font-semibold text-brand-dark text-sm">{t.customer_name}</p>
                      {t.service_type && (
                        <p className="text-gray-400 text-xs capitalize">
                          {t.service_type.replace(/-/g, " ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-400 text-sm">Reviews coming soon - check us out on Nextdoor.</p>
            )}
          </div>
        </section>


        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <section className="bg-brand-dark text-white py-20 px-6 text-center">
          <h2 className="font-display text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-brand-light mb-8 max-w-md mx-auto">
            Book online in minutes or request a free quote - no commitment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/booking"
              className="inline-block bg-brand-green hover:bg-brand-dark text-white font-bold px-10 py-4 rounded-2xl text-lg transition-colors"
            >
              Book Now
            </Link>
            <Link
              href="/quote"
              className="inline-block bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-10 py-4 rounded-2xl text-lg transition-colors"
            >
              Get a Free Quote
            </Link>
          </div>
        </section>


        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer className="bg-black py-6 px-6">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              &copy; {new Date().getFullYear()}{" "}Marc&apos;s Pro Services. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/admin/login" className="text-gray-700 hover:text-gray-400 text-xs transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
