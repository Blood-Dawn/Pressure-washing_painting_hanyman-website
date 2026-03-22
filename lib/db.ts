// =============================================================================
// lib/db.ts
//
// The single point of contact between the application and the Supabase database.
// All SQL queries live here. No other file talks to the database directly.
//
// WHY ONE FILE FOR ALL QUERIES?
//   If the database schema changes (e.g., a column is renamed), you only
//   need to update this one file instead of hunting through ten API routes.
//
// WHO IMPORTS THIS FILE:
//   app/api/bookings/route.ts          -- createBooking(), getBookings()
//   app/api/bookings/[id]/route.ts     -- getBookingById(), updateBooking()
//   app/api/stats/route.ts             -- getAdminStats()
//   app/track/[id]/page.tsx            -- getBookingByToken()
//   app/api/auth/[...nextauth]/route.ts -- getUserByEmail()
//
// THIS FILE IMPORTS:
//   @supabase/supabase-js              -- Supabase client library
//   types/index.ts                     -- TypeScript types
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type {
  Booking,
  BookingCreateInput,
  BookingUpdateInput,
  Service,
  Testimonial,
  GalleryItem,
  AdminStats,
  AdminUser,
} from "@/types";


// ─── Client Singleton ─────────────────────────────────────────────────────────
// We create one Supabase client and reuse it across all requests.
// Creating a new client on every request would be wasteful and slow.
//
// SUPABASE_SERVICE_KEY (not the anon key) is used here because this code runs
// on the server and needs full database access (bypasses row-level security).
// NEVER send the service key to the browser.

let supabaseInstance: SupabaseClient | null = null;

// Exported so location API route can use it directly
export function getSupabaseAdmin(): SupabaseClient {
  return getSupabase();
}

function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables"
    );
  }

  supabaseInstance = createClient(url, key);
  return supabaseInstance;
}


// =============================================================================
// BOOKING QUERIES
// =============================================================================

/**
 * createBooking
 * Inserts a new booking row into the database.
 * Called by: POST /api/bookings
 *
 * @param input  - Validated booking data from the customer form
 * @param token  - Pre-generated secure random tracking token
 * @returns        The full booking row as saved to the database
 */
export async function createBooking(
  input: BookingCreateInput,
  token: string
): Promise<Booking> {
  const db = getSupabase();

  const { data, error } = await db
    .from("bookings")
    .insert({
      ...input,
      tracking_token: token,
      status: "pending",
    })
    .select()           // .select() returns the inserted row so we have the id
    .single();          // .single() unwraps the array into one object

  if (error) throw new Error(`createBooking failed: ${error.message}`);
  return data as Booking;
}

/**
 * getBookings
 * Fetches all bookings from the database, ordered by preferred_date ascending.
 * An optional status filter is supported so the admin dashboard can show
 * only pending, only confirmed, etc.
 * Called by: GET /api/bookings
 *
 * @param status  - Optional filter. If omitted, all bookings are returned.
 */
