"use client";
// =============================================================================
// components/TrackingWidget.tsx
//
// Displays the real-time status of a booking for a customer.
// Polls the database every 30 seconds so customers see status changes
// without needing to refresh the page manually.
//
// WHAT THIS COMPONENT DOES:
//   Shows a visual progress tracker (pending > confirmed > en-route > done).
//   Displays the ETA countdown when the technician is on the way.
//   Polls GET /api/bookings/[id] every 30 seconds for live updates.
//   Stops polling once the job is completed or declined.
//
// WHO IMPORTS THIS FILE:
//   app/track/[id]/page.tsx       -- rendered with the booking as the initial prop
//
// THIS FILE IMPORTS:
//   react                         -- useState, useEffect
//   types/index.ts                -- Booking, BookingStatus
// =============================================================================

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Booking, BookingStatus } from "@/types";

// Leaflet uses browser-only APIs so we can never render it on the server.
// next/dynamic with ssr:false makes Next.js skip it during server rendering
// and only load it in the browser after hydration.
const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr:     false,
  loading: () => (
    <div className="h-[220px] w-full rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-xs text-gray-400">Loading map...</span>
    </div>
  ),
});


interface TrackingWidgetProps {
  initialBooking: Booking;  // Server-rendered initial data (no loading flash)
  token:          string;   // Security token from the URL query param
}

// The ordered list of statuses a booking passes through.
// This drives the step-by-step progress bar at the top.
const STATUS_STEPS: BookingStatus[] = [
  "pending", "confirmed", "en-route", "arrived", "completed",
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  "pending":     "Request Received",
  "confirmed":   "Appointment Confirmed",
  "in-progress": "Work In Progress",
  "en-route":    "Technician On the Way",
  "arrived":     "Technician Arrived",
  "completed":   "Job Complete",
  "declined":    "Unable to Service",
};

// Statuses where polling should stop (terminal states)
const TERMINAL_STATUSES: BookingStatus[] = ["completed", "declined"];


