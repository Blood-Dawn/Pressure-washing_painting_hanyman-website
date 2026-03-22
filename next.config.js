/** @type {import('next').NextConfig} */

// next.config.js
// This file configures how Next.js builds and serves your application.
// It runs on the SERVER only, never in the browser.
// Changes here require restarting the dev server.

const nextConfig = {
  // ── Images ───────────────────────────────────────────────────────────────
  // Next.js has a built-in image optimizer (<Image /> component).
  // For it to be allowed to fetch and resize images hosted on external CDNs
  // (like Supabase storage), we must whitelist their hostname here.
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",    // Supabase storage bucket URLs
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // ── Security Headers ─────────────────────────────────────────────────────
  // These HTTP response headers are sent with every page and API response.
  // They tell browsers how to handle your content securely.
  async headers() {
    return [
      {
        source: "/(.*)",     // Apply to every route
        headers: [
          // Prevent clickjacking: your site can't be loaded inside an <iframe>
          { key: "X-Frame-Options", value: "DENY" },
          // Disable browser MIME-type sniffing (helps prevent XSS)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control what info is sent in the Referer header
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict which browser features this site can use
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
