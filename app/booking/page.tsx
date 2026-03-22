// =============================================================================
// app/booking/page.tsx
//
// Route: /booking
//
// The public booking page. Renders the BookingForm component inside a page layout.
// This page itself is a server component; the BookingForm inside it is a client
// component (it has "use client" at the top of its file).
//
// WHY IS THE PAGE A SERVER COMPONENT IF THE FORM IS A CLIENT COMPONENT?
//   In Next.js, a server component CAN render a client component as a child.
//   The server component (this file) handles page metadata and layout.
//   The client component (BookingForm.tsx) handles state and form submission.
//   This pattern is called "composition" and is recommended by Next.js docs.
//
// THIS FILE IMPORTS:
//   next (Metadata type)           -- for SEO
//   components/BookingForm.tsx     -- the actual form
// =============================================================================

import type { Metadata } from "next";
import Link from "next/link";
import BookingForm from "@/components/BookingForm";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Request a handyman, landscaping, power washing, or painting appointment online.",
};

export default function BookingPage() {
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

        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-brand-dark mb-3">
            Request an Appointment
          </h1>
          <p className="text-gray-500">
            Fill out the form below and we will confirm your appointment within 24 hours.
          </p>
        </div>

        {/* BookingForm handles all form state, validation, and submission */}
        <BookingForm />
      </div>
    </main>
  );
}
