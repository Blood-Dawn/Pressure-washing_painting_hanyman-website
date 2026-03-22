# Project Roadmap: Handyman & Landscaping Website

## Full Technical Architecture, File Map, and Build Plan

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Technology Stack Explained](#2-technology-stack-explained)
3. [Complete File Dependency Map](#3-complete-file-dependency-map)
4. [Database Schema Deep Dive](#4-database-schema-deep-dive)
5. [File-by-File Code Breakdown](#5-file-by-file-code-breakdown)
6. [Security Layers Explained](#6-security-layers-explained)
7. [Email System Explained](#7-email-system-explained)
8. [Data Flow Walkthroughs](#8-data-flow-walkthroughs)
9. [SQL Queries Reference](#9-sql-queries-reference)
10. [Build Phases and Checklist](#10-build-phases-and-checklist)
11. [Future-Ready Architecture](#11-future-ready-architecture)

---

## 1. System Architecture Overview

This is a full-stack web application with three distinct user groups interacting with it:

```
Customer (browser)
      |
      | HTTPS request
      v
  Vercel CDN / Edge
      |
      v
  Next.js App (server-side rendering + API routes)
      |
      +----> Supabase PostgreSQL Database
      |
      +----> SendGrid Email API
      |
Admin (browser) <---- Supabase (real-time bookings)
```

### What "full-stack" means in this project

The term full-stack means the same codebase handles both what users see (the frontend) and the server logic (the backend). In Next.js, both live in the same project:

- `app/page.tsx`, `app/booking/page.tsx`, `app/track/[id]/page.tsx` - what customers see
- `app/api/**` - the server-side logic that talks to the database
- `app/admin/**` - what the business owner sees and uses

These are not separate projects. One `npm run dev` starts all of them.

### Request lifecycle

When a customer opens your website, here is exactly what happens:

```
1. Browser sends GET https://yoursite.com/
2. Vercel routes the request to Next.js
3. Next.js runs app/page.tsx on the server
4. app/page.tsx calls getServices() in lib/db.ts
5. lib/db.ts sends a query to Supabase PostgreSQL
6. Supabase returns rows from the services table
7. Next.js renders the full HTML with that data
8. Browser receives complete HTML (not a blank loading page)
9. React "hydrates" the page (attaches event listeners)
```

This is called Server-Side Rendering (SSR). It is faster than a traditional React SPA (Single Page App) because the browser gets real content immediately instead of a blank page that then fetches data.

---

## 2. Technology Stack Explained

### Next.js 14 (App Router)

Next.js is a framework built on top of React. It adds routing, server-side rendering, API routes, and build optimization.

The "App Router" (the `app/` directory) is Next.js 14's routing system. Each folder inside `app/` becomes a URL route. A file called `page.tsx` inside that folder is what renders at that URL.

Examples:
- `app/page.tsx` renders at `/`
- `app/booking/page.tsx` renders at `/booking`
- `app/admin/dashboard/page.tsx` renders at `/admin/dashboard`
- `app/api/bookings/route.ts` handles HTTP requests to `/api/bookings`

Folders with `[brackets]` are dynamic routes:
- `app/track/[id]/page.tsx` renders at `/track/anything` where `anything` is passed in as `params.id`

### TypeScript

TypeScript is JavaScript with types. A type is a description of what shape a variable must have.

Without TypeScript:
```javascript
function createBooking(data) {
  // data could be anything. If you forget a field, you only find out at runtime.
}
```

With TypeScript:
```typescript
function createBooking(data: BookingCreateInput): Promise<Booking> {
  // TypeScript knows exactly what fields data must have.
  // If you forget customer_email, it shows an error before you run the code.
}
```

Every type in this project is defined in `types/index.ts` and imported wherever it is needed.

### Supabase (PostgreSQL)

Supabase is a hosted database service. Under the hood it runs PostgreSQL, which is one of the most widely used relational databases in the world.

A relational database stores data in tables (like spreadsheets). Tables have rows (records) and columns (fields). Tables can be connected to each other using foreign keys.

In this project:
- `bookings` table holds every appointment request
- `users` table holds admin login credentials
- `services` table drives the Services page content
- `testimonials` table holds customer reviews
- `gallery` table holds before/after photo metadata

The `@supabase/supabase-js` library provides JavaScript functions to query these tables without writing raw SQL strings.

### NextAuth.js

NextAuth handles everything related to login sessions:
- Shows the login form
- Verifies the password against the database
- Creates an encrypted session cookie (JWT)
- Reads the cookie on every request to know who is logged in
- Handles sign-out and session expiry

You do not write login logic yourself. You configure NextAuth (in `lib/auth.ts`) and it handles the rest.

### Zod

Zod is a schema validation library. You describe the shape of valid data as a Zod schema, then call `.safeParse()` with the actual data. It returns either a success with the validated data, or a failure with detailed error messages per field.

```typescript
const schema = z.object({
  customer_email: z.string().email()
});

const result = schema.safeParse({ customer_email: "not-an-email" });
// result.success === false
// result.error.flatten().fieldErrors.customer_email === ["Invalid email"]
```

---

## 3. Complete File Dependency Map

This map shows every file and what it imports (outgoing arrows) and what imports it (incoming arrows). Understanding this prevents confusion about where logic lives.

```
types/index.ts
  IMPORTED BY: lib/db.ts, lib/email.ts, lib/validation.ts,
               all API routes, all components, all pages

lib/security.ts
  IMPORTS:     crypto (Node.js built-in)
  IMPORTED BY: lib/validation.ts, app/api/bookings/route.ts

lib/validation.ts
  IMPORTS:     zod, lib/security.ts
  IMPORTED BY: app/api/bookings/route.ts,
               app/api/bookings/[id]/route.ts,
               components/BookingForm.tsx

lib/db.ts
  IMPORTS:     @supabase/supabase-js, types/index.ts
  IMPORTED BY: app/api/bookings/route.ts,
               app/api/bookings/[id]/route.ts,
               app/api/stats/route.ts,
               app/track/[id]/page.tsx,
               app/page.tsx,
               app/api/auth/[...nextauth]/route.ts

lib/email.ts
  IMPORTS:     @sendgrid/mail, types/index.ts
  IMPORTED BY: app/api/bookings/route.ts,
               app/api/bookings/[id]/route.ts

lib/auth.ts
  IMPORTS:     next-auth, next-auth/providers/credentials,
               bcryptjs, lib/db.ts
  IMPORTED BY: app/api/auth/[...nextauth]/route.ts,
               app/api/bookings/route.ts,
               app/api/bookings/[id]/route.ts,
               app/api/stats/route.ts,
               app/admin/layout.tsx

app/api/auth/[...nextauth]/route.ts
  IMPORTS:     next-auth, lib/auth.ts
  CALLED BY:   browser (login form POST), any getServerSession() call

app/api/bookings/route.ts
  IMPORTS:     next/server, next-auth/next, lib/auth.ts,
               lib/db.ts, lib/email.ts, lib/security.ts, lib/validation.ts
  CALLED BY:   components/BookingForm.tsx (POST),
               app/admin/dashboard/page.tsx (GET)

app/api/bookings/[id]/route.ts
  IMPORTS:     next/server, next-auth/next, lib/auth.ts,
               lib/db.ts, lib/email.ts, lib/validation.ts
  CALLED BY:   components/AdminBookingCard.tsx (PATCH)
               components/TrackingWidget.tsx (GET with token)

app/api/stats/route.ts
  IMPORTS:     next/server, next-auth/next, lib/auth.ts, lib/db.ts
  CALLED BY:   app/admin/dashboard/page.tsx (GET)

components/ServiceCard.tsx
  IMPORTS:     next/link, types/index.ts
  IMPORTED BY: app/page.tsx

components/BookingForm.tsx
  IMPORTS:     react, next/navigation, lib/validation.ts, types/index.ts
  IMPORTED BY: app/booking/page.tsx

components/AdminBookingCard.tsx
  IMPORTS:     react, types/index.ts
  IMPORTED BY: app/admin/dashboard/page.tsx

components/TrackingWidget.tsx
  IMPORTS:     react, types/index.ts
  IMPORTED BY: app/track/[id]/page.tsx

app/layout.tsx
  IMPORTS:     ./globals.css
  WRAPS:       every page in the app (Next.js automatic)

app/page.tsx
  IMPORTS:     next/link, lib/db.ts, components/ServiceCard.tsx
  ROUTE:       /

app/booking/page.tsx
  IMPORTS:     next (Metadata), components/BookingForm.tsx
  ROUTE:       /booking

app/track/[id]/page.tsx
  IMPORTS:     next (Metadata, notFound), lib/db.ts,
               components/TrackingWidget.tsx
  ROUTE:       /track/[id]

app/admin/layout.tsx
  IMPORTS:     next-auth/next, next/navigation, lib/auth.ts, next/link
  WRAPS:       every /admin/* page

app/admin/dashboard/page.tsx
  IMPORTS:     react, components/AdminBookingCard.tsx, types/index.ts
  ROUTE:       /admin/dashboard

supabase/schema.sql
  USED BY:     Supabase SQL Editor (run once to create tables)
  NOT IMPORTED BY JAVASCRIPT - it is plain SQL
```

---

## 4. Database Schema Deep Dive

The database is the source of truth for everything. Every booking, every admin action, every testimonial lives here. Understanding the tables and why each column exists is essential for debugging.

### Table: bookings

This is the most important table. One row = one appointment request.

```sql
id                 UUID        -- Unique identifier. UUID prevents ID guessing.
customer_name      TEXT        -- Full name from the booking form.
customer_email     TEXT        -- Used for all automated emails.
customer_phone     TEXT        -- Admin contacts customer via this.
customer_address   TEXT        -- Where the job is performed.
customer_zip       TEXT        -- Validated against the service area zip code list.
service_type       ENUM        -- One of: handyman, landscaping, power-washing, painting.
preferred_date     DATE        -- The date the customer wants.
preferred_time     TEXT        -- The time slot they selected.
description        TEXT        -- Optional notes from the customer.
status             ENUM        -- The booking's current state (see status flow below).
notes              TEXT        -- Admin's private notes. Not shown to customer.
confirmation_date  TIMESTAMPTZ -- Stamped when admin clicks Confirm.
completion_date    TIMESTAMPTZ -- Stamped when admin clicks Mark Complete.
eta                TEXT        -- Set when admin clicks On My Way. e.g., "25 minutes".
technician_name    TEXT        -- Set when en-route, shown on tracking page.
reminder_sent      BOOLEAN     -- TRUE after the 24h reminder email is sent.
review_requested   BOOLEAN     -- TRUE after the post-job review email is sent.
tracking_token     TEXT UNIQUE -- The 64-char random hex string in the tracking URL.
created_at         TIMESTAMPTZ -- When the customer submitted the form.
updated_at         TIMESTAMPTZ -- Updated automatically by a trigger on any change.
```

#### Status flow

```
pending
  When: Customer submits booking form
  Emails: Customer gets confirmation, admin gets notification

confirmed
  When: Admin clicks Confirm
  Emails: Customer gets "appointment confirmed"

in-progress
  When: Admin clicks Start Job (optional status)

en-route
  When: Admin clicks "On My Way" and enters ETA
  Emails: Customer gets "on the way" with ETA

arrived
  When: Admin clicks "I Arrived"
  Emails: none by default

completed
  When: Admin clicks "Mark as Complete"
  Emails: Customer gets thank-you + review request

declined
  When: Admin clicks Decline
  Emails: Customer gets polite decline message
```

### Table: users

Stores admin login credentials. In practice there will be exactly one row.

```sql
id          UUID    -- Unique identifier
email       TEXT    -- Login email. Must be unique. Stored in lowercase.
password    TEXT    -- bcrypt hash. 60 characters. Never plain text.
name        TEXT    -- Admin's name (shown in dashboard nav)
phone       TEXT    -- Optional. Business phone number.
created_at  TIMESTAMPTZ
updated_at  TIMESTAMPTZ
```

**Critical note on passwords:** The password column never stores the actual password. It stores a bcrypt hash that looks like `$2b$12$XXXXXXXXXX...`. Even if someone dumps the entire database, they cannot recover the password from this string without brute-forcing it, which would take years for a strong password.

### Table: services

Drives both the Services page and the service dropdown in the booking form. Admin can update these from the dashboard.

```sql
id                  UUID     -- Primary key
slug                TEXT     -- URL-safe identifier e.g. 'power-washing'
name                TEXT     -- Display name e.g. 'Power Washing'
description         TEXT     -- One paragraph describing the service
price_min           INTEGER  -- Low end of the price range in dollars
price_max           INTEGER  -- High end of the price range in dollars
price_label         TEXT     -- Override text e.g. 'Call for quote'
estimated_duration  TEXT     -- e.g. '2 to 4 hours'
image_url           TEXT     -- URL to the service photo
display_order       INTEGER  -- Lower number = shown first on the page
active              BOOLEAN  -- FALSE to hide a service without deleting it
```

### Table: gallery

Before/after photo pairs. Photos are stored in Supabase Storage (a file hosting service included with Supabase). This table stores the URLs and metadata.

```sql
id           UUID
service_type ENUM        -- Links the photo to a service category
label        TEXT        -- Short description e.g. 'Front yard remodel'
before_url   TEXT        -- URL of the before photo in Supabase Storage
after_url    TEXT        -- URL of the after photo in Supabase Storage
active       BOOLEAN     -- FALSE to hide from gallery without deleting
created_at   TIMESTAMPTZ
```

### Table: testimonials

Customer reviews. Require admin approval before they appear on the landing page.

```sql
id             UUID
customer_name  TEXT
customer_email TEXT
service_type   ENUM
rating         SMALLINT  -- 1 to 5. Enforced by a CHECK constraint.
review_text    TEXT
approved       BOOLEAN   -- FALSE = in review queue. TRUE = shown on site.
booking_id     UUID      -- Foreign key to bookings table (optional link)
created_at     TIMESTAMPTZ
```

### Table: audit_logs

Every admin action is recorded here. If something unexpected happens (a booking was wrongly declined, a status changed at a strange time), you can look at this table to understand what happened and when.

```sql
id         UUID
admin_id   UUID      -- Which admin performed the action (foreign key to users)
action     TEXT      -- e.g. 'confirmed_booking', 'declined_booking', 'deleted_booking'
target_id  UUID      -- The booking or resource that was acted on
details    JSONB     -- Arbitrary extra context stored as JSON
ip_address TEXT      -- The admin's IP address at time of action
created_at TIMESTAMPTZ
```

### Indexes

Indexes are database structures that make certain queries faster. Without them, every query scans every row in the table.

```sql
-- idx_bookings_status: speeds up "show me all pending bookings"
CREATE INDEX ON bookings (status);

-- idx_bookings_date: speeds up "show me bookings for tomorrow"
CREATE INDEX ON bookings (preferred_date);

-- idx_bookings_tracking: speeds up tracking page lookups by token
CREATE INDEX ON bookings (tracking_token);
```

---

## 5. File-by-File Code Breakdown

### `types/index.ts`

**Role:** Defines every TypeScript type used across the entire project.

**Why it exists:** Without centralized types, the same shape would be re-defined in multiple files. When the database schema changes (e.g., a column is added to `bookings`), you update one file instead of ten.

**Key types and what they describe:**

- `Booking` - mirrors a row from the `bookings` table exactly. Used wherever booking data is passed around.
- `BookingStatus` - the string union type listing every valid status value.
- `ServiceType` - the string union for the four service categories.
- `Service`, `Testimonial`, `GalleryItem`, `AuditLog`, `AdminUser` - mirror their respective tables.
- `BookingCreateInput` - describes what comes IN from the customer's form. Does not include `id`, `tracking_token`, or timestamps because those are generated server-side.
- `BookingUpdateInput` - describes what an admin sends when updating a booking. All fields optional because a PATCH only sends changed fields.
- `AdminStats` - shape of the summary data returned by `/api/stats`.
- `ApiResponse<T>` - generic envelope type used in every API response.

---

### `lib/security.ts`

**Role:** All pure security utilities. No network calls, no database access.

**Why it exists:** Security logic is used in multiple places (API routes, validation). Centralizing it prevents duplication and makes it testable.

**Functions:**

`generateTrackingToken()`
- Creates a 64-character hex string using Node.js's `crypto.randomBytes(32)`.
- This is a cryptographically secure random number generator (CSPRNG). It is not like `Math.random()`, which is predictable.
- 32 bytes = 256 bits of entropy. There are 2^256 possible tokens. Guessing one is impossible.
- Used in: `app/api/bookings/route.ts` when creating a new booking.

`checkRateLimit(key, maxRequests, windowMs)`
- Maintains a Map in server memory tracking request counts per key (usually an IP address).
- If a key exceeds `maxRequests` within `windowMs` milliseconds, returns `{ allowed: false, retryAfterSeconds }`.
- Protects the booking API from spam and the login route from brute-force attempts.
- Note: In serverless environments (Vercel), each function invocation may have its own memory. For production high-traffic sites, use Redis instead.

`isZipInServiceArea(zip)`
- Checks the provided 5-digit zip code against a hardcoded Set of valid service-area zips.
- A Set is used instead of an Array because `Set.has()` is O(1) lookup time vs O(n) for Array.
- Used by: `lib/validation.ts` inside the `zipSchema` refine check.

`isAllowedOrigin(origin)` and `getCorsHeaders(origin)`
- Used to enforce that API requests can only come from the known domain.
- Prevents other websites from making requests to your API (Cross-Site Request Forgery protection).

`sanitizeString(value)`
- Strips HTML tags from user-provided strings using a regex.
- Prevents stored XSS attacks where someone could inject `<script>` tags into a description field that later renders as HTML.

---

### `lib/validation.ts`

**Role:** Defines Zod schemas for validating all incoming data.

**Why it exists:** The same schema is shared between the server (API route) and client (BookingForm component). This guarantees they validate identically.

**Schemas:**

`BookingCreateSchema`
- Validates the complete booking form submission.
- Uses `z.transform()` to normalize data (trim whitespace, lowercase email, strip non-digits from phone).
- The `customer_zip` field uses `.refine(isZipInServiceArea)` to reject bookings outside the service area.
- The `preferred_date` field uses `.refine()` to ensure the date is not in the past.
- `preferred_time` uses `z.enum()` with the exact list of valid time slots.

`BookingUpdateSchema`
- All fields are `.optional()` because a PATCH request only sends changed fields.
- The `status` field uses `z.enum()` with all valid `BookingStatus` values.

`TestimonialCreateSchema`
- Validates customer review submissions.
- `rating` uses `.int().min(1).max(5)` to enforce valid star counts.

---

### `lib/db.ts`

**Role:** The only file that communicates with the Supabase database. All SQL queries are defined here.

**Why centralized:** If a column is renamed, one file changes. If a query needs optimization, it is in one place. If the database provider changes from Supabase to something else, only this file needs to be rewritten.

**Client initialization:**
The Supabase client is created once using a singleton pattern. The `getSupabase()` function returns the existing instance if it exists, or creates a new one if not. This avoids creating a new database connection on every function call.

The `SUPABASE_SERVICE_KEY` is used (not the anon key) because all these queries run on the server and need elevated permissions. The service key bypasses Supabase's Row-Level Security (RLS) policies.

**Functions:**

`createBooking(input, token)`
- Inserts a new row into `bookings` with `.insert()`.
- `.select().single()` is chained so Supabase returns the full inserted row (including the generated UUID), not just a success confirmation.
- Called by: `POST /api/bookings`

`getBookings(status?)`
- Fetches all bookings ordered by `preferred_date` ascending.
- The optional `status` parameter adds a `.eq('status', status)` filter.
- The conditional filter is written as an `if` block so that `undefined` is never passed to `.eq()`, which would return unexpected results.
- Called by: `GET /api/bookings`

`getBookingById(id)`
- Fetches one booking by UUID.
- Returns `null` if not found (handles `PGRST116` which is Supabase's "no rows returned" error code).
- Called by: `PATCH /api/bookings/[id]`

`getBookingByToken(token)`
- Fetches one booking by `tracking_token`.
- This is the function that powers the customer tracking page.
- The token, not the ID, is the lookup key because customers should not be able to access a booking they did not create.
- Called by: `app/track/[id]/page.tsx`

`updateBooking(id, update)`
- Partially updates a booking using `.update(update)`.
- Only the fields included in `update` are changed. Other fields are untouched.
- Called by: `PATCH /api/bookings/[id]`

`getBookingsNeedingReminders()`
- Finds all `confirmed` bookings with `preferred_date` equal to tomorrow and `reminder_sent = false`.
- Used by the 24-hour reminder cron job.
- The date comparison calculates tomorrow using JavaScript's `Date` object and formats it as `YYYY-MM-DD`.

`getAdminStats()`
- Runs several in-memory aggregations over the month's bookings.
- Fetches all bookings created since the first of the current month in one query, then filters and counts in JavaScript.
- Returns counts for total, confirmed, completed, most popular service, average response time, and a rough revenue estimate.
- Called by: `GET /api/stats`

`getUserByEmail(email)`
- Used by NextAuth during the login process.
- Returns the full user row including the password hash for bcrypt comparison.
- The password hash is never sent to the browser.

`logAuditEvent(adminId, action, targetId?, details?, ip?)`
- Inserts a row into `audit_logs`.
- Errors are caught and logged to the console instead of thrown, because audit logging should never crash the main request.

---

### `lib/email.ts`

**Role:** All email sending logic. Defines templates and uses the SendGrid SDK to deliver them.

**Why centralized:** Email templates are in one place. Changing the brand name or redesigning an email is a one-file change.

**How SendGrid works:**
1. `sgMail.setApiKey()` is called once at module load time with the API key from `process.env`.
2. Each `sendXxxEmail()` function calls `sgMail.send({ to, from, subject, html })`.
3. SendGrid receives the request and delivers the email through its infrastructure.
4. Free tier: 100 emails/day forever. More than enough for a small business.

**`baseEmailWrapper(body)`**
Takes any HTML and wraps it in a consistent branded shell (header, footer, fonts, colors). All emails share this wrapper.

**`buildTrackingUrl(booking)`**
Constructs the full URL for the tracking page:
`https://yoursite.com/track/{bookingId}?token={trackingToken}`

**Email functions and when they fire:**

| Function | Trigger | Recipient |
|---|---|---|
| `sendBookingConfirmation` | Customer submits form | Customer |
| `sendAdminNotification` | Customer submits form | Admin |
| `sendConfirmedEmail` | Admin clicks Confirm | Customer |
| `sendDeclineEmail` | Admin clicks Decline | Customer |
| `sendReminderEmail` | Cron job, 24h before | Customer |
| `sendEnRouteEmail` | Admin clicks On My Way | Customer |
| `sendCompletionEmail` | Admin clicks Complete | Customer |

---

### `lib/auth.ts`

**Role:** NextAuth configuration and password hashing utility.

**`authOptions`**
The configuration object passed to `NextAuth()`. Key settings:

- `session.strategy: 'jwt'` - Session data is stored in a signed cookie, not a database. No `sessions` table needed.
- `session.maxAge: 1800` - 30 minutes (1800 seconds). Session expires if inactive.
- `pages.signIn: '/admin/login'` - Uses our custom login page instead of NextAuth's default.
- `providers: [CredentialsProvider]` - Only email/password login. No OAuth.

**The `authorize` function inside CredentialsProvider:**
1. Receives `{ email, password }` from the login form.
2. Calls `getUserByEmail(email)` to load the admin's stored password hash.
3. Calls `bcrypt.compare(plainPassword, hash)` to verify without decrypting the hash.
4. Returns the user object on success, or `null` on failure.
5. NextAuth converts a returned user object into a JWT cookie.

**The `jwt` and `session` callbacks:**
- `jwt` runs when the token is created or read. We add `user.id` to the token payload.
- `session` runs when `getServerSession()` is called. We expose `token.id` as `session.user.id` so API routes can log audit events with the admin's ID.

**`hashPassword(plain)`**
- Calls `bcrypt.hash(plain, 12)` with 12 salt rounds.
- Used only when creating the initial admin account (run once, then discard the plain password).
- 12 rounds means each hash computation takes ~250ms. This is intentionally slow to make brute-force attacks expensive.

---

### `app/api/auth/[...nextauth]/route.ts`

**Role:** The HTTP endpoint for all NextAuth operations.

The `[...nextauth]` folder name is a Next.js "catch-all route". It matches any path under `/api/auth/`. NextAuth uses multiple sub-routes internally (`/callback/credentials`, `/session`, `/csrf`, etc.). This single file handles all of them.

All this file does is pass `authOptions` to `NextAuth()` and export the resulting handler for both GET and POST HTTP methods. All the actual logic is in `lib/auth.ts`.

---

### `app/api/bookings/route.ts`

**Role:** Handles creating bookings (POST) and listing them for the admin (GET).

**GET handler:**
1. Verifies admin session with `getServerSession(authOptions)`.
2. Reads optional `?status=` query parameter.
3. Calls `getBookings(status)` from `lib/db.ts`.
4. Returns the array as JSON.

**POST handler - complete flow:**

```
Request arrives
      |
      v
checkRateLimit('booking:{ip}', 5, 15min)
      | blocked? -> 429 Too Many Requests
      v
request.json() -> parse body
      |
      v
BookingCreateSchema.safeParse(body)
      | invalid? -> 422 with field errors
      v
generateTrackingToken()
      |
      v
createBooking(validatedData, token) -> saved to DB
      |
      v
Promise.allSettled([
  sendBookingConfirmation(booking),  -> customer email
  sendAdminNotification(booking)     -> admin email
])
      |
      v
Return { id, trackingToken } -> 201 Created
```

**Why `Promise.allSettled` instead of `Promise.all`?**
`Promise.all` fails if ANY promise rejects. If one email fails, the customer would get a 500 error even though their booking was saved successfully. `Promise.allSettled` runs both and returns results for each, whether they succeeded or failed. The booking was saved regardless.

---

### `app/api/bookings/[id]/route.ts`

**Role:** Updates a single booking (PATCH) or deletes it (DELETE).

**PATCH handler - complete flow:**

```
Admin clicks a button in AdminBookingCard
      |
      v
PATCH /api/bookings/{bookingId}
  body: { status: "confirmed" }
      |
      v
getServerSession() -> verify admin
      |
      v
BookingUpdateSchema.safeParse(body)
      |
      v
getBookingById(id) -> load current booking
      |
      v
Add confirmation_date or completion_date if needed
      |
      v
updateBooking(id, dbUpdate) -> save to DB
      |
      v
If status changed:
  switch(newStatus):
    'confirmed' -> sendConfirmedEmail
    'declined'  -> sendDeclineEmail
    'en-route'  -> sendEnRouteEmail
    'completed' -> sendCompletionEmail
      |
      v
logAuditEvent(adminId, action, bookingId, details)
      |
      v
Return updated booking
```

---

### `app/api/stats/route.ts`

**Role:** Returns aggregated metrics for the admin dashboard's stat cards.

Calls `getAdminStats()` from `lib/db.ts`, which runs multiple database queries and returns a summary object. Protected by admin session check.

---

### `components/BookingForm.tsx`

**Role:** The customer booking form. A `"use client"` component.

**State management:**
- `form` - object holding all field values. Updated by `handleChange`.
- `fieldErrors` - object mapping field names to error arrays. Set by Zod or the server.
- `serverError` - a single top-level error string for non-field errors.
- `isSubmitting` - boolean that disables the submit button during the API call.

**`handleChange(e)`**
A single change handler for all inputs. Uses `e.target.name` (which matches the key in the `form` object) to know which field to update. Clears that field's error as the user types.

**`handleSubmit(e)`**
1. `e.preventDefault()` - stops the browser from reloading the page.
2. Runs `BookingCreateSchema.safeParse(form)` for instant client-side validation.
3. If invalid, sets field errors and returns early without making a network request.
4. If valid, POSTs the validated data to `/api/bookings`.
5. On `422`: parses and displays field-level errors from the server.
6. On `429`: displays the rate limit message.
7. On success: redirects to `/track/{id}?token={trackingToken}` using `router.push`.

**Controlled inputs:**
Every `<input>` has `value={form.fieldName}` and `onChange={handleChange}`. This makes React the single source of truth for the input's value (a "controlled component"). Without this, the input would have its own internal state that React does not control, making validation harder.

---

### `components/AdminBookingCard.tsx`

**Role:** Displays one booking with action buttons in the admin dashboard.

**Local state:**
- `isUpdating` - disables buttons while an API call is in flight (prevents double-clicks).
- `notes` and `eta` - locally controlled text inputs for the admin.
- `showNotes` - toggles the notes textarea.
- `error` - shows a message if the API call fails.

**`updateStatus(payload)`**
The generic API caller. Sends a PATCH to `/api/bookings/{booking.id}` and calls `onUpdate` with the fresh data on success.

**Button visibility logic:**
Buttons are conditionally rendered based on `booking.status`. A pending booking shows Confirm and Decline. A confirmed booking shows an ETA input and On My Way. An en-route booking shows Arrived. An arrived booking shows Mark Complete. This prevents the admin from accidentally taking out-of-order actions.

---

### `components/TrackingWidget.tsx`

**Role:** Customer-facing live status tracker. Polls for updates.

**Polling logic (`useEffect`):**
The `useEffect` hook runs after the component mounts in the browser. It sets up a `setInterval` that calls `fetch('/api/bookings/{id}?token={token}')` every 30 seconds.

When the booking reaches a terminal status (`completed` or `declined`), `clearInterval` is called inside the interval callback to stop polling. The same `clearInterval` is called in the cleanup function returned from `useEffect`, which runs when the component unmounts (user navigates away).

**Status step display:**
The `STATUS_STEPS` array defines the visual progress bar order. The component finds the current booking's status in this array to know how many steps to shade green.

**`initialBooking` prop:**
This comes from the server (the `page.tsx` that renders this component). The server fetches the booking before sending any HTML, so the customer sees the real status immediately without a loading spinner.

---

### `app/admin/layout.tsx`

**Role:** Security wrapper for all admin pages.

Calls `getServerSession(authOptions)` before rendering anything. If the session is null (not logged in), calls `redirect('/admin/login')`. This redirect happens on the server, before any HTML reaches the browser. The admin UI is never exposed to unauthenticated users.

---

### `app/admin/dashboard/page.tsx`

**Role:** The main admin control center.

**Data fetching on mount (`useEffect`):**
Fetches both bookings and stats simultaneously using `Promise.all` when the component mounts.

**Tab filtering:**
`filteredBookings` is computed from `bookings` state by filtering on which statuses belong to the active tab:
- Pending tab: `["pending"]`
- Upcoming tab: `["confirmed", "in-progress", "en-route", "arrived"]`
- Completed tab: `["completed", "declined"]`

**`handleBookingUpdate(updated)`:**
This is passed as the `onUpdate` prop to every `AdminBookingCard`. When a card calls it, the dashboard updates the booking in its local `bookings` state array using `.map()`, replacing the old version with the new one. This is called an "optimistic update" pattern - the UI updates immediately without a full page reload.

---

## 6. Security Layers Explained

Security in this project is built in layers. Each layer catches a different kind of attack. A motivated attacker who bypasses one layer hits the next.

### Layer 1: HTTPS

All traffic between browser and server is encrypted by TLS (what the "S" in HTTPS means). Vercel provides this free automatically. Without HTTPS, anyone on the same WiFi network could read login credentials or booking data as it travels over the wire.

### Layer 2: Environment Variables

All secrets (database URL, database key, JWT secret, SendGrid API key) are stored in `.env.local`, which is listed in `.gitignore`. They are never written in code. They are accessed via `process.env.VARIABLE_NAME` in server-side code only. The browser never receives these values.

### Layer 3: bcrypt Password Hashing

The admin password is hashed with bcrypt before being stored. bcrypt is specifically designed for password storage. It is intentionally slow (each hash takes ~250ms with 12 rounds). An attacker who steals the database would need to run every possible password through bcrypt to find one that matches the stored hash, which would take years for a strong password.

### Layer 4: JWT Sessions (NextAuth)

After successful login, NextAuth creates a signed JWT (JSON Web Token) stored in a secure, HttpOnly cookie. HttpOnly means JavaScript cannot access it, so XSS attacks cannot steal it. The JWT is signed with `NEXTAUTH_SECRET`, so a forged token would fail signature verification. Sessions expire after 30 minutes.

### Layer 5: Rate Limiting

The booking API allows 5 requests per 15 minutes per IP. The login API (via NextAuth's built-in protection) limits login attempts. This prevents:
- Spam booking submissions
- Brute-force password attacks

### Layer 6: Input Validation (Zod)

Every piece of data coming in from a form or API body is validated with Zod before it reaches the database or email system. This catches:
- Missing required fields
- Invalid email formats
- Phone numbers that are not 10 digits
- Service types not in the valid list
- Past dates
- Zip codes outside the service area
- Descriptions that are too long (potential DOS via large payloads)

### Layer 7: Parameterized Queries (Supabase client)

SQL injection is one of the most common attack vectors. It works by injecting SQL commands into user input. For example:

```
Name: Robert'); DROP TABLE bookings; --
```

If you built a SQL string by concatenating user input, this could delete your entire database. The Supabase JavaScript client automatically parameterizes all values, which means user input is never interpreted as SQL.

```typescript
// The Supabase client escapes this automatically
await db.from('bookings').select('*').eq('email', userInput);
// This is equivalent to: SELECT * FROM bookings WHERE email = $1
// with userInput bound as a parameter, not embedded in the SQL string
```

### Layer 8: Tracking Token Validation

Customers can only view tracking pages for bookings they own. The tracking URL contains a 64-character random hex token generated at booking creation. The `getBookingByToken()` function looks up by token, not by ID. Without the correct token, the booking cannot be retrieved.

### Layer 9: Admin Session on Every API Route

Every admin API route calls `getServerSession(authOptions)` as its first step. If the session is invalid or missing, the response is `401 Unauthorized` and the function returns before any data is read or written.

### Layer 10: Audit Logging

Every admin action (confirm, decline, status change, delete) is recorded in the `audit_logs` table with the admin's ID, a timestamp, the affected booking, and the IP address. This creates an accountability trail for investigating unexpected changes.

### Layer 11: Security HTTP Headers (next.config.js)

The following headers are set on every response:
- `X-Frame-Options: DENY` - prevents your site from being loaded in an iframe (clickjacking protection)
- `X-Content-Type-Options: nosniff` - prevents browsers from guessing content types
- `Referrer-Policy: strict-origin-when-cross-origin` - controls Referer header leakage
- `Permissions-Policy` - restricts access to camera, microphone, and geolocation APIs

---

## 7. Email System Explained

All emails are sent through SendGrid. Here is the complete flow for each email type.

### How SendGrid works

1. You sign up for a free SendGrid account and create an API key.
2. You verify a sender email address (this is the `From:` address in all emails).
3. Your server calls `sgMail.send({ to, from, subject, html })`.
4. SendGrid receives the request over HTTPS and delivers the email through its infrastructure.
5. Free tier is 100 emails per day indefinitely.

### Email trigger map

```
POST /api/bookings (customer submits form)
  -> sendBookingConfirmation(booking)  to: customer
  -> sendAdminNotification(booking)    to: admin

PATCH /api/bookings/[id] { status: 'confirmed' }
  -> sendConfirmedEmail(booking)       to: customer

PATCH /api/bookings/[id] { status: 'declined' }
  -> sendDeclineEmail(booking)         to: customer

PATCH /api/bookings/[id] { status: 'en-route' }
  -> sendEnRouteEmail(booking)         to: customer

PATCH /api/bookings/[id] { status: 'completed' }
  -> sendCompletionEmail(booking)      to: customer

Cron job (runs daily)
  -> sendReminderEmail(booking)        to: customer
     for each booking where:
       preferred_date = tomorrow AND
       status = 'confirmed' AND
       reminder_sent = false
```

### The 24-hour reminder cron job

The reminder is not built into the API routes because it needs to run on a schedule, not on a user request. There are two approaches:

**Option A: Vercel Cron Jobs (recommended)**
Create a file `app/api/cron/reminders/route.ts` and configure it in `vercel.json` to run daily. The route calls `getBookingsNeedingReminders()`, sends each one a reminder email, then calls `markReminderSent()` to prevent duplicates.

**Option B: External service**
Use a free service like EasyCron.com to call your API route at a scheduled time.

---

## 8. Data Flow Walkthroughs

### Walk 1: Customer books an appointment

```
1. Customer visits /booking
   Next.js serves app/booking/page.tsx
   BookingForm component renders in browser

2. Customer fills in the form and clicks Submit
   handleSubmit() runs in BookingForm.tsx
   BookingCreateSchema.safeParse(formData) validates client-side

3. POST /api/bookings with JSON body
   Body: { customer_name, customer_email, ..., service_type, preferred_date, preferred_time }

4. Server receives request
   checkRateLimit(ip, 5, 15min) -> allowed
   request.json() -> parse body
   BookingCreateSchema.safeParse(body) -> valid
   generateTrackingToken() -> 64-char hex string

5. createBooking(data, token) in lib/db.ts
   Supabase INSERT into bookings table
   Returns full row including generated UUID

6. Promise.allSettled([...]) fires both emails
   sendBookingConfirmation -> customer inbox
   sendAdminNotification -> admin inbox

7. Response: { success: true, data: { id, trackingToken } }

8. BookingForm calls router.push('/track/{id}?token={token}')

9. Browser navigates to /track/{id}?token={token}
   Next.js runs app/track/[id]/page.tsx on server
   getBookingByToken(token) -> fetch booking
   Render TrackingWidget with booking data

10. TrackingWidget starts polling every 30 seconds
```

### Walk 2: Admin confirms a booking

```
1. Admin logs in at /admin/login
   NextAuth receives credentials
   authorize() in lib/auth.ts:
     getUserByEmail(email) -> load user row
     bcrypt.compare(password, hash) -> match
   NextAuth creates JWT cookie
   Redirect to /admin/dashboard

2. Dashboard loads
   useEffect fires on mount
   Promise.all([GET /api/bookings, GET /api/stats])
   State set: bookings = [...], stats = {...}
   AdminBookingCard rendered for each booking

3. Admin sees pending booking, clicks Confirm
   handleConfirm() in AdminBookingCard
   updateStatus({ status: 'confirmed' })
   PATCH /api/bookings/{bookingId}
   Body: { status: 'confirmed' }

4. Server receives PATCH
   getServerSession() -> valid session, adminId = '...'
   BookingUpdateSchema.safeParse -> valid
   getBookingById(id) -> current booking
   Build dbUpdate: { status: 'confirmed', confirmation_date: now }
   updateBooking(id, dbUpdate) -> save to DB
   status changed to 'confirmed': sendConfirmedEmail(booking)
   logAuditEvent(adminId, 'status_changed_to_confirmed', bookingId)
   Return updated booking

5. AdminBookingCard receives response
   onUpdate(updatedBooking) called
   Dashboard's handleBookingUpdate() runs
   setBookings replaces old booking with updated one
   Card moves from Pending tab to Upcoming tab
```

---

## 9. SQL Queries Reference

These are the key queries you will work with. Understanding them is essential for debugging and for building the analytics dashboard.

### Get all pending bookings

```sql
SELECT
  id,
  customer_name,
  customer_phone,
  service_type,
  preferred_date,
  preferred_time,
  customer_address
FROM bookings
WHERE status = 'pending'
ORDER BY preferred_date ASC;
```

### Count completed jobs this month, broken down by service type

```sql
SELECT
  service_type,
  COUNT(*) AS job_count
FROM bookings
WHERE
  status = 'completed'
  AND completion_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND completion_date <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY service_type
ORDER BY job_count DESC;
```

`DATE_TRUNC('month', CURRENT_DATE)` returns the first day of the current month (e.g., `2024-06-01`). This is how you write "since the start of this month" in SQL without hardcoding a date.

### Find all bookings for tomorrow that need a reminder

```sql
SELECT *
FROM bookings
WHERE
  preferred_date = CURRENT_DATE + INTERVAL '1 day'
  AND status = 'confirmed'
  AND reminder_sent = FALSE;
```

### Average response time (minutes from created_at to confirmation_date)

```sql
SELECT
  ROUND(
    AVG(
      EXTRACT(EPOCH FROM (confirmation_date - created_at)) / 60
    )
  ) AS avg_minutes
FROM bookings
WHERE
  status IN ('confirmed', 'completed')
  AND confirmation_date IS NOT NULL;
```

`EXTRACT(EPOCH FROM interval)` converts a time interval to seconds. Dividing by 60 gives minutes.

### Get customer booking history (most recent first)

```sql
SELECT
  id,
  service_type,
  preferred_date,
  preferred_time,
  status,
  created_at
FROM bookings
WHERE customer_email = 'customer@example.com'
ORDER BY preferred_date DESC;
```

### Get admin audit log for the last 7 days

```sql
SELECT
  al.action,
  al.created_at,
  al.details,
  al.ip_address,
  u.name AS admin_name
FROM audit_logs al
JOIN users u ON al.admin_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;
```

`JOIN users u ON al.admin_id = u.id` links the `audit_logs` table to the `users` table so you can see the admin's name alongside each action.

### Archive old completed bookings (older than 1 year)

```sql
-- First, create an archive table with the same structure
CREATE TABLE IF NOT EXISTS bookings_archive AS
  SELECT * FROM bookings WHERE 1 = 0;

-- Copy old records to archive
INSERT INTO bookings_archive
SELECT * FROM bookings
WHERE status IN ('completed', 'declined')
  AND completion_date < NOW() - INTERVAL '1 year';

-- Delete from main table after archiving
DELETE FROM bookings
WHERE status IN ('completed', 'declined')
  AND completion_date < NOW() - INTERVAL '1 year';
```

---

## 10. Build Phases and Checklist

### Phase 1: Foundation (Weeks 1 and 2)

Goal: A working booking form that saves to the database and sends emails.

- [ ] Create Supabase project and run `supabase/schema.sql`
- [ ] Create `.env.local` from `.env.example` and fill in all values
- [ ] Run `npm install` to install dependencies
- [ ] Create the admin user account in the database (see README.md for the seed script)
- [ ] Verify `npm run dev` starts without errors
- [ ] Test `GET /api/bookings` returns 401 (unauthorized, confirming auth works)
- [ ] Test the booking form submits and a row appears in Supabase
- [ ] Verify confirmation email arrives in the customer's inbox
- [ ] Verify admin notification email arrives in the admin's inbox
- [ ] Test Zod validation by submitting an invalid zip code

### Phase 2: Admin Dashboard (Week 3)

Goal: Admin can log in and manage bookings.

- [ ] Verify login redirects correctly to `/admin/dashboard`
- [ ] Verify wrong password shows an error, not a crash
- [ ] Verify bookings appear in the dashboard in the correct tabs
- [ ] Test Confirm button - verify customer receives confirmation email
- [ ] Test Decline button - verify customer receives decline email
- [ ] Test On My Way button with ETA - verify customer tracking page updates
- [ ] Test Mark Complete - verify customer receives thank-you email
- [ ] Verify audit log table has a row for each admin action

### Phase 3: Tracking Page (Week 3)

Goal: Customers can track their appointment live.

- [ ] Visit the tracking URL from the confirmation email
- [ ] Verify the correct booking data displays
- [ ] Verify a wrong token returns a 404 (not someone else's booking)
- [ ] Change booking status in admin, verify tracking page updates within 30 seconds
- [ ] Verify polling stops after status reaches completed

### Phase 4: Security Hardening (Week 4)

Goal: The site is resistant to common attacks.

- [ ] Try submitting the booking form 6 times quickly - verify 429 response on the 6th
- [ ] Try loading an admin page without being logged in - verify redirect to login
- [ ] Try loading the tracking page without a token - verify 404
- [ ] Try loading the tracking page with a valid token but wrong ID - verify 404
- [ ] Verify `.env.local` is in `.gitignore` and NOT tracked by git (`git status` should not show it)
- [ ] Review all API routes and confirm every admin route has `getServerSession()` at the top

### Phase 5: Polish and Launch (Week 5)

Goal: The site looks professional and is ready for real customers.

- [ ] Add real service photos to the `gallery` table in Supabase
- [ ] Customize service descriptions in the `services` table
- [ ] Update the service area zip codes in `lib/security.ts`
- [ ] Set `ADMIN_EMAIL` in environment variables to the real business email
- [ ] Verify the site is responsive on a real mobile device
- [ ] Run `npm run build` and verify no TypeScript errors
- [ ] Deploy to Vercel and set all environment variables in the Vercel dashboard
- [ ] Test the full booking flow on the production URL
- [ ] Set up the 24-hour reminder cron job

---

## 11. Future-Ready Architecture

The following features are intentionally left out of the MVP but the data structure supports them without schema changes.

### SMS Notifications (Twilio)

The `customer_phone` field is already stored. Adding Twilio requires:
1. `npm install twilio`
2. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` to `.env.local`
3. Call `twilioClient.messages.create()` in `lib/email.ts` alongside each `sgMail.send()` call

### Stripe Payment Processing

The booking form would add a payment step after submission. The booking would remain in `pending` status until payment is confirmed. Stripe webhooks would then update the booking status to `confirmed` automatically.

### Google Calendar Sync

When a booking is confirmed, the Google Calendar API can create an event in the admin's calendar. The booking's ID, address, and customer phone would all appear in the calendar event.

### Customer Portal

The `customer_email` field is already indexed. A customer portal would let returning customers log in (using their email as the identifier) and see all their past and upcoming bookings.

### Recurring Bookings

A `recurring_bookings` table can reference a `bookings` row as a template and store `frequency`, `start_date`, `end_date`, and `day_of_week`. A cron job would create new bookings automatically based on the schedule.

### Analytics Dashboard

The `audit_logs` and `bookings` tables contain all the data needed for a full business analytics view: revenue over time, busiest days, most requested services, average job duration, customer retention rate.