export default function TrackingWidget({ initialBooking, token }: TrackingWidgetProps) {
  const [booking, setBooking] = useState<Booking>(initialBooking);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());


  // ── Polling ────────────────────────────────────────────────────────────────
  /**
   * useEffect for polling
   * Runs when the component mounts. Sets up an interval that fetches the
   * latest booking data every 30 seconds.
   *
   * The cleanup function (return () => clearInterval) runs when the component
   * unmounts or when the booking reaches a terminal status, stopping the interval
   * so we do not keep making network requests after the job is done.
   */
  useEffect(() => {
    // No point polling if the booking is already in a terminal state
    if (TERMINAL_STATUSES.includes(booking.status)) return;

    const interval = setInterval(async () => {
      try {
        // We fetch by the booking ID and pass the token as a query param.
        // The server validates the token before returning data.
        const res = await fetch(`/api/bookings/${booking.id}?token=${token}`);
        if (!res.ok) return;

        const json = await res.json();
        const updated = json.data as Booking;

        setBooking(updated);
        setLastUpdated(new Date());

        // Stop polling once we hit a terminal status
        if (TERMINAL_STATUSES.includes(updated.status)) {
          clearInterval(interval);
        }
      } catch {
        // Silently ignore network errors during polling
      }
    }, 30_000); // 30 seconds

    // Cleanup: clear the interval when the component unmounts
    return () => clearInterval(interval);
  }, [booking.id, booking.status, token]);


  // ── Derived values ─────────────────────────────────────────────────────────

  // Index of the current status in STATUS_STEPS (used to shade progress bar)
  const currentStepIndex = STATUS_STEPS.indexOf(
    booking.status === "in-progress" ? "en-route" : booking.status
  );

  // Whether this booking was declined (shows a different UI)
  const isDeclined = booking.status === "declined";

  // Format the date for display e.g. "Monday, June 15, 2024"
  const formattedDate = new Date(booking.preferred_date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );


  // ── Render ─────────────────────────────────────────────────────────────────
  if (isDeclined) {
    return (
      <div className="max-w-lg mx-auto p-8 bg-white rounded-2xl shadow-md text-center space-y-4">
        <div className="text-5xl">Sorry</div>
        <h2 className="text-xl font-semibold text-gray-800">We Were Unable to Schedule This Appointment</h2>
        <p className="text-gray-600">
          We could not accommodate this request. Please visit the booking page to submit a new
          request with a different date or time.
        </p>
        {booking.notes && (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{booking.notes}</p>
        )}
        <a
          href="/booking"
          className="inline-block bg-brand-green text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-dark transition-colors"
        >
          Book a New Appointment
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">

      {/* Progress bar */}
      <div className="bg-white rounded-2xl shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Appointment Status</h2>
        <ol className="relative border-l-2 border-gray-200 space-y-6 ml-3">
          {STATUS_STEPS.map((step, i) => {
            const isDone    = i < currentStepIndex;
            const isCurrent = i === currentStepIndex;
            return (
              <li key={step} className="ml-6">
                {/* Circle indicator */}
                <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-white ${
                  isDone    ? "bg-brand-green" :
                  isCurrent ? "bg-blue-500 animate-pulse" :
                  "bg-gray-200"
                }`}>
                  {isDone && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <p className={`text-sm font-medium ${
                  isCurrent ? "text-blue-600" : isDone ? "text-brand-green" : "text-gray-400"
                }`}>
                  {STATUS_LABELS[step]}
                </p>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ETA + live map banner (shown when en-route or arrived) */}
      {(booking.status === "en-route" || booking.status === "arrived") && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl overflow-hidden">

          {/* ETA text block */}
          <div className="p-5 text-center">
            {booking.status === "en-route" ? (
              <>
                <p className="text-purple-700 font-semibold text-lg">
                  Your technician is on the way
                </p>
                {booking.eta && (
                  <p className="text-purple-900 text-3xl font-bold mt-1">{booking.eta}</p>
                )}
              </>
            ) : (
              <p className="text-indigo-700 font-semibold text-lg">
                Your technician has arrived
              </p>
            )}
            {booking.technician_name && (
              <p className="text-purple-600 text-sm mt-1">Technician: {booking.technician_name}</p>
            )}
          </div>

          {/* Live map - only rendered when coordinates are available */}
          {booking.tech_lat != null && booking.tech_lng != null ? (
            <div className="px-4 pb-4 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <p className="text-xs text-purple-600 font-medium">Live location</p>
                {booking.location_updated_at && (
                  <p className="text-xs text-purple-400 ml-auto">
                    Updated {new Date(booking.location_updated_at).toLocaleTimeString()}
                  </p>
                )}
              </div>
              <LiveMap
                lat={booking.tech_lat}
                lng={booking.tech_lng}
                customerAddress={booking.customer_address}
              />
            </div>
          ) : (
            booking.status === "en-route" && (
              <p className="text-xs text-center text-purple-400 pb-4">
                Live map will appear once your technician starts sharing location.
              </p>
            )
          )}
        </div>
      )}

      {/* Completion banner */}
      {booking.status === "completed" && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center space-y-3">
          <p className="text-green-700 font-semibold text-lg">Job Complete</p>
          <p className="text-green-600 text-sm">Thank you for your business.</p>
          <a
            href={`/review?booking=${booking.id}&token=${token}`}
            className="inline-block bg-brand-green text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-dark transition-colors"
          >
            Leave a Review
          </a>
        </div>
      )}

      {/* Appointment details card */}
      <div className="bg-white rounded-2xl shadow-md p-6 space-y-3">
        <h3 className="font-semibold text-gray-800">Appointment Details</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <div className="flex justify-between">
            <span className="font-medium">Service</span>
            <span className="capitalize">{booking.service_type.replace("-", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Date</span>
            <span>{formattedDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Time</span>
            <span>{booking.preferred_time}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Address</span>
            <span className="text-right max-w-48">{booking.customer_address}</span>
          </div>
        </div>
      </div>

      {/* Last updated timestamp */}
      <p className="text-center text-xs text-gray-400">
        Last updated: {lastUpdated.toLocaleTimeString()}
        {!TERMINAL_STATUSES.includes(booking.status) && " (refreshes every 30 seconds)"}
      </p>
    </div>
  );
}
