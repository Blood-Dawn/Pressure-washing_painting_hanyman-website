// =============================================================================
// lib/email.ts
//
// All email sending logic lives here. No API route or component sends emails
// directly. They call the functions in this file.
//
// WHY ONE FILE FOR EMAILS?
//   Email templates are in one place. If the business name changes or you
//   want to redesign an email, you update it here, not across 5 API routes.
//
// HOW EMAILS WORK:
//   1. An API route (e.g. POST /api/bookings) calls a function here.
//   2. The function builds an HTML email using the booking data.
//   3. It sends the email via SendGrid's API using the @sendgrid/mail package.
//   4. SendGrid delivers it to the customer or admin's inbox.
//
// WHO IMPORTS THIS FILE:
//   app/api/bookings/route.ts          -- sendBookingConfirmation, sendAdminNotification
//   app/api/bookings/[id]/route.ts     -- sendStatusUpdate, sendDeclineEmail
//   (cron job)                         -- sendReminderEmail
//
// THIS FILE IMPORTS:
//   @sendgrid/mail                     -- SendGrid Node.js SDK
//   types/index.ts                     -- Booking type
// =============================================================================

import sgMail from "@sendgrid/mail";
import type { Booking } from "@/types";

// Initialize SendGrid with the API key from the environment.
// This must run before any email is sent. It is safe to call multiple times.
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// The sender address shown in all emails. Must be verified in SendGrid.
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL!;
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL!;


// =============================================================================
// SHARED HELPERS
// =============================================================================

/**
 * buildTrackingUrl
 * Constructs the full public URL a customer uses to track their appointment.
 * The token is appended as a query parameter so they cannot guess it.
 *
 * @param booking  - The booking row from the database
 * @returns          e.g. https://yoursite.com/track/abc123?token=def456
 */
function buildTrackingUrl(booking: Booking): string {
  return `${SITE_URL}/track/${booking.id}?token=${booking.tracking_token}`;
}

/**
 * baseEmailWrapper
 * Wraps any HTML body in a consistent branded outer shell.
 * Every email shares this header/footer so they all look consistent.
 *
 * @param body  - The HTML content unique to this email type
 */
