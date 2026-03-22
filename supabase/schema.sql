-- =============================================================================
-- schema.sql
-- Run this entire file in your Supabase SQL editor to set up the database.
-- Supabase Dashboard -> SQL Editor -> New Query -> paste this -> Run
--
-- TABLE OVERVIEW:
--   users          Admin login credentials (hashed passwords, never plain text)
--   bookings       Every customer appointment request, current and historical
--   services       The services displayed on the website (editable by admin)
--   testimonials   Customer reviews (require admin approval before showing)
--   audit_logs     Record of every admin action for accountability/debugging
--   gallery        Before/after photos uploaded by admin
-- =============================================================================


-- ─── EXTENSION ────────────────────────────────────────────────────────────────
-- uuid-ossp lets us generate unique IDs with gen_random_uuid().
-- UUIDs are better than sequential integers for public-facing IDs because
-- they can't be guessed (a customer can't increment the URL to see another
-- customer's booking).
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─── ENUMS ────────────────────────────────────────────────────────────────────
-- Enums are like dropdown options enforced at the database level.
-- If code tries to insert a value not in the list, Postgres rejects it.
-- This prevents typos like 'compelted' instead of 'completed' causing bugs.

CREATE TYPE service_type AS ENUM (
  'handyman',
  'landscaping',
  'power-washing',
  'painting'
);

CREATE TYPE booking_status AS ENUM (
  'pending',      -- Customer submitted but admin has not reviewed
  'confirmed',    -- Admin confirmed, appointment is scheduled
  'in-progress',  -- Admin marked job as started
  'en-route',     -- Admin is traveling to the customer
  'arrived',      -- Admin has arrived at the customer location
  'completed',    -- Job is done
  'declined'      -- Admin rejected the booking request
);


-- ─── USERS ────────────────────────────────────────────────────────────────────
-- Stores admin login accounts. In practice there will be one row: your cousin.
-- Passwords are hashed by bcrypt in the application before being stored here.
-- We never store plain text passwords anywhere.

CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,          -- Login identifier
  password     TEXT NOT NULL,                 -- bcrypt hash, never plain text
  name         TEXT NOT NULL,
  phone        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── BOOKINGS ─────────────────────────────────────────────────────────────────
-- The core table. One row = one appointment request.
-- Status flows: pending -> confirmed -> en-route -> arrived -> completed
--                       or pending -> declined

CREATE TABLE IF NOT EXISTS bookings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Customer information
  customer_name      TEXT NOT NULL,
  customer_email     TEXT NOT NULL,
  customer_phone     TEXT NOT NULL,
  customer_address   TEXT NOT NULL,
  customer_zip       TEXT NOT NULL,           -- Used for service area validation

  -- What they want and when
  service_type       service_type NOT NULL,
  preferred_date     DATE NOT NULL,
  preferred_time     TEXT NOT NULL,           -- e.g., '10:00 AM'
  description        TEXT,                   -- Customer's notes about the job

  -- State machine
  status             booking_status NOT NULL DEFAULT 'pending',
  notes              TEXT,                   -- Admin's private notes on the job

  -- Timestamps for each lifecycle event
  confirmation_date  TIMESTAMPTZ,            -- When admin confirmed it
  completion_date    TIMESTAMPTZ,            -- When admin marked it done
  eta                TEXT,                   -- ETA string e.g. '25 minutes'
  technician_name    TEXT,                   -- Set when en-route

  -- Email state
  reminder_sent      BOOLEAN NOT NULL DEFAULT FALSE,   -- 24h reminder was sent
  review_requested   BOOLEAN NOT NULL DEFAULT FALSE,   -- Post-job review email sent

  -- Security token: customers receive this in their email.
  -- Without the correct token, nobody can view a booking's tracking page.
  -- Generated with crypto.randomBytes(32) in lib/security.ts.
  tracking_token     TEXT NOT NULL UNIQUE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: admin dashboard queries are almost always filtered by status and
