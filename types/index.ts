// =============================================================================
// types/index.ts
//
// Centralizes every TypeScript type and interface for the entire project.
// Importing from here instead of defining types inline in each file means:
//  - One place to change a type if the database schema changes
//  - Consistent shape across API routes, components, and lib functions
//  - TypeScript can catch mismatches between what the DB returns and what
//    the UI expects at compile time, not at runtime.
//
// WHO IMPORTS THIS FILE:
//   lib/db.ts         -- uses Booking, BookingStatus, Service, etc.
//   lib/email.ts      -- uses Booking (to build email content)
//   app/api/bookings/ -- uses BookingCreateInput, Booking
//   components/       -- uses Booking, Service, Testimonial for props
//   app/admin/        -- uses Booking, AdminStats
// =============================================================================


// ─── Database row types ──────────────────────────────────────────────────────
// These mirror the columns in schema.sql exactly.
// When Supabase returns a row, it matches these shapes.

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in-progress"
  | "en-route"
  | "arrived"
  | "completed"
  | "declined";

export type ServiceType =
  | "pressure-washing"           // Driveways, walkways, patios
  | "pressure-washing-painting"  // Pressure wash + paint bundle (always a quote)
  | "roof-washing"               // Roof soft-wash (always a free quote)
  | "handyman";                  // Miscellaneous repairs (always a free quote)

export interface Booking {
  id:                string;
  customer_name:     string;
  customer_email:    string;
  customer_phone:    string;
  customer_address:  string;
  customer_zip:      string;
  service_type:      ServiceType;
  preferred_date:    string;       // ISO date string e.g. "2024-06-15"
  preferred_time:    string;       // e.g. "10:00 AM"
  description:       string | null;
  status:            BookingStatus;
  notes:             string | null;
  confirmation_date: string | null;
  completion_date:   string | null;
  eta:               string | null;
  technician_name:   string | null;
  reminder_sent:        boolean;
  review_requested:     boolean;
  tracking_token:       string;
  tech_lat:             number | null;
  tech_lng:             number | null;
  location_updated_at:  string | null;
  created_at:           string;
  updated_at:           string;
}

export interface Service {
  id:                 string;
  slug:               string;
  name:               string;
  description:        string;
  price_min:          number | null;
  price_max:          number | null;
  price_label:        string | null;
  estimated_duration: string | null;
  image_url:          string | null;
  display_order:      number;
  active:             boolean;
  created_at:         string;
}

export interface Testimonial {
  id:             string;
  customer_name:  string;
  customer_email: string | null;
  service_type:   ServiceType | null;
  rating:         number;
  review_text:    string;
  approved:       boolean;
  booking_id:     string | null;
  created_at:     string;
}

export interface GalleryItem {
  id:           string;
  service_type: ServiceType | null;
  label:        string | null;
  before_url:   string | null;
  after_url:    string | null;
  active:       boolean;
  created_at:   string;
}

export interface AuditLog {
  id:         string;
  admin_id:   string;
  action:     string;
  target_id:  string | null;
  details:    Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminUser {
  id:         string;
  email:      string;
  name:       string;
  phone:      string | null;
  created_at: string;
  updated_at: string;
  // NOTE: password is never included in any type that leaves the server
}


// ─── API input types ─────────────────────────────────────────────────────────
// These describe the shape of data coming IN to the API from the client.
// They do NOT include system-generated fields like id, created_at, tracking_token.

export interface BookingCreateInput {
  customer_name:    string;
  customer_email:   string;
  customer_phone:   string;
  customer_address: string;
  customer_zip:     string;
  service_type:     ServiceType;
  preferred_date:   string;
  preferred_time:   string;
  description?:     string;
}

export interface BookingUpdateInput {
  status?:           BookingStatus;
  notes?:            string;
  eta?:              string;
  technician_name?:  string;
}

export interface TestimonialCreateInput {
  customer_name:  string;
  customer_email: string;
  service_type:   ServiceType;
  rating:         number;
  review_text:    string;
  booking_id?:    string;
}


// ─── API response types ───────────────────────────────────────────────────────
// Standard envelope for all API responses.

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?:   T;
  error?:  string;
}

// Returned by GET /api/stats
export interface AdminStats {
  totalThisMonth:       number;
  confirmedThisMonth:   number;
  completedThisMonth:   number;
  pendingCount:         number;
  popularService:       string;
  avgResponseTimeHours: number;
  revenueEstimate:      number;
}
