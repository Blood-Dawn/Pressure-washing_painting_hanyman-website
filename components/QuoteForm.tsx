"use client";
// =============================================================================
// components/QuoteForm.tsx
//
// Free quote request form. No payment, no deposit.
// Marc visits the customer, assesses the job, and gives them a price.
// If they like the price they book. If not, no charge.
//
// WHAT THIS FORM COLLECTS:
//   Contact info (name, email, phone)
//   Service they need
//   Property address + zip
//   Description of the job
//   Preferred date/time for the free site visit
//
// ON SUBMIT:
//   Posts to POST /api/bookings with is_quote: true embedded in the description.
//   Redirects to the tracking page so the customer can see their request status.
//
// WHO IMPORTS THIS FILE:
//   app/quote/page.tsx
// =============================================================================

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

interface QuoteFields {
  customer_name:    string;
  customer_email:   string;
  customer_phone:   string;
  customer_address: string;
  customer_zip:     string;
  service_type:     string;
  description:      string;
  preferred_date:   string;
  preferred_time:   string;
}

type QuoteErrors = Partial<Record<keyof QuoteFields, string>>;

const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
];

const SERVICES = [
  { value: "pressure-washing",          label: "Pressure Washing",           icon: "💧", note: "Large / custom driveways, roofs, patios" },
  { value: "pressure-washing-painting", label: "Pressure Wash + Painting",   icon: "🎨", note: "Full exterior prep and paint" },
  { value: "roof-washing",              label: "Roof Washing",                icon: "🏠", note: "Soft-wash treatment for any roof type" },
  { value: "handyman",                  label: "Handyman",                    icon: "🔧", note: "General repairs and odd jobs" },
];


