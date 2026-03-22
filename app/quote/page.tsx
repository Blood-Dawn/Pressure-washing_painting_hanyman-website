import type { Metadata } from "next";
import Link from "next/link";
import QuoteForm from "@/components/QuoteForm";

export const metadata: Metadata = {
  title: "Get a Free Quote",
  description: "Request a free on-site quote for pressure washing, painting, roof washing, or handyman work. No payment, no obligation.",
};

export default function QuotePage() {
  return (
    <main className="min-h-screen bg-brand-cream py-16 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Back to home */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-dark transition-colors mb-8"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-green/10 text-brand-green text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
            Free - No obligation
          </div>
          <h1 className="font-display text-4xl font-bold text-brand-dark mb-3">
            Get a Free Quote
          </h1>
          <p className="text-gray-500 max-w-md mx-auto">
            For jobs that need an on-site assessment, we come to you, measure the work, and give you an exact price.
            If you like it, we book. If not, no charge.
          </p>
        </div>

        {/* How the quote visit works */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { icon: "📋", title: "Submit", desc: "Fill out the form below" },
            { icon: "📞", title: "We Call You", desc: "Within 24 hours to confirm" },
            { icon: "📐", title: "Free Visit", desc: "We assess and price the job" },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
              <div className="text-2xl mb-2">{icon}</div>
              <p className="text-sm font-semibold text-brand-dark">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
          ))}
        </div>

        {/* Divider linking to direct booking */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gray-200" />
          <p className="text-xs text-gray-400 whitespace-nowrap">
            Know the price already?{" "}
            <Link href="/booking" className="text-brand-green font-semibold hover:underline">
              Book directly instead
            </Link>
          </p>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <QuoteForm />
      </div>
    </main>
  );
}
