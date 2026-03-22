// =============================================================================
// lib/security.ts
//
// Pure security utilities. Every function here either validates, sanitizes,
// generates random values, or enforces rate limits.
//
// WHO IMPORTS THIS FILE:
//   lib/validation.ts                  -- uses validateZip for service area check
//   app/api/bookings/route.ts          -- uses generateTrackingToken, checkRateLimit
//   app/api/auth/[...nextauth]/route.ts -- uses checkRateLimit
//
// THIS FILE IMPORTS:
//   crypto (Node.js built-in)          -- for generating secure random tokens
// =============================================================================

import crypto from "crypto";


// =============================================================================
// TOKEN GENERATION
// =============================================================================

/**
 * generateTrackingToken
 * Creates a cryptographically secure random string used as a booking's
 * tracking token. This is included in the customer's confirmation email
 * link: /track/[bookingId]?token=<this value>
 *
 * crypto.randomBytes(32) generates 32 random bytes.
 * .toString('hex') converts them to a 64-character hexadecimal string.
 *
 * WHY 32 BYTES?
 * There are 2^256 possible tokens. Guessing one is computationally impossible.
 * This ensures customers cannot view other customers' tracking pages.
 */
export function generateTrackingToken(): string {
  return crypto.randomBytes(32).toString("hex");
}


// =============================================================================
// RATE LIMITING
// =============================================================================

// In-memory store: maps a key (IP address or email) to { count, resetAt }
// This is a simple solution for a low-traffic site. For high traffic you would
// use Redis instead. On serverless/Vercel, each function invocation has its own
// memory, so this is approximate but still effective against bursts.

interface RateLimitRecord {
  count:   number;
  resetAt: number; // Unix timestamp in ms when the window resets
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * checkRateLimit
 * Enforces a maximum number of requests per time window for a given key.
 * Returns { allowed: true } if the request can proceed.
 * Returns { allowed: false, retryAfterSeconds } if the limit is exceeded.
 *
 * @param key          - Identifier to rate-limit on (e.g. IP address, email)
 * @param maxRequests  - Maximum requests allowed in the window (default: 10)
 * @param windowMs     - Length of the time window in ms (default: 15 minutes)
 *
 * EXAMPLE: checkRateLimit("192.168.1.1", 5, 15 * 60 * 1000)
 * Allows 5 requests per 15 minutes from that IP.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs:    number = 15 * 60 * 1000
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Window has expired or this is the first request: start fresh
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  // Within window: increment counter
  record.count += 1;

  if (record.count > maxRequests) {
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}


// =============================================================================
// SERVICE AREA VALIDATION
// =============================================================================

// The zip codes where the business operates.
// Update this array to match the real service area.
// A customer submitting a zip code not in this list will get a rejection message
// on the booking form before the data even reaches the database.
const SERVICE_ZIP_CODES = new Set([
  "33410", "33411", "33412", "33413", "33414",
  "33415", "33418", "33458", "33477", "33496",
]);

/**
 * isZipInServiceArea
 * Returns true if the provided zip code is within the business service area.
 * Called by: lib/validation.ts
 *
 * @param zip  - The zip code string entered by the customer
 */
export function isZipInServiceArea(zip: string): boolean {
  return SERVICE_ZIP_CODES.has(zip.trim());
}


// =============================================================================
// CORS HELPERS
// =============================================================================

// Allowed origins for API requests. In development, localhost is allowed.
// In production, only the real domain should be in this list.
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  process.env.NEXT_PUBLIC_SITE_URL ?? "",
]);

/**
 * isAllowedOrigin
 * Returns true if the request's Origin header matches an allowed domain.
 * Used in API routes to reject cross-origin requests from unknown domains.
 *
 * @param origin  - Value of the request's Origin header
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.has(origin);
}

/**
 * getCorsHeaders
 * Returns a set of HTTP headers that allow the request from an allowed origin.
 * Returned headers are spread into the Response in each API route.
 *
 * @param origin  - Value of the request's Origin header
 */
export function getCorsHeaders(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":  origin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}


// =============================================================================
// INPUT SANITIZATION
// =============================================================================

/**
 * sanitizeString
 * Strips leading/trailing whitespace and removes HTML tags.
 * Prevents stored XSS attacks where a malicious user could inject
 * <script> tags into fields that are later rendered in the admin dashboard.
 *
 * @param value  - Raw string from user input
 */
export function sanitizeString(value: string): string {
  return value.trim().replace(/<[^>]*>/g, "");
}
