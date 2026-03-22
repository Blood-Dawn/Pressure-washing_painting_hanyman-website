// =============================================================================
// app/api/stats/route.ts
//
// GET /api/stats
// Admin only. Returns aggregate metrics for the dashboard summary panel.
// No data from this endpoint is customer-facing.
//
// WHO CALLS THIS FILE:
//   app/admin/dashboard/page.tsx  -- fetches stats on page load
//
// THIS FILE IMPORTS:
//   next-auth/next                -- getServerSession
//   lib/auth.ts                   -- authOptions
//   lib/db.ts                     -- getAdminStats
// =============================================================================

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getAdminStats } from "@/lib/db";

export async function GET() {
  // This endpoint reveals business metrics so it must be admin-only.
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getAdminStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (err) {
    console.error("GET /api/stats error:", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
