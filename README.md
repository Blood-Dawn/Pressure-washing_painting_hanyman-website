# Marc's Pro Services - Pressure Washing, Painting & Handyman Website

A full-stack Next.js web application for a pressure washing, exterior painting, roof washing, and handyman business. Customers can book appointments or request a free quote online, track their appointment status in real time, and receive automated emails at every step. The business owner gets a password-protected admin dashboard to manage bookings and update job statuses.

---

## What This Site Does

- **Instant booking** - customers book and pay directly for standard-priced jobs (pressure washing a standard or extended driveway)
- **Free quote requests** - customers request an on-site visit for larger or custom jobs (roof washing, exterior painting, handyman work)
- **Real-time tracking** - customers get a live status page with a map when the technician is on the way
- **Admin dashboard** - Marc views, confirms, declines, and updates every booking from one screen
- **Automated emails** - confirmation, reminder, status change, and completion emails sent via SendGrid

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Framework | Next.js (App Router) | Server rendering, routing, and API routes in one project |
| Language | TypeScript | Type safety catches errors before runtime |
| Database | Supabase (PostgreSQL) | Free tier, managed, full SQL support |
| Auth | NextAuth.js | Secure session management without building it yourself |
| Email | SendGrid | Free for 100 emails/day |
| Styling | Tailwind CSS | Utility-first, no separate CSS files needed |
| Validation | Zod | Schema validation shared between server and client |
| Hosting | Vercel | Free tier, deploys automatically from GitHub |

---

## Services

