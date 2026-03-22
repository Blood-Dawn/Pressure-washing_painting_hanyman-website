"use client";
// =============================================================================
// components/BookingForm.tsx
//
// Multi-step booking / free-quote form.
//
// FLOW LOGIC (auto-detected, no manual toggle needed):
//   QUOTE JOBS  → Step 1 only → "Request Free Quote" → tracking page
//   BOOK JOBS   → Step 1 → Step 2 (payment) → "Pay Deposit & Book" → tracking page
//
// A job is automatically a QUOTE when:
//   • Service = Handyman               (price varies per job)
//   • Service = Roof Washing           (Marc quotes on-site)
//   • Service = Pressure Wash + Paint  (always needs a site visit)
//   • Service = Pressure Washing AND job detail = Large/Custom driveway
//
// A job can be BOOKED DIRECTLY when:
//   • Service = Pressure Washing AND job detail = Standard ($150) or Extended ($200)
//
// PRICING (Marc's rates):
//   Standard driveway (2-car):  $150
//   Extended driveway:          $200
//   Walkways add-on:            +$50
//   Large / custom driveway:    Free quote (priced by sq ft on-site)
//   Roof washing:               Free quote
//   Pressure wash + painting:   Free quote
//   Handyman:                   $100 / hr minimum, varies by job
//
// WHO IMPORTS THIS FILE:
//   app/booking/page.tsx
// =============================================================================

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookingCreateSchema } from "@/lib/validation";
import type { ServiceType } from "@/types";


// ─── Types ────────────────────────────────────────────────────────────────────

interface AppointmentFields {
  customer_name:    string;
  customer_email:   string;
  customer_phone:   string;
  customer_address: string;
  customer_zip:     string;
  service_type:     ServiceType | "";
  job_detail:       string;   // sub-selection for pressure-washing
  add_walkways:     boolean;  // +$50 add-on for pressure-washing
  preferred_date:   string;
  preferred_time:   string;
  description:      string;
}

interface PaymentFields {
  card_name:   string;
  card_number: string;
  expiry:      string;
  cvv:         string;
}

type AppointmentErrors = Partial<Record<keyof AppointmentFields, string[]>>;
type PaymentErrors     = Partial<Record<keyof PaymentFields, string>>;


// ─── Constants ───────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
];

// Deposit collected on direct bookings (standard / extended driveway)
const DEPOSIT_AMOUNT = "$50.00";

// Zip codes we primarily serve - informational only, never blocks a booking
const SERVICE_AREA_ZIPS = [
  "33410", "33411", "33412", "33413", "33414",
  "33415", "33418", "33458", "33477", "33496",
];

// Services that ALWAYS require a free on-site quote
const QUOTE_SERVICES: ServiceType[] = [
  "pressure-washing-painting",
  "roof-washing",
  "handyman",
];

// Job detail options for pressure washing
const PRESSURE_WASH_DETAILS = [
  { value: "standard",  label: "Standard Driveway (2-car)",   price: "$150",       isQuote: false },
  { value: "extended",  label: "Extended Driveway",           price: "$200",       isQuote: false },
  { value: "large",     label: "Large / Custom Driveway",     price: "Free Quote", isQuote: true  },
];

// Service display metadata
const SERVICE_INFO: Record<string, { label: string; icon: string; description: string; priceHint: string }> = {
  "pressure-washing": {
    label:       "Pressure Washing",
    icon:        "💧",
    description: "Driveways, walkways, patios, and more.",
    priceHint:   "Standard driveway from $150 - large driveways quoted on-site.",
  },
  "pressure-washing-painting": {
    label:       "Pressure Wash + Painting",
    icon:        "🎨",
    description: "Full surface prep and professional paint application.",
    priceHint:   "Free on-site quote required.",
  },
  "roof-washing":  {
    label:       "Roof Washing",
    icon:        "🏠",
    description: "Soft-wash treatment to remove algae, moss, and stains.",
    priceHint:   "Free on-site quote - pricing based on roof size and pitch.",
  },
  "handyman": {
    label:       "Handyman",
    icon:        "🔧",
    description: "General repairs and odd jobs.",
    priceHint:   "$100 / hr minimum. Free quote provided before work begins.",
  },
};


// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the selected service + detail combo needs an on-site quote */
function isQuoteJob(serviceType: ServiceType | "", jobDetail: string): boolean {
  if (!serviceType) return false;
  if (QUOTE_SERVICES.includes(serviceType as ServiceType)) return true;
  if (serviceType === "pressure-washing" && jobDetail === "large") return true;
  if (serviceType === "pressure-washing" && !jobDetail) return true; // not chosen yet
  return false;
}

/** Computes the final price string shown to the customer */
function computePrice(serviceType: ServiceType | "", jobDetail: string, addWalkways: boolean): string | null {
  if (serviceType !== "pressure-washing") return null;
  const detail = PRESSURE_WASH_DETAILS.find((d) => d.value === jobDetail);
  if (!detail || detail.isQuote) return null;
  const base = detail.value === "standard" ? 150 : 200;
  const total = base + (addWalkways ? 50 : 0);
  return `$${total}`;
}

/** Formats card number with spaces every 4 digits */
function formatCardNumber(raw: string) {
  return raw.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

/** Formats expiry as MM/YY */
function formatExpiry(raw: string) {
  const d = raw.replace(/\D/g, "").slice(0, 4);
  return d.length <= 2 ? d : d.slice(0, 2) + "/" + d.slice(2);
}

/** Card brand badge from first digit */
function cardBrand(num: string): string {
  const d = num.replace(/\D/g, "");
  if (d.startsWith("4")) return "VISA";
  if (d.startsWith("5") || d.startsWith("2")) return "MC";
  if (d.startsWith("3")) return "AMEX";
  if (d.startsWith("6")) return "DISC";
  return "";
}


// =============================================================================
// Component
// =============================================================================

export default function BookingForm() {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2>(1);

  const [form, setForm] = useState<AppointmentFields>({
    customer_name:    "",
    customer_email:   "",
    customer_phone:   "",
    customer_address: "",
    customer_zip:     "",
    service_type:     "",
    job_detail:       "",
    add_walkways:     false,
    preferred_date:   "",
    preferred_time:   "",
    description:      "",
  });

  const [payment, setPayment] = useState<PaymentFields>({
    card_name: "", card_number: "", expiry: "", cvv: "",
  });

  const [fieldErrors, setFieldErrors]     = useState<AppointmentErrors>({});
  const [paymentErrors, setPaymentErrors] = useState<PaymentErrors>({});
  const [serverError, setServerError]     = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);

  const today     = new Date().toISOString().split("T")[0];
  const quoteJob  = isQuoteJob(form.service_type, form.job_detail);
  const price     = computePrice(form.service_type, form.job_detail, form.add_walkways);
  const serviceInfo = form.service_type ? SERVICE_INFO[form.service_type] : null;


  // ── Step 1 handlers ──────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    // When service type changes, reset job detail
    if (name === "service_type") {
      setForm((prev) => ({ ...prev, service_type: value as ServiceType | "", job_detail: "", add_walkways: false }));
    } else {
      setForm((prev) => ({ ...prev, [name]: val }));
    }
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function handleStep1Submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});

    // Require a job detail selection for pressure washing
    if (form.service_type === "pressure-washing" && !form.job_detail) {
      setFieldErrors({ job_detail: ["Please select a job type"] });
      return;
    }

    // Build the combined description: prepend job details so admin sees them clearly
    const structuredDesc = buildDescription();
    const payload = { ...form, description: structuredDesc };

    const validation = BookingCreateSchema.safeParse(payload);
    if (!validation.success) {
      setFieldErrors(
        validation.error.flatten().fieldErrors as AppointmentErrors
      );
      return;
    }

    if (quoteJob) {
      // Quote jobs skip payment - submit directly
      submitBooking(payload, false);
    } else {
      // Direct bookings go to payment step
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  /** Builds a structured description string that the admin will see */
  function buildDescription(): string {
    const parts: string[] = [];

    if (form.service_type === "pressure-washing" && form.job_detail) {
      const detail = PRESSURE_WASH_DETAILS.find((d) => d.value === form.job_detail);
      if (detail) parts.push(`Job Type: ${detail.label} (${detail.price})`);
    }
    if (form.add_walkways) parts.push("Add-on: Walkway cleaning (+$50)");

    if (form.description.trim()) parts.push(`Notes: ${form.description.trim()}`);

    return parts.join(" | ");
  }


  // ── Step 2 (payment) handlers ────────────────────────────────────────────

  function handlePaymentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    let formatted = value;
    if (name === "card_number") formatted = formatCardNumber(value);
    if (name === "expiry")      formatted = formatExpiry(value);
    if (name === "cvv")         formatted = value.replace(/\D/g, "").slice(0, 4);
    setPayment((prev) => ({ ...prev, [name]: formatted }));
    setPaymentErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validatePayment(): boolean {
    const errs: PaymentErrors = {};
    const rawCard = payment.card_number.replace(/\s/g, "");
    if (!payment.card_name.trim()) errs.card_name   = "Name on card is required.";
    if (rawCard.length < 13)       errs.card_number = "Enter a valid card number.";
    if (payment.expiry.length < 5) errs.expiry      = "Enter a valid expiry (MM/YY).";
    if (payment.cvv.length < 3)    errs.cvv         = "Enter a valid CVV.";
    if (!errs.expiry) {
      const [mm, yy] = payment.expiry.split("/").map(Number);
      if (new Date(2000 + yy, mm - 1, 1) < new Date()) errs.expiry = "This card has expired.";
    }
    setPaymentErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError(null);
    if (!validatePayment()) return;
    submitBooking({ ...form, description: buildDescription() }, true);
  }


  // ── Shared submit ─────────────────────────────────────────────────────────

  async function submitBooking(payload: AppointmentFields, withDeposit: boolean) {
    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = { ...payload };
      if (withDeposit) body.payment_status = "test_deposit_collected";

      const response = await fetch("/api/bookings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const json = await response.json();

      if (!response.ok) {
        if (response.status === 422 && json.fields) {
          setFieldErrors(json.fields);
          setStep(1);
        } else if (response.status === 429) {
          setServerError(json.error);
        } else {
          setServerError(json.error ?? "Something went wrong. Please try again.");
        }
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


  // ── Render helpers ────────────────────────────────────────────────────────
  const err  = (f: keyof AppointmentFields) => fieldErrors[f as keyof AppointmentErrors]?.[0];
  const perr = (f: keyof PaymentFields)     => paymentErrors[f];
  const brand = cardBrand(payment.card_number);


  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Step progress indicator ── */}
      {!quoteJob && (
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step >= 1 ? "bg-brand-green text-white" : "bg-gray-200 text-gray-400"
            }`}>
              {step > 1 ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : "1"}
            </div>
            <span className={`text-sm font-medium ${step === 1 ? "text-brand-dark" : "text-gray-400"}`}>
              Appointment
            </span>
          </div>
          <div className={`h-0.5 w-16 transition-colors ${step === 2 ? "bg-brand-green" : "bg-gray-200"}`} />
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step === 2 ? "bg-brand-green text-white" : "bg-gray-200 text-gray-400"
            }`}>2</div>
            <span className={`text-sm font-medium ${step === 2 ? "text-brand-dark" : "text-gray-400"}`}>
              Payment
            </span>
          </div>
        </div>
      )}

      {/* Quote mode label */}
      {quoteJob && (
        <div className="flex items-center gap-2 justify-center mb-6">
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
            Free Quote Request - No payment required
          </span>
        </div>
      )}

      {/* ── Top-level error ── */}
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {serverError}
        </div>
      )}


      {/* ==================================================================
          STEP 1 - Appointment Details
      ================================================================== */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-6 bg-white p-8 rounded-2xl shadow-md">
          <h2 className="text-2xl font-display font-bold text-brand-dark">
            {quoteJob ? "Request a Free Quote" : "Appointment Details"}
          </h2>

          {/* ── Name ── */}
          <div>
            <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input id="customer_name" name="customer_name" type="text"
              value={form.customer_name} onChange={handleChange} placeholder="John Smith"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_name") ? "border-red-400" : "border-gray-300"}`}
            />
            {err("customer_name") && <p className="text-red-500 text-xs mt-1">{err("customer_name")}</p>}
          </div>

          {/* ── Email ── */}
          <div>
            <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input id="customer_email" name="customer_email" type="email"
              value={form.customer_email} onChange={handleChange} placeholder="john@email.com"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_email") ? "border-red-400" : "border-gray-300"}`}
            />
            {err("customer_email") && <p className="text-red-500 text-xs mt-1">{err("customer_email")}</p>}
          </div>

          {/* ── Phone ── */}
          <div>
            <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input id="customer_phone" name="customer_phone" type="tel"
              value={form.customer_phone} onChange={handleChange} placeholder="(561) 555-1234"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("customer_phone") ? "border-red-400" : "border-gray-300"}`}
            />
            {err("customer_phone") && <p className="text-red-500 text-xs mt-1">{err("customer_phone")}</p>}
          </div>

          {/* ── Address ── */}
          <div>
            <label htmlFor="customer_address" className="block text-sm font-medium text-gray-700 mb-1">Service Address</label>
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
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                We primarily serve:{" "}
                <span className="text-gray-600 font-medium">{SERVICE_AREA_ZIPS.join(", ")}</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Outside these zip codes? Go ahead and book - we will confirm availability when we review your request.
              </p>
            </div>
          </div>

          {/* ── Service type ── */}
          <div>
            <label htmlFor="service_type" className="block text-sm font-medium text-gray-700 mb-1">Service</label>
            <select id="service_type" name="service_type"
              value={form.service_type} onChange={handleChange}
              className={`w-full border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green ${err("service_type") ? "border-red-400" : "border-gray-300"}`}
            >
              <option value="">Select a service</option>
              <option value="pressure-washing">💧 Pressure Washing</option>
              <option value="pressure-washing-painting">🎨 Pressure Wash + Painting</option>
              <option value="roof-washing">🏠 Roof Washing</option>
              <option value="handyman">🔧 Handyman</option>
            </select>
            {err("service_type") && <p className="text-red-500 text-xs mt-1">{err("service_type")}</p>}

            {/* Service description + price hint */}
            {serviceInfo && (
              <div className={`mt-2 rounded-lg px-4 py-3 text-sm border ${
                quoteJob
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              }`}>
                <p className={`font-semibold ${quoteJob ? "text-blue-800" : "text-green-800"}`}>
                  {serviceInfo.description}
                </p>
                <p className={`text-xs mt-0.5 ${quoteJob ? "text-blue-700" : "text-green-700"}`}>
                  {serviceInfo.priceHint}
                </p>
              </div>
            )}
          </div>

          {/* ── Job detail (pressure washing only) ── */}
          {form.service_type === "pressure-washing" && (
            <div>
              <label htmlFor="job_detail" className="block text-sm font-medium text-gray-700 mb-1">
                Driveway Size
              </label>
              <select id="job_detail" name="job_detail"
                value={form.job_detail} onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-green ${err("job_detail") ? "border-red-400" : "border-gray-300"}`}
              >
                <option value="">Select driveway type</option>
                {PRESSURE_WASH_DETAILS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label} - {d.price}
                  </option>
                ))}
              </select>
              {err("job_detail") && <p className="text-red-500 text-xs mt-1">{err("job_detail")}</p>}

              {/* Large driveway note */}
              {form.job_detail === "large" && (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mt-2">
                  We will come out and measure your driveway to give you an accurate quote. No charge for the visit.
                </p>
              )}

              {/* Walkways add-on - only for bookable driveway types */}
              {(form.job_detail === "standard" || form.job_detail === "extended") && (
                <label className="flex items-center gap-3 mt-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    name="add_walkways"
                    checked={form.add_walkways}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-brand-green focus:ring-brand-green"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-brand-dark transition-colors">
                    Add walkway cleaning <span className="font-semibold text-brand-dark">+$50</span>
                  </span>
                </label>
              )}

              {/* Price summary */}
              {price && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex justify-between items-center">
                  <span className="text-sm text-green-700 font-medium">Estimated Total</span>
                  <span className="text-xl font-bold text-green-800">{price}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Date + Time ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="preferred_date" className="block text-sm font-medium text-gray-700 mb-1">
                {quoteJob ? "Preferred Visit Date" : "Preferred Date"}
              </label>
              <input id="preferred_date" name="preferred_date" type="date"
                value={form.preferred_date} min={today} onChange={handleChange}
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${err("preferred_date") ? "border-red-400" : "border-gray-300"}`}
              />
              {err("preferred_date") && <p className="text-red-500 text-xs mt-1">{err("preferred_date")}</p>}
            </div>
            <div>
              <label htmlFor="preferred_time" className="block text-sm font-medium text-gray-700 mb-1">Preferred Time</label>
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

          {/* ── Description ── */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes <span className="text-gray-400">(optional)</span>
            </label>
            <textarea id="description" name="description"
              value={form.description} onChange={handleChange} rows={3}
              placeholder={quoteJob
                ? "Describe what you need done, access info, photos you can share later, etc."
                : "Access info, gate codes, anything we should know."
              }
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green resize-none"
            />
          </div>

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-green hover:bg-brand-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting...
              </>
            ) : quoteJob ? (
              "Request My Free Quote →"
            ) : (
              "Continue to Payment →"
            )}
          </button>
        </form>
      )}


      {/* ==================================================================
          STEP 2 - Payment (direct bookings only)
      ================================================================== */}
      {step === 2 && (
        <form onSubmit={handlePaymentSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-md">
          <div className="flex items-start justify-between">
            <h2 className="text-2xl font-display font-bold text-brand-dark">Secure Checkout</h2>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              SSL secured
            </div>
          </div>

          {/* TEST MODE banner */}
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3">
            <p className="text-yellow-800 text-sm font-semibold">TEST MODE - No real charges</p>
            <p className="text-yellow-700 text-xs mt-0.5">
              Use test card: <span className="font-mono font-bold">4242 4242 4242 4242</span>
              &nbsp;&nbsp;Exp: <span className="font-mono font-bold">12/29</span>
              &nbsp;&nbsp;CVV: <span className="font-mono font-bold">123</span>
            </p>
          </div>

          {/* Order summary */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <p className="font-semibold text-gray-700 mb-1">Order Summary</p>
            <div className="flex justify-between text-gray-600">
              <span>
                {form.job_detail
                  ? PRESSURE_WASH_DETAILS.find((d) => d.value === form.job_detail)?.label
                  : SERVICE_INFO[form.service_type]?.label}
              </span>
              <span>{price ?? "Quoted"}</span>
            </div>
            {form.add_walkways && (
              <div className="flex justify-between text-gray-600">
                <span>Walkway cleaning add-on</span>
                <span>+$50</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-800 pt-1 border-t border-gray-200">
              <span>Deposit due today</span>
              <span>{DEPOSIT_AMOUNT}</span>
            </div>
            <p className="text-gray-400 text-xs">Deposit applied to your total. Balance due at completion.</p>
          </div>

          {/* ── Name on card ── */}
          <div>
            <label htmlFor="card_name" className="block text-sm font-medium text-gray-700 mb-1">Name on Card</label>
            <input id="card_name" name="card_name" type="text"
              value={payment.card_name} onChange={handlePaymentChange} placeholder="John Smith" autoComplete="cc-name"
              className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${perr("card_name") ? "border-red-400" : "border-gray-300"}`}
            />
            {perr("card_name") && <p className="text-red-500 text-xs mt-1">{perr("card_name")}</p>}
          </div>

          {/* ── Card number ── */}
          <div>
            <label htmlFor="card_number" className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
            <div className="relative">
              <input id="card_number" name="card_number" type="text" inputMode="numeric"
                value={payment.card_number} onChange={handlePaymentChange}
                placeholder="1234 5678 9012 3456" maxLength={19} autoComplete="cc-number"
                className={`w-full border rounded-lg px-4 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-green pr-16 ${perr("card_number") ? "border-red-400" : "border-gray-300"}`}
              />
              {brand && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                  {brand}
                </span>
              )}
            </div>
            {perr("card_number") && <p className="text-red-500 text-xs mt-1">{perr("card_number")}</p>}
          </div>

          {/* ── Expiry + CVV ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="expiry" className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
              <input id="expiry" name="expiry" type="text" inputMode="numeric"
                value={payment.expiry} onChange={handlePaymentChange}
                placeholder="MM/YY" maxLength={5} autoComplete="cc-exp"
                className={`w-full border rounded-lg px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green ${perr("expiry") ? "border-red-400" : "border-gray-300"}`}
              />
              {perr("expiry") && <p className="text-red-500 text-xs mt-1">{perr("expiry")}</p>}
            </div>
            <div>
              <label htmlFor="cvv" className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
              <input id="cvv" name="cvv" type="password" inputMode="numeric"
                value={payment.cvv} onChange={handlePaymentChange}
                placeholder="123" maxLength={4} autoComplete="cc-csc"
                className={`w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green ${perr("cvv") ? "border-red-400" : "border-gray-300"}`}
              />
              {perr("cvv") && <p className="text-red-500 text-xs mt-1">{perr("cvv")}</p>}
            </div>
          </div>

          {/* ── Actions ── */}
          <div className="space-y-3 pt-2">
            <button type="submit" disabled={isSubmitting}
              className="w-full bg-brand-green hover:bg-brand-dark text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Pay {DEPOSIT_AMOUNT} Deposit &amp; Confirm Booking
                </>
              )}
            </button>
            <button type="button" onClick={() => { setStep(1); setServerError(null); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
            >
              ← Back to appointment details
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
