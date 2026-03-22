"use client";

import { useState, useEffect, useRef } from "react";
import type { Booking, BookingStatus } from "@/types";

interface AdminBookingCardProps {
  booking:  Booking;
  onUpdate: (updated: Booking) => void;
}

const STATUS_LABELS: Record<BookingStatus, string> = {
  "pending":     "Pending",
  "confirmed":   "Confirmed",
  "in-progress": "In Progress",
  "en-route":    "On the Way",
  "arrived":     "Arrived",
  "completed":   "Completed",
  "declined":    "Declined",
};

const STATUS_COLORS: Record<BookingStatus, string> = {
  "pending":     "bg-yellow-100 text-yellow-800",
  "confirmed":   "bg-blue-100 text-blue-800",
  "in-progress": "bg-orange-100 text-orange-800",
  "en-route":    "bg-purple-100 text-purple-800",
  "arrived":     "bg-indigo-100 text-indigo-800",
  "completed":   "bg-green-100 text-green-800",
  "declined":    "bg-red-100 text-red-800",
};

export default function AdminBookingCard({ booking, onUpdate }: AdminBookingCardProps) {
  const [isUpdating, setIsUpdating]         = useState(false);
  const [notes, setNotes]                   = useState(booking.notes ?? "");
  const [eta, setEta]                       = useState(booking.eta ?? "");
  const [showNotes, setShowNotes]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string>("");
  const watchIdRef                          = useRef<number | null>(null);
  const sendIntervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoordsRef                       = useRef<{ lat: number; lng: number } | null>(null);

  // Clean up geolocation watcher on unmount
  useEffect(() => {
    return () => {
      stopLocationSharing();
    };
  }, []);

  // ── API call helper ──────────────────────────────────────────────────────────
  async function updateStatus(payload: Record<string, unknown>) {
    setIsUpdating(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${booking.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) {
        setError(json.error ?? "Update failed");
        return;
      }
      onUpdate(json.data as Booking);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  }

  // ── Location sharing ─────────────────────────────────────────────────────────
  async function sendLocation(lat: number, lng: number) {
    lastCoordsRef.current = { lat, lng };
    try {
      await fetch(`/api/bookings/${booking.id}/location`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ lat, lng }),
      });
      const now = new Date().toLocaleTimeString();
      setLocationStatus(`Location updated at ${now}`);
    } catch {
      setLocationStatus("Failed to send location");
    }
  }

  function startLocationSharing() {
    if (!navigator.geolocation) {
      setError("Your device does not support GPS location sharing.");
      return;
    }

    setIsSharingLocation(true);
    setLocationStatus("Getting your location...");

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        sendLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocationStatus(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
    );

    // Also send every 30 seconds even if position hasn't changed much
    sendIntervalRef.current = setInterval(() => {
      if (lastCoordsRef.current) {
        sendLocation(lastCoordsRef.current.lat, lastCoordsRef.current.lng);
      }
    }, 30000);
  }

  function stopLocationSharing() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sendIntervalRef.current !== null) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    setIsSharingLocation(false);
    setLocationStatus("");
  }

  // ── Button handlers ──────────────────────────────────────────────────────────
  const handleConfirm    = () => updateStatus({ status: "confirmed" });
  const handleDecline    = () => updateStatus({ status: "declined", notes });
  const handleEnRoute    = () => updateStatus({ status: "en-route", eta });
  const handleUpdateEta  = () => updateStatus({ eta }); // sends email without status change
  const handleArrived    = () => {
    stopLocationSharing();
    updateStatus({ status: "arrived" });
  };
  const handleComplete   = () => updateStatus({ status: "completed" });
  const handleSaveNotes  = () => updateStatus({ notes });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg">{booking.customer_name}</h3>
          <p className="text-sm text-gray-500 capitalize">{booking.service_type.replace("-", " ")}</p>
        </div>
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_COLORS[booking.status]}`}>
          {STATUS_LABELS[booking.status]}
        </span>
      </div>

      {/* Booking details */}
      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
        <div><span className="font-medium">Date:</span> {booking.preferred_date}</div>
        <div><span className="font-medium">Time:</span> {booking.preferred_time}</div>
        <div className="col-span-2">
          <span className="font-medium">Address:</span> {booking.customer_address}
        </div>
        <div><span className="font-medium">Phone:</span> {booking.customer_phone}</div>
        <div><span className="font-medium">Email:</span> {booking.customer_email}</div>
        {booking.description && (
          <div className="col-span-2 bg-gray-50 rounded-lg p-3 text-gray-700 text-xs">
            {booking.description}
          </div>
        )}
        {booking.eta && (
          <div className="col-span-2 text-purple-700 text-xs font-medium">
            Current ETA: {booking.eta}
          </div>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">

        {/* PENDING */}
        {booking.status === "pending" && (
          <>
            <button onClick={handleConfirm} disabled={isUpdating}
              className="flex-1 bg-brand-green hover:bg-brand-dark text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              Confirm
            </button>
            <button onClick={handleDecline} disabled={isUpdating}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              Decline
            </button>
          </>
        )}

        {/* CONFIRMED: set ETA and go en-route */}
        {booking.status === "confirmed" && (
          <div className="flex-1 space-y-2">
            <input type="text" value={eta} onChange={(e) => setEta(e.target.value)}
              placeholder="ETA (e.g. 20 minutes)"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <button onClick={handleEnRoute} disabled={isUpdating || !eta}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              I am On My Way
            </button>
          </div>
        )}

        {/* EN-ROUTE: update ETA repeatedly + location sharing + arrived */}
        {booking.status === "en-route" && (
          <div className="flex-1 space-y-3">

            {/* ETA updater - can send multiple times */}
            <div className="space-y-2">
              <input type="text" value={eta} onChange={(e) => setEta(e.target.value)}
                placeholder="Update ETA (e.g. 10 minutes)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <button onClick={handleUpdateEta} disabled={isUpdating || !eta}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                Send ETA Update
              </button>
              <p className="text-xs text-gray-400">
                Customer gets an email with your updated ETA. You can send this as many times as you want.
              </p>
            </div>

            {/* Live location sharing */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600">Live Location Sharing</p>
              {!isSharingLocation ? (
                <button onClick={startLocationSharing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Share My Location with Customer
                </button>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-xs text-green-700 font-medium">Location sharing active</p>
                  </div>
                  {locationStatus && <p className="text-xs text-gray-500">{locationStatus}</p>}
                  <button onClick={stopLocationSharing}
                    className="text-xs text-red-500 hover:underline">
                    Stop sharing location
                  </button>
                </div>
              )}
            </div>

            {/* I've Arrived */}
            <button onClick={handleArrived} disabled={isUpdating}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
              I Arrived
            </button>
          </div>
        )}

        {/* ARRIVED or IN-PROGRESS: complete */}
        {(booking.status === "arrived" || booking.status === "in-progress") && (
          <button onClick={handleComplete} disabled={isUpdating}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
            Mark as Complete
          </button>
        )}

        {/* Notes toggle */}
        <button onClick={() => setShowNotes(!showNotes)}
          className="text-sm text-gray-500 hover:text-gray-700 underline">
          {showNotes ? "Hide Notes" : "Add Notes"}
        </button>
      </div>

      {/* Notes section */}
      {showNotes && (
        <div className="space-y-2">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={3} placeholder="Internal notes (not visible to customer)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          <button onClick={handleSaveNotes} disabled={isUpdating}
            className="text-sm text-brand-green hover:underline disabled:opacity-50">
            Save Notes
          </button>
        </div>
      )}
    </div>
  );
}
