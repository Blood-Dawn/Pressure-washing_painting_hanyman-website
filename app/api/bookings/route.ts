// =============================================================================
// app/api/bookings/route.ts
//
// Handles the two main booking operations:
//   GET  /api/bookings           -- Admin: list all bookings (with optional ?status= filter)
//   POST /api/bookings           -- Public: create a new booking from the customer form
//
// REQUEST FLOW FOR POST (customer submits booking form):
//   1. Rate limit check (prevent spam)
//   2. Zod validation (ensure all fields are valid)
//   3. Generate secure tracking token
//   4. Save to database
//   5. Send confirmation email to customer
//   6. Send notification email to admin
//   7. Return the new booking ID and tracking token
//
// REQUEST FLOW FOR GET (admin loads dashboard):
//   1. Check for valid admin session
//   2. Read optional ?status= query param
//   3. Fetch bookings from database
//   4. Return array of bookings
//
// WHO CALLS THIS FILE:
//   components/BookingForm.tsx         -- POST (customer submits form)
//   app/admin/dashboard/page.tsx       -- GET (admin loads booking list)
//
// THIS FILE IMPORTS:
//   next/server                        -- NextRequest, NextResponse
//   next-auth/next                     -- getServerSession (session check)
//   lib/auth.ts                        -- authOptions
//   lib/db.ts                          -- createBooking, getBookings
//   lib/email.ts                       -- sendBookingConfirmation, sendAdminNotification
//   lib/security.ts                    -- checkRateLimit, generateTrackingToken
//   lib/validation.ts                  -- BookingCreateSchema
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { createBooking, getBookings } from "@/lib/db";
import { sendBookingConfirmation, sendAdminNotification } from "@/lib/email";
import { checkRateLimit, generateTrackingToken } from "@/lib/security";
import { BookingCreateSchema } from "@/lib/validation";


// =============================================================================
// GET /api/bookings
// Admin only. Returns the list of all bookings.
// =============================================================================

export async function GET(request: NextRequest) {
  // Step 1: Verify the requester is a logged-in admin.
  // getServerSession reads the JWT cookie from the request headers.
  // If the cookie is missing, expired, or invalid, it returns null.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 2: Read optional ?status= query parameter from the URL.
  // e.g., GET /api/bookings?status=pending
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;

  try {
    const bookings = await getBookings(status);
    return NextResponse.json({ success: true, data: bookings });
  } catch (err) {
    console.error("GET /api/bookings error:", err);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}


// =============================================================================
// POST /api/bookings
// Public (no login required). Creates a new booking.
// =============================================================================

export async function POST(request: NextRequest) {
  // Step 1: Rate limiting.
  // We use the client's IP address as the rate limit key.
  // x-forwarded-for is set by Vercel's load balancer with the real IP.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
    "unknown";

  // Allow maximum 5 booking submissions per 15 minutes from one IP.
  // This prevents scripts from spamming the booking form.
  const rateLimit = checkRateLimit(`booking:${ip}`, 5, 15 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      }
    );
  }

  // Step 2: Parse and validate the request body.
  // request.json() parses the JSON body sent by the booking form.
  // .safeParse() validates it against our Zod schema.
  // If validation fails, we return the specific field errors so the
  // client can highlight the broken fields.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = BookingCreateSchema.safeParse(body);
  if (!result.success) {
    // result.error.flatten() gives us field-by-field error messages
    return NextResponse.json(
      { error: "Validation failed", fields: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const validatedData = result.data;

  try {
    // Step 3: Generate a secure random tracking token.
    // This 64-character hex string is unique to this booking.
    // It is included in the confirmation email link.
    const trackingToken = generateTrackingToken();

    // Step 4: Insert the booking into the database.
    const booking = await createBooking(validatedData, trackingToken);

    // Step 5: Send the customer their confirmation email (fire and forget).
    // We use Promise.allSettled (not Promise.all) so that if one email fails,
    // the other still sends. We don't want the entire request to fail
    // just because an email timed out.
    const adminEmail = process.env.ADMIN_EMAIL!;
    await Promise.allSettled([
      sendBookingConfirmation(booking),
      sendAdminNotification(booking, adminEmail),
    ]);

    // Step 6: Return the new booking's ID and tracking token.
    // The client uses this to redirect the customer to the tracking page.
    return NextResponse.json(
      {
        success: true,
        data: {
          id:             booking.id,
          trackingToken:  booking.tracking_token,
        },
      },
      { status: 201 }  // 201 Created (more accurate than 200 OK for a new resource)
    );
  } catch (err) {
    console.error("POST /api/bookings error:", err);
    return NextResponse.json({ error: "Failed to create booking" }, { status: 500 });
  }
}