function baseEmailWrapper(body: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        body    { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
        .card   { background: #fff; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .header { background: #2d6a4f; color: #fff; padding: 24px 32px; }
        .header h1 { margin: 0; font-size: 22px; }
        .body   { padding: 32px; color: #333; line-height: 1.6; }
        .detail { background: #f8f9f0; border-radius: 6px; padding: 16px 20px; margin: 20px 0; }
        .detail p { margin: 6px 0; font-size: 15px; }
        .btn    { display: inline-block; background: #2d6a4f; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; margin-top: 16px; }
        .footer { padding: 20px 32px; font-size: 13px; color: #999; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header"><h1>Your Handyman &amp; Landscaping Service</h1></div>
        <div class="body">${body}</div>
        <div class="footer">This email was sent automatically. Please do not reply to this email.</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * formatDate
 * Converts an ISO date string like "2024-06-15" to "June 15, 2024".
 */
function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}


// =============================================================================
// CUSTOMER EMAILS
// =============================================================================

/**
 * sendBookingConfirmation
 * Sent IMMEDIATELY when a customer submits a booking form.
 * Tells them the request came through and we will follow up.
 * Includes the tracking link so they can check status at any time.
 *
 * @param booking  - The newly created booking row
 */
export async function sendBookingConfirmation(booking: Booking): Promise<void> {
  const trackingUrl = buildTrackingUrl(booking);

  const html = baseEmailWrapper(`
    <h2>We received your request, ${booking.customer_name}.</h2>
    <p>We will review your booking and confirm within 24 hours.</p>
    <div class="detail">
      <p><strong>Service:</strong> ${booking.service_type}</p>
      <p><strong>Date:</strong> ${formatDate(booking.preferred_date)}</p>
      <p><strong>Time:</strong> ${booking.preferred_time}</p>
      <p><strong>Address:</strong> ${booking.customer_address}</p>
    </div>
    <p>You can check the status of your appointment any time using the link below.</p>
    <a class="btn" href="${trackingUrl}">Track My Appointment</a>
  `);

  await sgMail.send({
    to:      booking.customer_email,
    from:    FROM_EMAIL,
    subject: `We received your ${booking.service_type} request`,
    html,
  });
}

/**
 * sendConfirmedEmail
 * Sent when the admin clicks Confirm in the dashboard.
 * Tells the customer the appointment is locked in.
 *
 * @param booking  - The booking row after status was updated to 'confirmed'
 */
export async function sendConfirmedEmail(booking: Booking): Promise<void> {
  const trackingUrl = buildTrackingUrl(booking);

  const html = baseEmailWrapper(`
    <h2>Your appointment is confirmed.</h2>
    <p>Hi ${booking.customer_name}, we have confirmed your appointment. See you then.</p>
    <div class="detail">
      <p><strong>Service:</strong> ${booking.service_type}</p>
      <p><strong>Date:</strong> ${formatDate(booking.preferred_date)}</p>
      <p><strong>Time:</strong> ${booking.preferred_time}</p>
      <p><strong>Address:</strong> ${booking.customer_address}</p>
    </div>
    <a class="btn" href="${trackingUrl}">View Appointment Status</a>
  `);

  await sgMail.send({
    to:      booking.customer_email,
    from:    FROM_EMAIL,
    subject: `Confirmed: ${booking.service_type} on ${formatDate(booking.preferred_date)}`,
    html,
  });
}

/**
 * sendDeclineEmail
 * Sent when the admin clicks Decline.
 * Informs the customer politely that the slot is unavailable.
 *
 * @param booking  - The booking row after status was updated to 'declined'
 */
export async function sendDeclineEmail(booking: Booking): Promise<void> {
  const html = baseEmailWrapper(`
    <h2>We are unable to accommodate your request.</h2>
    <p>Hi ${booking.customer_name}, unfortunately we are not available for the date and time you requested.</p>
    <p>Please submit a new request with a different date or time and we will do our best to fit you in.</p>
    ${booking.notes ? `<div class="detail"><p><strong>Note from us:</strong> ${booking.notes}</p></div>` : ""}
    <a class="btn" href="${SITE_URL}/booking">Book a New Appointment</a>
  `);

  await sgMail.send({
    to:      booking.customer_email,
    from:    FROM_EMAIL,
    subject: `Update on your ${booking.service_type} request`,
    html,
  });
}

/**
 * sendReminderEmail
 * Sent 24 hours before the appointment.
 * Triggered by a cron job that checks the database each morning.
 *
 * @param booking  - The booking row for tomorrow's appointment
 */
export async function sendReminderEmail(booking: Booking): Promise<void> {
  const trackingUrl = buildTrackingUrl(booking);

  const html = baseEmailWrapper(`
    <h2>Reminder: Your appointment is tomorrow.</h2>
    <p>Hi ${booking.customer_name}, this is a reminder about your scheduled appointment.</p>
    <div class="detail">
      <p><strong>Service:</strong> ${booking.service_type}</p>
      <p><strong>Date:</strong> ${formatDate(booking.preferred_date)}</p>
      <p><strong>Time:</strong> ${booking.preferred_time}</p>
      <p><strong>Address:</strong> ${booking.customer_address}</p>
    </div>
    <p>You will receive an update when the technician is on the way.</p>
    <a class="btn" href="${trackingUrl}">View Appointment Status</a>
  `);

  await sgMail.send({
    to:      booking.customer_email,
    from:    FROM_EMAIL,
    subject: `Reminder: ${booking.service_type} tomorrow at ${booking.preferred_time}`,
    html,
  });
}

/**
 * sendEnRouteEmail
 * Sent when the admin marks a job as 'en-route'.
 * Tells the customer the technician is on the way with an ETA.
 *
 * @param booking  - The booking row after status was updated to 'en-route'
 */
export async function sendEnRouteEmail(booking: Booking): Promise<void> {
  const trackingUrl = buildTrackingUrl(booking);

  const html = baseEmailWrapper(`
    <h2>Your technician is on the way.</h2>
    <p>Hi ${booking.customer_name}, your technician is heading to you now.</p>
    <div class="detail">
      ${booking.eta ? `<p><strong>Estimated Arrival:</strong> ${booking.eta}</p>` : ""}
      ${booking.technician_name ? `<p><strong>Technician:</strong> ${booking.technician_name}</p>` : ""}
      <p><strong>Address:</strong> ${booking.customer_address}</p>
    </div>
    <a class="btn" href="${trackingUrl}">Track Live Status</a>
  `);

  await sgMail.send({
    to:      booking.customer_email,
    from:    FROM_EMAIL,
    subject: `Your technician is on the way${booking.eta ? ` (ETA: ${booking.eta})` : ""}`,
    html,
  });
}

/**
 * sendCompletionEmail
 * Sent when the admin marks a job as 'completed'.
 * Thanks the customer and asks them to leave a review.
 *
 * @param booking  - The booking row after status was updated to 'completed'
 */
export async function sendCompletionEmail(booking: Booking): Promise<void> {
  const reviewUrl = `${SITE_URL}/review?booking=${booking.id}&token=${booking.tracking_token}`;

  const html = baseEmailWrapper(`
    <h2>Your job is complete. Thank you for your business.</h2>
    <p>Hi ${booking.customer_name}, the ${booking.service_type} job has been completed. We hope everything looks great.</p>
    <p>If you have a moment, we would appreciate a short review. It helps us a lot.</p>
    <a class="btn" href="${reviewUrl}">Leave a Review</a>
    <p style="margin-top: 24px; color: #666; font-size: 14px;">If you have any concerns about the work, please reach out directly and we will make it right.</p>
  `);

  await sgMail.send({
    to:      booking.customer_email,
    from:    FROM_EMAIL,
    subject: `Job complete: ${booking.service_type} on ${formatDate(booking.preferred_date)}`,
    html,
  });
}


// =============================================================================
// ADMIN EMAILS
// =============================================================================

/**
 * sendAdminNotification
 * Sent to the business owner whenever a new booking comes in.
 * Includes all customer details and a direct link to the booking in the dashboard.
 *
 * @param booking    - The newly created booking row
 * @param adminEmail - The admin's email address (from environment variable)
 */
export async function sendAdminNotification(
  booking: Booking,
  adminEmail: string
): Promise<void> {
  const dashboardUrl = `${SITE_URL}/admin/dashboard`;

  const html = baseEmailWrapper(`
    <h2>New ${booking.service_type} booking request.</h2>
    <div class="detail">
      <p><strong>Customer:</strong> ${booking.customer_name}</p>
      <p><strong>Phone:</strong> ${booking.customer_phone}</p>
      <p><strong>Email:</strong> ${booking.customer_email}</p>
      <p><strong>Address:</strong> ${booking.customer_address}</p>
      <p><strong>Service:</strong> ${booking.service_type}</p>
      <p><strong>Date:</strong> ${formatDate(booking.preferred_date)}</p>
      <p><strong>Time:</strong> ${booking.preferred_time}</p>
      ${booking.description ? `<p><strong>Notes from customer:</strong> ${booking.description}</p>` : ""}
    </div>
    <a class="btn" href="${dashboardUrl}">Open Dashboard to Confirm</a>
  `);

  await sgMail.send({
    to:      adminEmail,
    from:    FROM_EMAIL,
    subject: `New booking: ${booking.service_type} from ${booking.customer_name}`,
    html,
  });
}