export async function getBookings(status?: string): Promise<Booking[]> {
  const db = getSupabase();

  let query = db
    .from("bookings")
    .select("*")
    .order("preferred_date", { ascending: true });

  // Only add the .eq() filter when a status is actually provided.
  // Without this check, passing undefined would filter for rows where
  // status IS undefined, returning nothing.
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getBookings failed: ${error.message}`);
  return (data ?? []) as Booking[];
}

/**
 * getBookingById
 * Fetches a single booking by its UUID, for admin use.
 * Called by: PATCH /api/bookings/[id]
 *
 * @param id  - The booking's UUID
 */
export async function getBookingById(id: string): Promise<Booking | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code === "PGRST116") return null; // Row not found
  if (error) throw new Error(`getBookingById failed: ${error.message}`);
  return data as Booking;
}

/**
 * getBookingByToken
 * Fetches a booking by tracking_token for the PUBLIC tracking page.
 * The token was sent to the customer in their confirmation email.
 * This function is the only way customers can see their booking.
 * No authentication is required, but you MUST have the correct token.
 * Called by: app/track/[id]/page.tsx
 *
 * @param token  - The random hex token from the tracking URL
 */
export async function getBookingByToken(token: string): Promise<Booking | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("tracking_token", token)
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw new Error(`getBookingByToken failed: ${error.message}`);
  return data as Booking;
}

/**
 * updateBooking
 * Partially updates a booking row.
 * Supports status changes, adding notes, setting ETA, etc.
 * Called by: PATCH /api/bookings/[id]
 *
 * @param id      - The booking's UUID
 * @param update  - Fields to update (only provided fields are changed)
 */
export async function updateBooking(
  id: string,
  update: BookingUpdateInput & { confirmation_date?: string; completion_date?: string; reminder_sent?: boolean }
): Promise<Booking> {
  const db = getSupabase();

  const { data, error } = await db
    .from("bookings")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`updateBooking failed: ${error.message}`);
  return data as Booking;
}

/**
 * getBookingsNeedingReminders
 * Finds all confirmed bookings scheduled for tomorrow that have not yet
 * received a 24-hour reminder email.
 * Called by: the reminder cron job or a scheduled API call
 */
export async function getBookingsNeedingReminders(): Promise<Booking[]> {
  const db = getSupabase();

  // Calculate tomorrow's date as an ISO string "YYYY-MM-DD"
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data, error } = await db
    .from("bookings")
    .select("*")
    .eq("preferred_date", tomorrowStr)
    .eq("status", "confirmed")
    .eq("reminder_sent", false);

  if (error) throw new Error(`getBookingsNeedingReminders failed: ${error.message}`);
  return (data ?? []) as Booking[];
}

/**
 * markReminderSent
 * After the 24-hour reminder email fires, we mark the row so we don't
 * accidentally send the reminder twice.
 * Called by: reminder cron job
 *
 * @param id  - The booking's UUID
 */
export async function markReminderSent(id: string): Promise<void> {
  const db = getSupabase();
  const { error } = await db
    .from("bookings")
    .update({ reminder_sent: true })
    .eq("id", id);
  if (error) throw new Error(`markReminderSent failed: ${error.message}`);
}


// =============================================================================
// STATS QUERIES
// =============================================================================

/**
 * getAdminStats
 * Runs several aggregate queries and returns a summary object for
 * the admin dashboard's metrics panel.
 * Called by: GET /api/stats
 */
export async function getAdminStats(): Promise<AdminStats> {
  const db = getSupabase();

  // First day of the current month as ISO string
  const monthStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  ).toISOString();

  // Query 1: All bookings this month
  const { data: monthData } = await db
    .from("bookings")
    .select("status, service_type, created_at, confirmation_date")
    .gte("created_at", monthStart);

  const bookings = (monthData ?? []) as Partial<Booking>[];

  // Query 2: All pending bookings (for the "Needs Attention" count)
  const { count: pendingCount } = await db
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  // Count how many of this month's bookings are confirmed or completed
  const confirmedThisMonth = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "completed"
  ).length;
  const completedThisMonth = bookings.filter(
    (b) => b.status === "completed"
  ).length;

  // Find the most booked service type this month
  const serviceCount: Record<string, number> = {};
  bookings.forEach((b) => {
    if (b.service_type) {
      serviceCount[b.service_type] = (serviceCount[b.service_type] ?? 0) + 1;
    }
  });
  const popularService =
    Object.entries(serviceCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "N/A";

  // Average time between booking creation and admin confirmation (in hours)
  const responseTimes = bookings
    .filter((b) => b.created_at && b.confirmation_date)
    .map((b) => {
      const created = new Date(b.created_at!).getTime();
      const confirmed = new Date(b.confirmation_date!).getTime();
      return (confirmed - created) / 1000 / 60 / 60; // milliseconds to hours
    });
  const avgResponseTimeHours =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  return {
    totalThisMonth:       bookings.length,
    confirmedThisMonth,
    completedThisMonth,
    pendingCount:         pendingCount ?? 0,
    popularService,
    avgResponseTimeHours: Math.round(avgResponseTimeHours * 10) / 10,
    revenueEstimate:      completedThisMonth * 250, // Rough estimate: $250 avg job
  };
}


// =============================================================================
// SERVICE QUERIES
// =============================================================================

/**
 * getServices
 * Returns all active services ordered by display_order.
 * Used to populate the Services page and the booking form's service dropdown.
 * Called by: app/page.tsx (landing), app/booking/page.tsx
 */
export async function getServices(): Promise<Service[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("services")
    .select("*")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(`getServices failed: ${error.message}`);
  return (data ?? []) as Service[];
}


// =============================================================================
// GALLERY QUERIES
// =============================================================================

/**
 * getGalleryItems
 * Returns all active gallery items, optionally filtered by service type.
 * Called by: app/page.tsx (portfolio section)
 */
export async function getGalleryItems(serviceType?: ServiceType): Promise<GalleryItem[]> {
  const db = getSupabase();

  let query = db
    .from("gallery")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (serviceType) {
    query = query.eq("service_type", serviceType);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getGalleryItems failed: ${error.message}`);
  return (data ?? []) as GalleryItem[];
}