| Service | Type | Notes |
|---|---|---|
| Pressure Washing - Standard Driveway | Instant Book | $150 flat |
| Pressure Washing - Extended Driveway | Instant Book | $200 flat (+$50 for walkways) |
| Pressure Washing + Exterior Painting | Free Quote | On-site assessment required |
| Roof Washing | Free Quote | On-site assessment required |
| Handyman | Free Quote | On-site assessment required |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx                        Root layout (wraps every page)
│   ├── globals.css                       Tailwind imports and global styles
│   ├── page.tsx                          Landing page (/)
│   ├── booking/
│   │   └── page.tsx                      Booking form with optional mock payment (/booking)
│   ├── quote/
│   │   └── page.tsx                      Free quote request form (/quote)
│   ├── track/[id]/
│   │   └── page.tsx                      Customer tracking page (/track/[id])
│   ├── admin/
│   │   ├── layout.tsx                    Admin auth guard (wraps all /admin/* pages)
│   │   └── dashboard/
│   │       └── page.tsx                  Admin dashboard (/admin/dashboard)
│   └── api/
│       ├── auth/[...nextauth]/
│       │   └── route.ts                  NextAuth login/session endpoint
│       ├── bookings/
│       │   ├── route.ts                  GET (list) / POST (create) bookings
│       │   └── [id]/
│       │       ├── route.ts              GET (tracking) / PATCH (update) / DELETE a booking
│       │       └── location/
│       │           └── route.ts          PATCH technician GPS location
│       └── stats/
│           └── route.ts                  GET admin stats
├── components/
│   ├── SiteNav.tsx                       Top navigation bar (sticky, social icons, CTAs)
│   ├── BookingForm.tsx                   Customer booking form with two-step payment (client)
│   ├── QuoteForm.tsx                     Free quote request form (client)
│   ├── AdminBookingCard.tsx              Single booking card with action buttons
│   ├── TrackingWidget.tsx                Live-updating tracking display with map
│   ├── LiveMap.tsx                       Leaflet map loaded via CDN (browser-only)
│   └── ServiceCard.tsx                   Service display card for landing page
├── lib/
│   ├── auth.ts                           NextAuth config + password hashing
│   ├── db.ts                             All database queries (Supabase)
│   ├── email.ts                          All email templates and sending (SendGrid)
│   ├── security.ts                       Rate limiting, token generation, sanitization
│   └── validation.ts                     Zod schemas for all input validation
├── types/
│   └── index.ts                          All TypeScript types for the project
├── supabase/
│   └── schema.sql                        Database table definitions (run once in Supabase SQL editor)
├── .env.example                          Template for environment variables (safe to commit)
├── .gitignore                            Files excluded from git
├── next.config.js                        Next.js configuration
├── tailwind.config.js                    Tailwind theme and brand color tokens
├── tsconfig.json                         TypeScript configuration
├── ROADMAP.md                            Full architecture and code documentation
└── README.md                             This file
```

---

## Prerequisites

Before you start, make sure the following are installed on your machine:

- **Node.js 18 or higher** - download from https://nodejs.org
- **Git** - download from https://git-scm.com
- **A Supabase account** - free at https://supabase.com
- **A SendGrid account** - free at https://sendgrid.com
- **A Vercel account** - free at https://vercel.com (for deployment)

---

## Local Development Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 2: Install dependencies

```bash
npm install
```

This reads `package.json` and installs everything into `node_modules/`.

### Step 3: Set up Supabase

1. Go to https://supabase.com and create a free project.
2. Once the project is ready, go to **Settings -> API**.
3. Copy the **Project URL** and both API keys (anon and service_role).
4. Go to **SQL Editor -> New Query**.
5. Open `supabase/schema.sql` from this project, paste the entire contents, and click **Run**.
   This creates all tables, indexes, triggers, and seed data.

### Step 4: Set up SendGrid

1. Go to https://sendgrid.com and create a free account.
2. Go to **Settings -> API Keys** and create a new API key with full access.
3. Go to **Settings -> Sender Authentication** and verify a sender email address.
   This is the address that will appear in the From field of all emails.

### Step 5: Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in every value:

```
NEXT_PUBLIC_SUPABASE_URL=     Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= Your Supabase anon key
SUPABASE_SERVICE_KEY=          Your Supabase service role key
NEXTAUTH_SECRET=               Run: openssl rand -base64 32
NEXTAUTH_URL=                  http://localhost:3000
SENDGRID_API_KEY=              Your SendGrid API key
SENDGRID_FROM_EMAIL=           The verified sender email in SendGrid
ADMIN_EMAIL=                   Where admin notification emails go
NEXT_PUBLIC_SITE_URL=          http://localhost:3000
```

**Do not commit `.env.local`.** It is already in `.gitignore`.

### Step 6: Create the admin account

Run this script once to create the admin user in the database. Replace the values with real credentials.

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function createAdmin() {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const hash = await bcrypt.hash('YOUR_STRONG_PASSWORD_HERE', 12);
  const { data, error } = await db.from('users').insert({
    email: 'your-email@example.com',
    password: hash,
    name: 'Your Name'
  }).select().single();
  if (error) console.error(error);
  else console.log('Admin created:', data.email);
}
createAdmin();
"
```

After running this, delete the script from your shell history. Never save the plain password anywhere.

### Step 7: Start the development server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

- Landing page: http://localhost:3000
- Book an appointment: http://localhost:3000/booking
- Free quote request: http://localhost:3000/quote
- Admin login: http://localhost:3000/admin/login

---

## Deploying to Vercel

### Step 1: Connect the repository

1. Go to https://vercel.com and sign in.
2. Click **Add New Project**.
3. Import your GitHub repository.
4. Vercel detects it is a Next.js project automatically.

### Step 2: Add environment variables

In the Vercel project settings, go to **Environment Variables** and add every variable from your `.env.local`. For `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL`, use the full Vercel URL (e.g., `https://your-project.vercel.app`).

### Step 3: Deploy

Click **Deploy**. Vercel builds and deploys the project. Every time you push to the `main` branch on GitHub, Vercel will redeploy automatically.

---

## Supabase: Add New Service Types

After updating the service types in code, you must also update the Postgres enum in Supabase. Run this in the SQL Editor:

```sql
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'pressure-washing';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'pressure-washing-painting';
ALTER TYPE service_type ADD VALUE IF NOT EXISTS 'roof-washing';
```

---

## Key Commands

```bash
npm run dev          Start local development server (http://localhost:3000)
npm run build        Build production bundle (TypeScript errors will surface here)
npm run start        Start the production server locally (after build)
npm run lint         Run ESLint to check for code issues
```

---

## Pending Before Launch

- [ ] Add Marc's real TikTok, Facebook, and Instagram URLs to `components/SiteNav.tsx` (search for `SOCIAL_LINKS`)
- [ ] Finalize business name (currently "Marc's Pro Services" placeholder)
- [ ] Add logo: save file to `/public/logo.png`, then update the logo block in `SiteNav.tsx` (instructions are in a comment in that file)
- [ ] Set roof washing price once Marc decides it, then add it to `BookingForm.tsx`
- [ ] Run the Supabase SQL migration above to add new service_type enum values
- [ ] Replace mock payment with a real payment provider (Stripe recommended) before going live
- [ ] Set the GitHub repo to Private until ready to launch

---

## Security Notes

- Never commit `.env.local`. It is in `.gitignore` for a reason.
- The `SUPABASE_SERVICE_KEY` has full database access. It is only used in server-side code (`lib/db.ts`). It is never sent to the browser.
- The admin password in the database is a bcrypt hash, not the real password. Never store the real password anywhere after hashing it.
- All admin API routes check `getServerSession()` before doing anything. If the session is missing or expired, they return `401 Unauthorized`.
- Rotate `NEXTAUTH_SECRET` if you suspect it has been compromised. Rotating it invalidates all active sessions and everyone will need to log in again.

---

## Common Issues

**`npm run dev` fails with missing environment variable errors**
Make sure `.env.local` exists and all values are filled in. Check for typos in variable names.

**Booking form submits but no email arrives**
Verify the `SENDGRID_FROM_EMAIL` is verified in your SendGrid account. Check the SendGrid Activity Feed to see if the send attempt was logged.

**Admin login redirects in a loop**
Verify `NEXTAUTH_URL` in `.env.local` matches the URL you are accessing in the browser (including the port number).

**Database queries return empty arrays**
Verify `SUPABASE_SERVICE_KEY` is the service_role key (not the anon key). The service key has full access. Also verify the schema.sql was run and the tables exist in the Supabase dashboard.
