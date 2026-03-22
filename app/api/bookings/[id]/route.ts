// =============================================================================
// app/api/bookings/[id]/route.ts
//
// Handles updates to a SINGLE booking by its UUID.
//   PATCH  /api/bookings/[id]  -- Admin: update status, notes, ETA, etc.
//   DELETE /api/bookings/[id]  -- Admin: delete a booking (soft delete optional)
//
// The [id] in the folder name is a dynamic segment. When the request comes in
// for /api/bookings/abc-123, Next.js passes { id: "abc-123" } in `params`.
//
// REQUEST FLOW FOR PATCH (admin updates booking status):
//   1. Auth check (admin only)
//   2. Validate the request body
//   3. Load the current booking from the database
//   4. Update the booking in the database
//   5. Trigger the correct email based on the new status
//   6. Write an audit log entry recording who changed what
//   7. Return the updated booking
//
// WHO CALLS THIS FILE:
//   components/AdminBookingCard.tsx    -- PATCH (confirm, decline, update status)
//
// THIS FILE IMPORTS:
//   next/server                        -- NextRequest, NextResponse
//   next-auth/next                     -- getServerSession
//   lib/auth.ts                        -- authOptions
//   lib/db.ts                          -- getBookingById, updateBooking, logAuditEvent
//   lib/email.ts                       -- status-specific email senders
//   lib/validation.ts                  -- BookingUpdateSchema
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getBookingById, updateBooking, logAuditEvent } from "@/lib/db";
import {
  sendConfirmedEmail,
  sendDeclineEmail,
  sendEnRouteEmail,
  sendCompletionEmail,
} from "@/lib/email";
import { BookingUpdateSchema } from "@/lib/validation";


// =============================================================================
// GET /api/bookings/[id]?token=[trackingToken]
// PUBLIC (no admin auth required). Used by TrackingWidget to poll for updates.
// The tracking token is the security gate -- without it, the request is denied.
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token  = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const booking = await getBookingById(id);

  // Return 404 for both "not found" and "wrong token" so we reveal nothing
  if (!booking || booking.tracking_token !== token) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: booking });
}


// =============================================================================
// PATCH /api/bookings/[id]
// Admin only. Updates a booking's status or metadata.
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Step 1: Admin session check.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In Next.js 15+, params is a Promise and must be awaited
  const { id } = await params;

  // session.user.id is set in the jwt callback in lib/auth.ts
  const adminId = (session.user as { id?: string }).id ?? "unknown";

  // Step 2: Validate the request body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = BookingUpdateSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const updates = result.data;

  try {
    // Step 3: Load the current booking to verify it exists and to access
    // existing fields (email address, customer name) needed for emails.
    const existing = await getBookingById(id);
    if (!existing) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Step 4: Build the database update payload.
    // If the status is changing to 'confirmed', stamp confirmation_date now.
    // If the status is changing to 'completed', stamp completion_date now.
    const dbUpdate: Record<string, unknown> = { ...updates };

    if (updates.status === "confirmed" && existing.status !== "confirmed") {
      dbUpdate.confirmation_date = new Date().toISOString();
    }
    if (updates.status === "completed" && existing.status !== "completed") {
      dbUpdate.completion_date = new Date().toISOString();
    }

    const updatedBooking = await updateBooking(id, dbUpdate as Parameters<typeof updateBooking>[1]);

    // Step 5: Send the email that corresponds to the new status.
    // Each status change sends a different email to the customer.
    // We only send if the status actually changed to avoid duplicate emails
    // when the admin updates only the notes or ETA.
    if (updates.status && updates.status !== existing.status) {
      switch (updates.status) {
        case "confirmed":
          await sendConfirmedEmail(updatedBooking).catch(console.error);
          break;
        case "declined":
          await sendDeclineEmail(updatedBooking).catch(console.error);
          break;
        case "en-route":
          await sendEnRouteEmail(updatedBooking).catch(console.error);
          break;
        case "completed":
          await sendCompletionEmail(updatedBooking).catch(console.error);
          break;
      }
    }

    // Send ETA email when technician updates ETA while already en-route.
    // This allows them to send multiple ETA updates until they arrive.
    const isEtaUpdate = updates.eta && updates.eta !== existing.eta;
    const alreadyEnRoute = existing.status === "en-route" && !updates.status;
    if (isEtaUpdate && alreadyEnRoute) {
      await sendEnRouteEmail(updatedBooking).catch(console.error);
    }

    // Step 6: Record the audit log.
    // We log every admin update. The 'details' field captures what changed.
    await logAuditEvent(
      adminId,
      updates.status ? `status_changed_to_${updates.status}` : "booking_updated",
      id,
      {
        previousStatus: existing.status,
        newStatus:      updates.status,
        changedFields:  Object.keys(updates),
      },
      request.headers.get("x-forwarded-for") ?? undefined
    );

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (err) {
    console.error("PATCH /api/bookings/[id] error:", err);
    return NextResponse.json({ error: "Failed to update booking" }, { status: 500 });
  }
}


// =============================================================================
// DELETE /api/bookings/[id]
// Admin only. Deletes a booking permanently.
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const { createClient } = await import("@supabase/supabase-js");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { error } = await db.from("bookings").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  await logAuditEvent(
    (session.user as { id?: string }).id ?? "unknown",
    "deleted_booking",
    id
  );

  return NextResponse.json({ success: true });
}
