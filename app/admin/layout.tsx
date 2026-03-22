// =============================================================================
// app/admin/layout.tsx
//
// The ADMIN LAYOUT. Wraps every page under /admin/*.
// Next.js automatically applies this layout to:
//   /admin/dashboard
//   /admin/login
//   Any future /admin/* routes
//
// WHAT THIS LAYOUT DOES:
//   Acts as a security guard for all admin pages.
//   Checks for a valid NextAuth session on the server before rendering any page.
//   If no session, redirects immediately to /admin/login.
//   If session is valid, renders the admin nav + page content.
//
// WHY GUARD IN THE LAYOUT INSTEAD OF EACH PAGE?
//   Centralized: one file protects all admin routes automatically.
//   If a new admin page is added, it is protected without any extra work.
//   Server-side redirect: happens before any HTML is sent to the browser,
//   so unauthenticated users never even see a flash of the admin UI.
//
// THIS FILE IMPORTS:
//   next-auth/next                 -- getServerSession
//   next/navigation                -- redirect
//   lib/auth.ts                    -- authOptions
// =============================================================================

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get session for displaying user info in the nav.
  // Auth protection is handled by middleware.ts - no redirect loop here.
  const session = await getServerSession(authOptions);

  // If no session (i.e. on the login page), just render children with no nav.
  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Admin navigation bar */}
      <nav className="bg-brand-dark text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-display font-bold text-lg">Admin Dashboard</span>
          <Link href="/admin/dashboard" className="text-brand-light hover:text-white text-sm transition-colors">
            Bookings
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-brand-light text-sm">{session.user?.name}</span>
          <a
            href="/api/auth/signout"
            className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign Out
          </a>
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>

    </div>
  );
}