-- ordered by preferred_date. These indexes make those queries fast.
CREATE INDEX IF NOT EXISTS idx_bookings_status       ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_date         ON bookings (preferred_date);
CREATE INDEX IF NOT EXISTS idx_bookings_email        ON bookings (customer_email);
CREATE INDEX IF NOT EXISTS idx_bookings_tracking     ON bookings (tracking_token);


-- ─── SERVICES ─────────────────────────────────────────────────────────────────
-- Drives the Services page. Admin can update descriptions and price ranges
-- from the dashboard without touching code.

CREATE TABLE IF NOT EXISTS services (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,         -- e.g., 'power-washing'
  name                TEXT NOT NULL,                -- e.g., 'Power Washing'
  description         TEXT NOT NULL,
  price_min           INTEGER,                      -- Minimum price in dollars
  price_max           INTEGER,                      -- Maximum price in dollars
  price_label         TEXT,                         -- e.g., 'Call for quote'
  estimated_duration  TEXT,                         -- e.g., '2 to 4 hours'
  image_url           TEXT,
  display_order       INTEGER NOT NULL DEFAULT 0,   -- Controls order on Services page
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── GALLERY ──────────────────────────────────────────────────────────────────
-- Before/after photos. Admin uploads them via the dashboard.
-- Photos are stored in Supabase Storage; this table holds the metadata.

CREATE TABLE IF NOT EXISTS gallery (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type service_type,
  label        TEXT,                   -- Short description e.g. 'Front yard remodel'
  before_url   TEXT,                   -- URL to the before image in Supabase Storage
  after_url    TEXT,                   -- URL to the after image in Supabase Storage
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── TESTIMONIALS ─────────────────────────────────────────────────────────────
-- Customers submit reviews. Admin approves them before they go live.
-- approved = FALSE means the review is in the admin's review queue.
-- approved = TRUE means it appears on the homepage.

CREATE TABLE IF NOT EXISTS testimonials (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name  TEXT NOT NULL,
  customer_email TEXT,
  service_type   service_type,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text    TEXT NOT NULL,
  approved       BOOLEAN NOT NULL DEFAULT FALSE,
  booking_id     UUID REFERENCES bookings (id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─── AUDIT LOGS ───────────────────────────────────────────────────────────────
-- Every admin action is recorded here.
-- If something goes wrong (wrong booking status, unexpected change), you can
-- look at this table to see exactly what happened and when.

CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id   UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action     TEXT NOT NULL,   -- e.g., 'confirmed_booking', 'declined_booking'
  target_id  UUID,            -- The booking or resource that was acted on
  details    JSONB,           -- Arbitrary extra context as JSON
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_admin ON audit_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_time  ON audit_logs (created_at DESC);


-- ─── AUTO-UPDATE updated_at ───────────────────────────────────────────────────
-- PostgreSQL does not auto-update updated_at columns.
-- This function + trigger does it automatically whenever a row changes.

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── SEED DATA ────────────────────────────────────────────────────────────────
-- Inserts the four default service records so the Services page is populated
-- immediately after running the schema. Admin can edit these via the dashboard.

INSERT INTO services (slug, name, description, price_min, price_max, estimated_duration, display_order)
VALUES
  ('handyman',      'Handyman',      'General repairs, carpentry, installations, and home maintenance.',       50,  200,  '1 to 3 hours',   1),
  ('landscaping',   'Landscaping',   'Lawn care, garden design, tree service, and hardscaping.',              100, 500,  '2 to 6 hours',   2),
  ('power-washing', 'Power Washing', 'Driveways, fences, decks, and home exteriors.',                        150, 400,  '2 to 4 hours',   3),
  ('painting',      'Painting',      'Interior and exterior painting with professional-grade materials.',     200, 1000, '4 to 8 hours',   4)
ON CONFLICT (slug) DO NOTHING;
