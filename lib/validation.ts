// =============================================================================
// lib/validation.ts
//
// All input validation using Zod, a TypeScript-first schema validation library.
// Zod lets us define the expected shape of data and run .parse() or
// .safeParse() to validate it. On failure it returns structured error messages.
//
// WHY VALIDATE ON THE SERVER AND THE CLIENT?
//   Client validation (in BookingForm.tsx) gives instant feedback to the user.
//   Server validation (in API routes) is the actual security gate.
//   A malicious user can bypass browser validation with curl or Postman.
//   If the server does not validate, bad data reaches the database.
//
// WHO IMPORTS THIS FILE:
//   app/api/bookings/route.ts          -- uses BookingCreateSchema
//   app/api/bookings/[id]/route.ts     -- uses BookingUpdateSchema
//   components/BookingForm.tsx         -- uses BookingCreateSchema (client-side)
//
// THIS FILE IMPORTS:
//   zod                                -- schema validation library
//   lib/security.ts                    -- isZipInServiceArea
// =============================================================================

import { z } from "zod";


// =============================================================================
// REUSABLE FIELD VALIDATORS
// =============================================================================

// Phone: strips all non-digit characters and requires exactly 10 digits.
// Accepts (561) 555-1234, 561-555-1234, 5615551234, etc.
const phoneSchema = z
  .string()
  .transform((val) => val.replace(/\D/g, ""))
  .refine((val) => val.length === 10, {
    message: "Phone number must be 10 digits",
  });

// Zip: 5 digits only. Service area is not enforced here —
// the technician / admin can decline a booking that is too far out.
const zipSchema = z
  .string()
  .regex(/^\d{5}$/, "Zip code must be 5 digits");

// Date: must be a valid ISO date string (YYYY-MM-DD) in the future.
const futureDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine(
    (val) => {
      const selected = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selected >= today;
    },
    { message: "Date must be today or in the future" }
  );

// Time slot: must be one of the valid booking slots.
const VALID_TIMES = [
  "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM",  "2:00 PM",  "3:00 PM", "4:00 PM",
];
const timeSchema = z.enum(VALID_TIMES as [string, ...string[]], {
  errorMap: () => ({ message: "Please select a valid time slot" }),
});


// =============================================================================
// BOOKING CREATE SCHEMA
// =============================================================================

/**
 * BookingCreateSchema
 * Validates the full booking form submission.
 * Used both on the server (API route) and client (form).
 */
export const BookingCreateSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .transform((val) => val.trim()),

  customer_email: z
    .string()
    .email("Please enter a valid email address")
    .transform((val) => val.toLowerCase().trim()),

  customer_phone: phoneSchema,

  customer_address: z
    .string()
    .min(10, "Please enter a full street address")
    .max(200, "Address is too long")
    .transform((val) => val.trim()),

  customer_zip: zipSchema,

  service_type: z.enum(
    ["pressure-washing", "pressure-washing-painting", "roof-washing", "handyman"],
    { errorMap: () => ({ message: "Please select a service" }) }
  ),

  preferred_date: futureDateSchema,

  preferred_time: timeSchema,

  description: z
    .string()
    .max(1000, "Description must be under 1000 characters")
    .optional()
    .transform((val) => val?.trim()),
});

export type BookingCreateData = z.infer<typeof BookingCreateSchema>;


// =============================================================================
// BOOKING UPDATE SCHEMA
// =============================================================================

/**
 * BookingUpdateSchema
 * Validates data when an admin updates a booking's status or details.
 * All fields are optional because a PATCH request only sends changed fields.
 */
export const BookingUpdateSchema = z.object({
  status: z
    .enum([
      "pending", "confirmed", "in-progress",
      "en-route", "arrived", "completed", "declined",
    ])
    .optional(),

  notes: z
    .string()
    .max(2000)
    .optional()
    .transform((val) => val?.trim()),

  eta: z
    .string()
    .max(50, "ETA string is too long")
    .optional()
    .transform((val) => val?.trim()),

  technician_name: z
    .string()
    .max(100)
    .optional()
    .transform((val) => val?.trim()),
});

export type BookingUpdateData = z.infer<typeof BookingUpdateSchema>;


// =============================================================================
// TESTIMONIAL SCHEMA
// =============================================================================

export const TestimonialCreateSchema = z.object({
  customer_name: z.string().min(2).max(100).transform((v) => v.trim()),
  customer_email: z.string().email().optional(),
  service_type: z
    .enum(["pressure-washing", "pressure-washing-painting", "roof-washing", "handyman"])
    .optional(),
  rating: z.number().int().min(1).max(5),
  review_text: z
    .string()
    .min(10, "Review must be at least 10 characters")
    .max(1000)
    .transform((v) => v.trim()),
  booking_id: z.string().uuid().optional(),
});