export default function QuoteForm() {
  const router = useRouter();

  const [form, setForm] = useState<QuoteFields>({
    customer_name:    "",
    customer_email:   "",
    customer_phone:   "",
    customer_address: "",
    customer_zip:     "",
    service_type:     "",
    description:      "",
    preferred_date:   "",
    preferred_time:   "",
  });

  const [errors, setErrors]           = useState<QuoteErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate(): boolean {
    const errs: QuoteErrors = {};
    if (!form.customer_name.trim())    errs.customer_name    = "Name is required.";
    if (!form.customer_email.trim())   errs.customer_email   = "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
                                       errs.customer_email   = "Enter a valid email address.";
    if (!form.customer_phone.trim())   errs.customer_phone   = "Phone number is required.";
    if (form.customer_phone.replace(/\D/g, "").length !== 10)
                                       errs.customer_phone   = "Phone must be 10 digits.";
    if (!form.customer_address.trim()) errs.customer_address = "Service address is required.";
    if (!form.customer_zip.trim())     errs.customer_zip     = "Zip code is required.";
    if (!/^\d{5}$/.test(form.customer_zip))
                                       errs.customer_zip     = "Zip code must be 5 digits.";
    if (!form.service_type)            errs.service_type     = "Please select a service.";
    if (!form.preferred_date)          errs.preferred_date   = "Please choose a preferred visit date.";
    if (!form.preferred_time)          errs.preferred_time   = "Please choose a preferred time.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      // Build a structured description so the admin immediately knows it is a quote
      const descParts = ["[FREE QUOTE REQUEST]"];
      if (form.description.trim()) descParts.push(form.description.trim());

      const response = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name:    form.customer_name.trim(),
          customer_email:   form.customer_email.trim().toLowerCase(),
          customer_phone:   form.customer_phone.replace(/\D/g, ""),
          customer_address: form.customer_address.trim(),
          customer_zip:     form.customer_zip.trim(),
          service_type:     form.service_type,
          preferred_date:   form.preferred_date,
          preferred_time:   form.preferred_time,
          description:      descParts.join(" | "),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        setServerError(json.error ?? "Something went wrong. Please try again.");
        return;
      }

      const { id, trackingToken } = json.data;
      router.push(`/track/${id}?token=${trackingToken}`);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const err = (f: keyof QuoteFields) => errors[f];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-md max-w-2xl mx-auto">

      <div>
        <h2 className="text-2xl font-display font-bold text-brand-dark">Tell Us About the Job</h2>
        <p className="text-gray-500 text-sm mt-1">
          We will reach out within 24 hours to schedule a free visit. No payment required.
        </p>
      </div>

      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {serverError}
        </div>
      )}

      {/* ── Service selection (card style) ── */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-3">What service do you need?</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SERVICES.map((s) => (
            <label
              key={s.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                form.service_type === s.value
                  ? "border-brand-green bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="service_type"
                value={s.value}
                checked={form.service_type === s.value}
                onChange={handleChange}
                className="sr-only"
              />
              <span className="text-2xl mt-0.5">{s.icon}</span>
              <div>
                <p className={`text-sm font-semibold ${form.service_type === s.value ? "text-brand-green" : "text-gray-800"}`}>
                  {s.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>
              </div>
            </label>
          ))}
        </div>
        {err("service_type") && <p className="text-red-500 text-xs mt-2">{err("service_type")}</p>}
      </div>

      {/* ── Name ── */}
      <div>
        <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input id="customer_name" name="customer_name" type="text"
          value={form.customer_name} onChange={handleChange} placeholder="John Smith"
          className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_name") ? "border-red-400" : "border-gray-300"}`}
        />
        {err("customer_name") && <p className="text-red-500 text-xs mt-1">{err("customer_name")}</p>}
      </div>

      {/* ── Email + Phone side by side ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <input id="customer_email" name="customer_email" type="email"
            value={form.customer_email} onChange={handleChange} placeholder="john@email.com"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_email") ? "border-red-400" : "border-gray-300"}`}
          />
          {err("customer_email") && <p className="text-red-500 text-xs mt-1">{err("customer_email")}</p>}
        </div>
        <div>
          <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
          <input id="customer_phone" name="customer_phone" type="tel"
            value={form.customer_phone} onChange={handleChange} placeholder="(561) 555-1234"
            className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_phone") ? "border-red-400" : "border-gray-300"}`}
          />
          {err("customer_phone") && <p className="text-red-500 text-xs mt-1">{err("customer_phone")}</p>}
        </div>
      </div>

      {/* ── Address ── */}
      <div>
        <label htmlFor="customer_address" className="block text-sm font-medium text-gray-700 mb-1">Property Address</label>
        <input id="customer_address" name="customer_address" type="text"
          value={form.customer_address} onChange={handleChange} placeholder="123 Main St, Palm Beach Gardens"
          className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_address") ? "border-red-400" : "border-gray-300"}`}
        />
        {err("customer_address") && <p className="text-red-500 text-xs mt-1">{err("customer_address")}</p>}
      </div>

      {/* ── Zip ── */}
      <div>
        <label htmlFor="customer_zip" className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
        <input id="customer_zip" name="customer_zip" type="text"
          value={form.customer_zip} onChange={handleChange} placeholder="33410" maxLength={5}
          className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_zip") ? "border-red-400" : "border-gray-300"}`}
        />
        {err("customer_zip") && <p className="text-red-500 text-xs mt-1">{err("customer_zip")}</p>}
      </div>

      {/* ── Job description ── */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Describe the Job <span className="text-gray-400">(optional but helpful)</span>
        </label>
        <textarea id="description" name="description"
          value={form.description} onChange={handleChange} rows={4}
          placeholder="E.g. large circular driveway, two-story house, roof has black streaks on the north side, etc. The more detail you give us the faster we can quote you."
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
        />
      </div>

      {/* ── Preferred visit date + time ── */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-3">When can we come take a look?</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="preferred_date" className="block text-xs text-gray-500 mb-1">Preferred Date</label>
            <input id="preferred_date" name="preferred_date" type="date"
              value={form.preferred_date} min={today} onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("preferred_date") ? "border-red-400" : "border-gray-300"}`}
            />
            {err("preferred_date") && <p className="text-red-500 text-xs mt-1">{err("preferred_date")}</p>}
          </div>
          <div>
            <label htmlFor="preferred_time" className="block text-xs text-gray-500 mb-1">Preferred Time</label>
            <select id="preferred_time" name="preferred_time"
              value={form.preferred_time} onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green ${err("preferred_time") ? "border-red-400" : "border-gray-300"}`}
            >
              <option value="">Select a time</option>
              {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {err("preferred_time") && <p className="text-red-500 text-xs mt-1">{err("preferred_time")}</p>}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          We will confirm the exact time when we call you. The visit is completely free with no obligation.
        </p>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-brand-green hover:bg-brand-dark text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Sending your request...
          </>
        ) : (
          "Request My Free Quote"
        )}
      </button>

      <p className="text-center text-xs text-gray-400">
        No payment. No commitment. We come to you, give you a price, and you decide.
      </p>
    </form>
  );
}