// Import ServiceType locally to avoid TS error in getGalleryItems signature
import type { ServiceType } from "@/types";


// =============================================================================
// TESTIMONIAL QUERIES
// =============================================================================

/**
 * getApprovedTestimonials
 * Returns only testimonials that the admin has approved.
 * Called by: app/page.tsx (testimonials section on landing page)
 */
export async function getApprovedTestimonials(): Promise<Testimonial[]> {
  const db = getSupabase();

  const { data, error } = await db
    .from("testimonials")
    .select("*")
    .eq("approved", true)
    .order("created_at", { ascending: false })
    .limit(6); // Show latest 6

  if (error) throw new Error(`getApprovedTestimonials failed: ${error.message}`);
  return (data ?? []) as Testimonial[];
}


// =============================================================================
// USER / AUTH QUERIES
// =============================================================================

/**
 * getUserByEmail
 * Looks up an admin user by email address.
 * Used by NextAuth during login to verify credentials.
 * Called by: app/api/auth/[...nextauth]/route.ts
 *
 * @param email  - The email entered in the login form
 */
export async function getUserByEmail(email: string): Promise<(AdminUser & { password: string }) | null> {
  const db = getSupabase();

  const { data, error } = await db
    .from("users")
    .select("*")
    .eq("email", email.toLowerCase())
    .single();

  if (error && error.code === "PGRST116") return null;
  if (error) throw new Error(`getUserByEmail failed: ${error.message}`);
  return data as AdminUser & { password: string };
}

/**
 * logAuditEvent
 * Records an admin action in the audit_logs table.
 * Should be called after every sensitive admin operation.
 * Called by: app/api/bookings/[id]/route.ts
 *
 * @param adminId   - UUID of the admin who performed the action
 * @param action    - Short string describing what happened e.g. 'confirmed_booking'
 * @param targetId  - UUID of the booking or resource that was acted on
 * @param details   - Any extra context as a plain object
 * @param ip        - IP address from the request headers (optional)
 */
export async function logAuditEvent(
  adminId: string,
  action: string,
  targetId?: string,
  details?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  const db = getSupabase();
  const { error } = await db.from("audit_logs").insert({
    admin_id:   adminId,
    action,
    target_id:  targetId ?? null,
    details:    details ?? null,
    ip_address: ip ?? null,
  });
  // Audit logging should never crash the main request, so we log instead of throw
  if (error) console.error("logAuditEvent failed:", error.message);
}
