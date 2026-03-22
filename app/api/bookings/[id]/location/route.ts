// =============================================================================
// app/api/bookings/[id]/location/route.ts
//
// POST /api/bookings/[id]/location
// Admin only. Updates the technician's live GPS coordinates on a booking.
// Called every 30 seconds by AdminBookingCard when location sharing is active.
// The customer's TrackingWidget polls for these coordinates and updates the map.
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { lat: number; lng: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.lat !== "number" || typeof body.lng !== "number") {
    return NextResponse.json({ error: "lat and lng are required numbers" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("bookings")
    .update({
      tech_lat: body.lat,
      tech_lng: body.lng,
      location_updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
